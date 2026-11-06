import {env} from 'cloudflare:workers';
import {session,loadWorld,mutate} from '../../../lib/store';
import {operateDream,visibleDreams} from '../../../lib/dream';
import {beginRun,summarize} from '../../../lib/dream-runner';
import {controlEM} from '../../../lib/em-control';
import {AiError,safeError} from '../../../lib/ai';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request){try{const s=await session(req);return json({dreams:visibleDreams((await loadWorld(s.world_id)).world,s.person_id)});}catch{return json({error:'Sign in required'},401);}}
export async function POST(req:Request){try{const origin=req.headers.get('origin');if(origin&&new URL(origin).host!==new URL(req.url).host)return json({error:'Invalid request origin'},403);const s=await session(req),b=await req.json() as Record<string,unknown>;let id=typeof b.id==='string'?b.id:'';
 if(b.op==='command'){const result=await controlEM(s.world_id,s.person_id,s.user_id,b);id=result.id;if(result.run)await env.DREAM_SCHEDULER.getByName(id).schedule(s.world_id,id);else await env.DREAM_SCHEDULER.getByName(id).halt();}
 else if(b.op==='endAndRecap'){await mutate(s.world_id,w=>operateDream(w,s.person_id,{...b,op:'end'}));await env.DREAM_SCHEDULER.getByName(id).halt();await summarize(s.world_id,id,s.user_id);}
 else if(b.op==='run'){await beginRun(s.world_id,id,s.person_id,s.user_id);await env.DREAM_SCHEDULER.getByName(id).schedule(s.world_id,id);}
 else if(b.op==='recap'){const d=(await loadWorld(s.world_id)).world.dreams.find(d=>d.id===id&&(d.owner===s.person_id||d.visibility==='shared'&&d.peer===s.person_id));if(!d)throw Error('This Dream is unavailable.');await summarize(s.world_id,id,s.user_id);}
 else {const result=await mutate(s.world_id,w=>operateDream(w,s.person_id,b));if(result)id=result.id;if(['pause','withdraw','message','end','invite'].includes(String(b.op))&&id)await env.DREAM_SCHEDULER.getByName(id).halt();}
 return json({id,dreams:visibleDreams((await loadWorld(s.world_id)).world,s.person_id)});
 }catch(e){return json(safeError(e),e instanceof AiError?e.status:400);}}
