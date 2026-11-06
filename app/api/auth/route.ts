import {database,digest,session,sessionToken,newSession,makeAccountWorld} from '../../../lib/store';
import {uid} from '../../../lib/world';
export const dynamic='force-dynamic';
type User={id:string;email:string;password_hash:string;salt:string;world_id:string;person_id:string};
function response(body:unknown,status=200,cookie?:string){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});}
async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),{name:'PBKDF2'},false,['deriveBits']);const hash=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:100000},key,256);return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');}
function equal(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
export async function GET(req:Request){try{const s=await session(req);const user=await database().prepare('SELECT id,email FROM aivow_users WHERE id=?').bind(s.user_id).first<{id:string;email:string}>();return response({user});}catch{return response({user:null});}}
export async function POST(req:Request){try{
 const origin=req.headers.get('origin');if(origin&&new URL(origin).host!==new URL(req.url).host)return response({error:'Invalid request origin'},403);
 const b=await req.json() as {op?:string;email?:string;password?:string};
 if(b.op==='logout'){const token=sessionToken(req);if(token)await database().prepare('DELETE FROM aivow_sessions WHERE hash=?').bind(await digest(token)).run();return response({user:null},200,'aivow_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');}
 const email=typeof b.email==='string'?b.email.trim().toLowerCase().slice(0,254):'',password=typeof b.password==='string'?b.password:'';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return response({error:'Enter a valid email address'},400);
 if(password.length<8||password.length>128)return response({error:'Use 8–128 characters for your password'},400);
 let user=await database().prepare('SELECT * FROM aivow_users WHERE email=?').bind(email).first<User>();
 if(b.op==='register'){
  if(user)return response({error:'This email already has an account'},409);
  const salt=uid(),hash=await passwordHash(password,salt),id=uid(),world=await makeAccountWorld();
  try{await database().prepare('INSERT INTO aivow_users(id,email,password_hash,salt,world_id,person_id,created_at) VALUES(?,?,?,?,?,?,?)').bind(id,email,hash,salt,world.world_id,world.person_id,Date.now()).run();}catch{return response({error:'This email already has an account'},409);}
  user={id,email,password_hash:hash,salt,...world};
 }else if(b.op==='login'){
  // A dummy hash keeps unknown accounts on the same password-check path.
  const candidate=await passwordHash(password,user?.salt||'aivow-no-account');
  if(!user||!equal(candidate,user.password_hash))return response({error:'Email or password is incorrect'},401);
 }else return response({error:'Unknown action'},400);
 const s=await newSession(req,user);return response({user:{id:user.id,email:user.email}},200,s.cookie);
 }catch{return response({error:'Unable to sign in. Please try again.'},503);}}
