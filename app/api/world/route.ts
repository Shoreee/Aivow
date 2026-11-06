import {lifeStep,pauseLife} from '../../../lib/life';
import {env} from 'cloudflare:workers';
import type {AutoJob} from '../../../lib/conversation-types';
import {sceneReference} from '../../../lib/scene-reference';
import { session, loadWorld, mutate, join } from '../../../lib/store';
import { aiConfigured, generate } from '../../../lib/agent';
import {credential,safeError} from '../../../lib/ai';
import {disclosed,stopDream} from '../../../lib/dream';
import { settingsFrom,paceLabel } from '../../../lib/settings';
import {visibleWorld,connection,uid,startMeeting,createBranch,updateMemory,syncSettingsMemories,activity,cancelDraft,conversation,type PlaceId,type World,type Meeting,type Message} from '../../../lib/world';
export const dynamic='force-dynamic';
type Session=Awaited<ReturnType<typeof session>>;
const text=(v:unknown,max=800)=>typeof v==='string'?v.trim().slice(0,max):'';
const place=(v:unknown):PlaceId=>['park','bookshop','cafe','riverside'].includes(String(v))?v as PlaceId:'park';
function reply(data:unknown,cookie?:string|null,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});}
const getMeeting=(w:World,id:unknown,self:string)=>w.meetings.find(m=>m.id===id&&(m.a===self||m.b===self));
const nextAuthor=(m:Meeting)=>m.messages.at(-1)?.author===m.a?m.b:m.a;
const label=(p:string)=>({park:'公园',bookshop:'书店',cafe:'咖啡店',riverside:'河边'}[p]||p);
function validateGeneration(w:World,m:Meeting){
 if(m.status!=='active'||!connection(w,m.a,m.b))throw Error('这次交流已结束');
 const people=w.people.filter(p=>p.id===m.a||p.id===m.b);
 if(!people.every(p=>p.open))throw Error('EM 已暂停');
 if(m.pendingFor)throw Error('等待本人回应');
 if(m.reviewFor)throw Error('有一条回复等待确认');
 const max=Math.min(...people.map(p=>p.settings.behavior.maxTurns));let count=0;for(const msg of [...m.messages].reverse()){if(msg.source==='person')break;count++;}
 if(count>=max)throw Error('已达到本次交流上限，请本人接手');
}
async function runGeneration(s:Session,id:string,hypothetical=false){
 const snapshot=(await loadWorld(s.world_id)).world;
 const branch=hypothetical?snapshot.branches.find(x=>x.id===id&&x.owner===s.person_id):undefined;
 if(hypothetical&&!branch)throw Error('找不到这条私密支线');
 const m:Meeting|undefined=branch?.meetingId==='daily'?{id:'daily',a:s.person_id,b:s.person_id,place:snapshot.people.find(p=>p.id===s.person_id)!.place,status:'active',messages:[],createdAt:Date.now(),version:0}:getMeeting(snapshot,branch?.meetingId||id,s.person_id);
 if(!m)throw Error('找不到这次交流');
 const msgs=branch?.messages||m.messages;
 const author=snapshot.people.find(p=>p.id===(hypothetical?(msgs.at(-1)?.author===m.a?m.b:m.a):nextAuthor(m)))!;
 if(!hypothetical)validateGeneration(snapshot,m);
 const lock=uid();
 if(!hypothetical)await mutate(s.world_id,w=>{const fresh=getMeeting(w,m.id,s.person_id)!;validateGeneration(w,fresh);if(fresh.generating||fresh.version!==m.version)throw Error('EM 正在回应');fresh.generating=lock;});
 try{
  const allowed=hypothetical&&author.id===s.person_id?author.memory:disclosed(snapshot,author.id,author.id===m.a?m.b:m.a);
  const answer=await generate(author,msgs,m.place,branch?.correction,await credential(s.user_id),allowed);
  await mutate(s.world_id,w=>{
   const p=w.people.find(p=>p.id===author.id)!;
   if(hypothetical){const br=w.branches.find(x=>x.id===branch!.id&&x.owner===s.person_id)!;if(br.messages.length!==msgs.length)throw Error('支线已更新，请重试');br.messages.push({id:uid(),author:author.id,source:answer.source,text:answer.text,time:Date.now(),memoryIds:answer.memoryIds});return;}
   const fresh=getMeeting(w,m.id,s.person_id)!;
   if(fresh.generating!==lock||fresh.status!=='active'||p.revision!==author.revision||!w.people.filter(p=>p.id===m.a||p.id===m.b).every(p=>p.open)||!connection(w,m.a,m.b)){if(fresh.generating===lock)fresh.generating=undefined;return;}
   fresh.generating=undefined;fresh.version++;
   if(p.settings.behavior.review&&!p.sample&&!answer.needsOwner){
    p.draft={id:uid(),meetingId:m.id,text:answer.text,source:answer.source,memoryIds:answer.memoryIds,needsOwner:false,version:fresh.version,revision:p.revision,createdAt:Date.now()};fresh.reviewFor=p.id;activity(p,'review','回复等待确认',m.id);
   }else{
    fresh.messages.push({id:uid(),author:p.id,source:answer.source,text:answer.text,time:Date.now(),memoryIds:answer.memoryIds});activity(p,'speak',answer.text,m.id);
    if(answer.needsOwner){fresh.pendingFor=p.id;fresh.pendingQuestion=msgs.at(-1)?.text;activity(p,'wait','需要本人回应',m.id);}
   }
  });
 }catch(error){if(!hypothetical)await mutate(s.world_id,w=>{const m=getMeeting(w,id,s.person_id);if(m?.generating===lock)m.generating=undefined;});throw error;}
}
async function pilot(s:Session){
 const generationId=await mutate(s.world_id,w=>{
  const me=w.people.find(p=>p.id===s.person_id)!;
  if(!me.ready||!me.open)throw Error('请先开启 EM');
  const hour=(new Date().getUTCHours()+8)%24,period=me.settings.behavior.period;
  if((period==='day'&&(hour<8||hour>=19))||(period==='evening'&&(hour<19||hour>=24))){activity(me,'wait','不在设定活动时段');return;}
  const m=w.meetings.find(m=>m.status==='active'&&(m.a===me.id||m.b===me.id));
  if(m){
   if(m.pendingFor||m.reviewFor||m.generating)return;
   const next=w.people.find(p=>p.id===nextAuthor(m))!;
   if(next.id!==me.id&&!next.sample){activity(me,'wait','等待对方 EM 回应',m.id);return;}
   try{validateGeneration(w,m);}catch{activity(me,'wait','本次交流已达上限',m.id);return;}
   return m.id;
  }
  const destinations=me.settings.behavior.destinations;
  if(!destinations.includes(me.place)){me.place=destinations[0];me.updatedAt=Date.now();activity(me,'move',`前往${label(me.place)}`);return;}
  if(me.settings.behavior.approach==='wait'){activity(me,'wait',`在${label(me.place)}等待招呼`);return;}
  const candidates=w.people.filter(p=>p.id!==me.id&&p.open&&p.ready&&connection(w,me.id,p.id)&&p.settings.behavior.destinations.includes(me.place)&&!w.meetings.some(m=>m.status==='active'&&(m.a===p.id||m.b===p.id)));
  const real=candidates.filter(p=>!p.sample);const pool=real.length?real:candidates;const target=pool[Math.floor(Math.random()*pool.length)];
  if(target){const m=startMeeting(w,me.id,target.id,me.place);activity(me,'meet',`在${label(me.place)}遇见${target.name}`,m.id);activity(target,'meet',`在${label(me.place)}遇见${me.name}`,m.id);return;}
  if(destinations.length>1&&Date.now()-me.updatedAt>30000){me.place=destinations[(destinations.indexOf(me.place)+1)%destinations.length];me.updatedAt=Date.now();activity(me,'move',`前往${label(me.place)}`);}else activity(me,'wait','暂无可交流的连接');
 });
 if(generationId)await runGeneration(s,generationId);
}
export async function GET(req:Request){try{const s=await session(req);const {world}=await loadWorld(s.world_id);return reply({...visibleWorld(world,s.person_id),aiConfigured:await aiConfigured(s.user_id)},s.cookie);}catch{return reply({error:'Sign in required'},null,401);}}
export async function POST(req:Request){try{
 const origin=req.headers.get('origin');if(origin&&new URL(origin).host!==new URL(req.url).host)return reply({error:'请求来源不正确'},null,403);
 const s=await session(req),b=await req.json() as Record<string,unknown>,op=text(b.op,40);
 let autoJob:AutoJob|undefined,autoKeyVersion=0;
 if(op==='chat'){const before=(await loadWorld(s.world_id)).world;const target=before.people.find(p=>p.id===b.target);if(target?.sampleMode==='auto'&&connection(before,s.person_id,target.id))autoKeyVersion=(await credential(s.user_id)).version;}
 if(op==='join')await join(s,text(b.code,32));
 else if(op==='agent'||op==='branchAgent')await runGeneration(s,text(b.id,80),op==='branchAgent');
 else if(op==='pilot')await pilot(s);
 else await mutate(s.world_id,w=>{
  const me=w.people.find(p=>p.id===s.person_id)!;
  if(['profile','settings','memory','remember'].includes(op))for(const d of w.dreams.filter(d=>(d.owner===me.id||d.peer===me.id)&&['running','waiting'].includes(d.status)))stopDream(d,'paused','settingsChanged');
  if(op==='guideSeen'){me.guideVersion=1;}
  else if(op==='lifeStep'){lifeStep(me);}
  else if(op==='profile'||op==='settings'){
   if(op==='profile'){me.name=text(b.name,16)||me.name;me.avatar=Math.max(0,Math.min(5,Math.floor(Number(b.avatar)||0)));me.ready=true;}
   me.settings=settingsFrom(b.settings,me.settings);me.pace=paceLabel(me.settings.pace);me.revision++;me.updatedAt=Date.now();
   if(b.place)me.place=place(b.place);
   if(!me.settings.behavior.destinations.includes(me.place))me.place=me.settings.behavior.destinations[0];
   syncSettingsMemories(me);pauseLife(me,!me.open||!me.settings.behavior.autopilot);
   // Preserve old user-authored material when opening a previous demo session.
   if(typeof b.story==='string'&&text(b.story)){me.story=text(b.story);const old=me.memory.find(m=>m.source==='首次生活片段');if(old){old.text=me.story;old.shared=b.shareStory!==false;}else updateMemory(me,me.story,b.shareStory!==false,'首次生活片段');}
   if(me.draft){const m=getMeeting(w,me.draft.meetingId,me.id);if(m)cancelDraft(w,m);}
  }else if(op==='open'){
   if(!me.ready&&b.value)throw Error('请先设置 EM');me.open=b.value===true;if(me.open&&me.life)me.life.control=undefined;pauseLife(me,!me.open);if(me.open&&me.settings.behavior.autopilot)lifeStep(me);me.revision++;
   if(!me.open){for(const d of w.dreams.filter(d=>(d.owner===me.id||d.peer===me.id)&&['running','waiting'].includes(d.status)))stopDream(d,'paused','emPaused');me.draft=undefined;w.meetings.filter(m=>m.a===me.id||m.b===me.id).forEach(m=>{m.generating=undefined;cancelDraft(w,m);m.version++;});}
   activity(me,me.open?'move':'pause',me.open?'EM 已开启':'EM 已暂停');
  }else if(op==='move'){
   const destination=place(b.place);if(!me.settings.behavior.destinations.includes(destination))throw Error('先将该地点加入活动范围');
   for(const m of w.meetings.filter(m=>m.status==='active'&&(m.a===me.id||m.b===me.id))){m.status='ended';m.generating=undefined;cancelDraft(w,m);m.version++;}
   for(const d of w.dreams.filter(d=>d.mode==='realtime'&&d.participants.includes(me.id)&&d.status!=='ended'))stopDream(d,'paused','lifeMoved');me.place=destination;if(me.life)me.life.control=undefined;lifeStep(me);me.updatedAt=Date.now();activity(me,'move',`前往${label(destination)}`);
  }else if(op==='meet'){
   const target=text(b.target,80),m=startMeeting(w,me.id,target,me.place);const other=w.people.find(p=>p.id===target)!;activity(me,'meet',`与${other.name}开始交流`,m.id);activity(other,'meet',`与${me.name}开始交流`,m.id);
  }else if(op==='chat'){
   const target=text(b.target,80),value=text(b.text);if(!value)throw Error('消息不能为空');if(!connection(w,me.id,target))throw Error('建立连接后才可聊天');
   const m=w.meetings.find(m=>m.status==='active'&&((m.a===me.id&&m.b===target)||(m.a===target&&m.b===me.id)));
   for(const d of w.dreams.filter(d=>d.status==='running'&&((d.owner===me.id&&d.peer===target)||(d.peer===me.id&&d.owner===target))))stopDream(d,'paused','personResponded');
   const msg:Message={id:uid(),author:me.id,source:'person',text:value,time:Date.now(),sceneRef:sceneReference(w,me.id,target,b.sceneRef)};
   if(m){cancelDraft(w,m);m.generating=undefined;m.messages.push(msg);m.version++;if(m.pendingFor===me.id){m.pendingFor=undefined;m.pendingQuestion=undefined;}}else conversation(w,me.id,target).messages.push(msg);
   if(w.people.find(p=>p.id===target)?.sampleMode==='auto'){const t=conversation(w,me.id,target),pendingId=uid();t.pending={id:pendingId,actor:target,trigger:msg.id,createdAt:Date.now(),keyVersion:autoKeyVersion};t.autoError=undefined;autoJob={worldId:w.id,selfId:me.id,peerId:target,trigger:msg.id,userId:s.user_id,pendingId};}
  }else if(op==='message'){
   const value=text(b.text);if(!value)throw Error('消息不能为空');
   if(b.branchId){const br=w.branches.find(x=>x.id===b.branchId&&x.owner===me.id&&x.meetingId===b.id);if(!br)throw Error('找不到这条支线');br.messages.push({id:uid(),author:me.id,source:'person',text:value,time:Date.now()});}
   else{const m=getMeeting(w,b.id,me.id);if(!m||m.status!=='active'||!connection(w,m.a,m.b))throw Error('这次交流已结束');cancelDraft(w,m);m.generating=undefined;m.messages.push({id:uid(),author:me.id,source:'person',text:value,time:Date.now()});m.version++;if(m.pendingFor===me.id){m.pendingFor=undefined;m.pendingQuestion=undefined;}}
  }else if(op==='draft'){
   const d=me.draft;if(!d||d.id!==b.id)throw Error('草稿已更新');const m=getMeeting(w,d.meetingId,me.id);
   if(!m||m.reviewFor!==me.id||m.status!=='active'||!me.open||!connection(w,m.a,m.b)||d.version!==m.version||d.revision!==me.revision)throw Error('交流状态已变化，请重新生成');
   if(b.accept===true){m.messages.push({id:uid(),author:me.id,source:d.source,text:d.text,time:Date.now(),memoryIds:d.memoryIds});activity(me,'speak',d.text,m.id);}else activity(me,'correct','未发送这条草稿',m.id);
   me.draft=undefined;m.reviewFor=undefined;m.version++;
  }else if(op==='end'||op==='block'){
   const m=getMeeting(w,b.id,me.id);if(!m)throw Error('找不到这次交流');m.status='ended';m.generating=undefined;cancelDraft(w,m);m.version++;activity(me,'pause',op==='block'?'已结束并屏蔽':'已结束交流',m.id);if(op==='block'){const peer=m.a===me.id?m.b:m.a;w.blocks.push({a:me.id,b:peer});for(const d of w.dreams.filter(d=>(d.owner===me.id&&d.peer===peer)||(d.peer===me.id&&d.owner===peer)))stopDream(d,'paused','connectionEnded');}
  }else if(op==='branch'){
   const value=text(b.text);if(!value)throw Error('请选择纠正方式');createBranch(w,me.id,text(b.id,80),value,text(b.messageId,80)||undefined);activity(me,'correct','建立私密支线');
  }else if(op==='remember'){
   const value=text(b.text);if(!value)throw Error('内容不能为空');if(me.draft){const current=getMeeting(w,me.draft.meetingId,me.id);if(current)cancelDraft(w,current);}const mem=updateMemory(me,value,b.shared===true,'本人确认');mem.category=['base','current','habits','inner','experiences','preferences','social'].includes(String(b.category))?b.category as typeof mem.category:'experiences';activity(me,'memory','新增一条已确认记忆');
  }else if(op==='memory'){
   const m=me.memory.find(m=>m.id===b.id);if(!m)throw Error('找不到这条记忆');me.memoryUpdates.push({id:uid(),field:m.field||m.source,before:m.text,after:b.remove===true?'':typeof b.text==='string'?text(b.text):b.shared===true?'允许交流时分享':'仅自己可见',time:Date.now()});if(me.draft){const encounter=getMeeting(w,me.draft.meetingId,me.id);if(encounter)cancelDraft(w,encounter);}if(b.remove===true)me.memory=me.memory.filter(x=>x.id!==m.id);else{if(typeof b.text==='string'&&text(b.text))m.text=text(b.text);if(typeof b.shared==='boolean')m.shared=b.shared;m.updatedAt=Date.now();}me.revision++;
  }else if(op==='intro'){
   const i=w.introductions.find(i=>i.id===b.id&&i.to===me.id&&i.status==='pending');if(!i)throw Error('已处理');
   if(b.accept===true){if(!connection(w,me.id,i.from))throw Error('介绍人需要先与你有连接');if(!w.links.some(l=>(l.a===me.id&&l.b===i.target)||(l.a===i.target&&l.b===me.id)))w.links.push({a:me.id,b:i.target,kind:i.target===i.from?'friend':'introduction',via:i.from});}
   i.status=b.accept===true?'accepted':'declined';
  }else if(op==='friend'){
   const target=text(b.target,80);if(!connection(w,me.id,target))throw Error('请先通过引荐或生活圈建立连接');const other=w.people.find(p=>p.id===target)!;
   if(other.sample){if(!w.links.some(l=>l.kind==='friend'&&((l.a===me.id&&l.b===target)||(l.a===target&&l.b===me.id))))w.links.push({a:me.id,b:target,kind:'friend'});}
   else if(!w.introductions.some(i=>i.from===me.id&&i.to===target&&i.status==='pending'))w.introductions.push({id:uid(),from:me.id,target:me.id,to:target,status:'pending'});
  }else if(op==='recommend'){
   const target=text(b.target,80),to=text(b.to,80);if(target===to||!w.links.some(l=>l.kind==='friend'&&((l.a===me.id&&l.b===target)||(l.a===target&&l.b===me.id)))||!w.links.some(l=>l.kind==='friend'&&((l.a===me.id&&l.b===to)||(l.a===to&&l.b===me.id))))throw Error('只能将自己的朋友引荐给另一位朋友');
   if(!w.introductions.some(i=>i.target===target&&i.to===to&&i.status==='pending'))w.introductions.push({id:uid(),from:me.id,target,to,status:'pending'});
  }else throw Error('操作不可用');
 });
 if(autoJob)await env.CHAT_SCHEDULER.getByName(`${s.world_id}:${s.person_id}:${autoJob.peerId}`).schedule(autoJob);
 const {world}=await loadWorld(s.world_id);return reply({...visibleWorld(world,s.person_id),aiConfigured:await aiConfigured(s.user_id)});
 }catch(e){return reply(safeError(e),null,400);}}
