import {env} from 'cloudflare:workers';
import {database} from './store';
export class AiError extends Error{constructor(public code:string,message:string,public status=400){super(message);}}
export type AiCredential={key:string;version:number};
const vars=()=>env as unknown as Record<string,string>;
async function encryptionKey(){const secret=vars().AI_KEY_ENCRYPTION_SECRET;if(!secret)throw new AiError('AI_STORAGE_UNAVAILABLE','AI settings are temporarily unavailable. Try again later.',503);const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret));return crypto.subtle.importKey('raw',bytes,{name:'AES-GCM'},false,['encrypt','decrypt']);}
const hex=(v:Uint8Array)=>Array.from(v,x=>x.toString(16).padStart(2,'0')).join('');
const unhex=(v:string)=>Uint8Array.from(v.match(/.{2}/g)||[],x=>parseInt(x,16));
export async function aiStatus(userId:string){const row=await database().prepare('SELECT hint,version FROM aivow_ai_keys WHERE user_id=?').bind(userId).first<{hint:string;version:number}>();return {configured:!!row,hint:row?.hint||'',version:row?.version||0};}
export async function credential(userId:string):Promise<AiCredential>{const row=await database().prepare('SELECT ciphertext,iv,version FROM aivow_ai_keys WHERE user_id=?').bind(userId).first<{ciphertext:string;iv:string;version:number}>();if(!row)throw new AiError('AI_NOT_CONFIGURED','AI is not configured. Open Settings.');try{const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:unhex(row.iv)},await encryptionKey(),unhex(row.ciphertext));return {key:new TextDecoder().decode(plain),version:row.version};}catch(e){if(e instanceof AiError)throw e;throw new AiError('AI_STORAGE_UNAVAILABLE','The saved key could not be opened. Save it again in Settings.',503);}}
export async function saveKey(userId:string,key:string){if(!/^sk-[A-Za-z0-9_-]{12,200}$/.test(key))throw new AiError('AI_INVALID_KEY','Enter a valid DeepSeek API key.');const iv=crypto.getRandomValues(new Uint8Array(12));const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},await encryptionKey(),new TextEncoder().encode(key));await database().prepare('INSERT INTO aivow_ai_keys(user_id,ciphertext,iv,hint,version) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET ciphertext=excluded.ciphertext,iv=excluded.iv,hint=excluded.hint,version=excluded.version').bind(userId,hex(new Uint8Array(ciphertext)),hex(iv),'•••• '+key.slice(-4),Date.now()).run();}
export async function removeKey(userId:string){await database().prepare('DELETE FROM aivow_ai_keys WHERE user_id=?').bind(userId).run();}
export function apiError(status:number){return new AiError(status===401?'AI_AUTH_FAILED':status===402?'AI_INSUFFICIENT_BALANCE':status===429?'AI_RATE_LIMITED':'AI_UNAVAILABLE',status===401?'DeepSeek rejected this key. Update it in Settings.':status===402?'DeepSeek balance is insufficient.':status===429?'DeepSeek rate limit reached. Try again shortly.':'DeepSeek is unavailable. Try again.',status===401?401:status===429?429:503);}
export async function modelJson<T>(c:AiCredential,system:string,input:unknown):Promise<T>{
 const deadline=Date.now()+25_000;
 for(let attempt=0;attempt<2;attempt++){
  let response:Response;
  try{response=await fetch('https://api.deepseek.com/chat/completions',{
   method:'POST',headers:{Authorization:`Bearer ${c.key}`,'Content-Type':'application/json'},
   body:JSON.stringify({model:vars().DEEPSEEK_MODEL||'deepseek-flash',thinking:{type:'disabled'},max_tokens:900,response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(input)}]}),signal:AbortSignal.timeout(Math.max(1,deadline-Date.now()))
  });}catch{throw new AiError('AI_NETWORK_ERROR','Could not reach DeepSeek. Try again.',503);}
  if(!response.ok)throw apiError(response.status);
  try{
   const body=await response.json() as {choices?:{message?:{content?:string}}[]};
   const content=(body.choices?.[0]?.message?.content||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
   const result=JSON.parse(content);if(!result||typeof result!=='object'||Array.isArray(result))throw Error('Invalid JSON');return result as T;
  }catch{if(attempt===1)throw new AiError('AI_INVALID_OUTPUT','DeepSeek returned an incomplete response. Try again.',502);}
 }
 throw new AiError('AI_INVALID_OUTPUT','DeepSeek returned an incomplete response. Try again.',502);
}
export async function testKey(key:string){if(!/^sk-[A-Za-z0-9_-]{12,200}$/.test(key))throw new AiError('AI_INVALID_KEY','Enter a valid DeepSeek API key.');await modelJson({key,version:0},'Return exactly one JSON object: {"ok":true}.',{});}
export const safeError=(e:unknown)=>e instanceof AiError?{code:e.code,error:e.message}:{code:'REQUEST_FAILED',error:e instanceof Error?e.message:'Unable to complete this action.'};
