import {loadWorld,mutate} from './store';
import {credential,modelJson,AiError,aiStatus} from './ai';
import {canReadDream,newDream,forkDream,touchDream,stopDream,activeMemories} from './dream';
import {executeEMAction,freezeRealtime,actorPlace} from './em-actions';
import {uid,connection,type PlaceId} from './world';
import {beginRun,summarize} from './dream-runner';
import {literalUtterance} from './em-literal';
import type {EMAction} from './conversation-types';
type Parsed={intent:'continue'|'pause'|'end'|'adjust'|'topic';action?:EMAction;reply?:string;pace?:'quiet'|'balanced'|'explore';topics?:string[]};
export async function controlEM(worldId:string,self:string,userId:string,b:Record<string,unknown>){
 const text=typeof b.text==='string'?b.text.trim().slice(0,800):'';if(!text)throw Error('Enter an instruction for your EM.');
 const {world}=await loadWorld(worldId),p=world.people.find(p=>p.id===self)!;
 const old=world.dreams.find(d=>d.id===b.id&&canReadDream(d,self)&&(d.owner===self||d.visibility==='shared'));
 if(b.id&&!old)throw Error('This Dream is unavailable.');if(old?.status==='ended')throw Error('This round is complete. Start a new Dream.');
 const peer=old?(old.owner===self?old.peer:old.owner):String(b.peer||'');if(!connection(world,self,peer))throw Error('Choose an existing connection.');
 const direct=/^(pause|stop|\u6682\u505c|\u505c\u4e00\u4e0b)[.!\u3002\uff01]?$/i.test(text)?'pause':/^(end|end dream|\u7ed3\u675f|\u7ed3\u675f\u5e76\u56de\u987e)[.!\u3002\uff01]?$/i.test(text)?'end':null;
 const literal=literalUtterance(text),c=direct?null:await credential(userId),controlId=uid();let id='',version=0,actionVersion=0;
 // Receipt invalidates old generations before waiting for the parser/model.
 await mutate(worldId,w=>{let d=old?w.dreams.find(d=>d.id===old.id):undefined;if(!d)d=newDream(w,self,{peer,mode:'realtime'});if(!d.participants.includes(self)||d.status==='ended'||!connection(w,self,peer))throw Error('This Dream is no longer active.');for(const other of w.dreams)if(other.id!==d.id&&other.mode==='realtime'&&other.participants.includes(self)&&['running','waiting'].includes(other.status))stopDream(other,'paused','ownerInstruction');if(['running','waiting'].includes(d.status))stopDream(d,'paused','ownerInstruction');freezeRealtime(w,d,self);touchDream(d);d.error=undefined;d.controls??=[];d.controls.push({id:controlId,owner:self,role:'user',text,time:Date.now(),status:'pending'});id=d.id;version=d.version;});
 try{
  const controlWorld=(await loadWorld(worldId)).world,snapshot=controlWorld.dreams.find(d=>d.id===id)!,owner=controlWorld.people.find(p=>p.id===self)!;if(snapshot.version!==version)throw new AiError('EM_INSTRUCTION_SUPERSEDED','This instruction was cancelled by a newer action.',409);
  const parsed:Parsed=direct?{intent:direct}:literal?{intent:'continue',action:{kind:'speak',text:literal}}:await modelJson<Parsed>(c!,`Control ONLY the owner's EM. The owner's latest explicit instruction takes priority over every scene beat and previous action. Execute it now; never substitute agreement, explanation or a topic suggestion. Preserve any requested utterance exactly, even an unusual sound or playful phrase. Return JSON {"intent":"continue|pause|end|adjust|topic","action":{"kind":"move|speak|wait|propose","text":"the immediate visible action or spoken line, not a promise or acknowledgment","place":"optional destination only for move"},"pace":"optional quiet|balanced|explore","topics":["optional concrete questions"]}. For continue/adjust, action is REQUIRED and must execute the instruction now: go to a cafe => move to cafe; stay or wait => wait at the current place; say/ask something => speak the actual words. Topic is ONLY an explicit request for topic suggestions or explanation, never a physical instruction. Respect negative constraints. Pause/end need no action. Do not return an acknowledgment instead of an action. Use ${owner.settings.language==='zh'?'Simplified Chinese':'English'}, under 45 words. Never control the peer or promise their response. Never invent personal facts, disclose private instructions, make relationship commitments or arrange an actual meeting. Use only authorized facts below. No changes to long-term settings.`,{instruction:text,current:{mode:snapshot.mode,place:actorPlace(snapshot,self),pace:snapshot.pace,events:snapshot.events.slice(-8).map(e=>({id:e.id,actor:e.actor,source:e.source,text:e.text}))},allowedDestinations:owner.settings.behavior.destinations,authorizedMemories:activeMemories(controlWorld,snapshot,self).map(m=>({id:m.id,text:m.text}))});
  if(!['continue','pause','end','adjust','topic'].includes(parsed.intent))throw new AiError('AI_INVALID_OUTPUT','DeepSeek returned an invalid instruction. Try again.');
  if(['continue','adjust'].includes(parsed.intent)&&(!parsed.action||!['move','speak','wait','propose'].includes(parsed.action.kind)||typeof parsed.action.text!=='string'||!parsed.action.text.trim()||parsed.action.place&&!['park','bookshop','cafe','riverside'].includes(parsed.action.place)))throw new AiError('AI_INVALID_OUTPUT','DeepSeek did not return an executable action. Try again.');
  if(parsed.action&&/phone number|home address|marry|meet up|go on a date|\u8054\u7cfb\u65b9\u5f0f|\u4f4f\u5740|\u7ed3\u5a5a|\u7ea6\u4f1a|\u89c1\u9762/i.test(parsed.action.text))throw Error('This step needs the person to confirm it in Chat.');
  if(c){const status=await aiStatus(userId);if(!status.configured||status.version!==c.version)throw new AiError('AI_CONFIG_CHANGED','AI settings changed. Send the instruction again.');}
  await mutate(worldId,w=>{let d=w.dreams.find(d=>d.id===id)!;
   if(d.version!==version||d.status==='ended'||!d.participants.includes(self)||!connection(w,self,peer)||w.people.find(p=>p.id===self)?.revision!==owner.revision)throw new AiError('EM_INSTRUCTION_SUPERSEDED','This instruction was cancelled by a newer action.',409);
   // Accelerated what-if corrections preserve their original branch. Live controls act in place.
   if(parsed.intent==='adjust'&&d.mode==='accelerated'){const pending=d.controls!.find(c=>c.id===controlId)!;pending.status='applied';d=forkDream(w,d,self,{});d.controls=[{...pending}];id=d.id;}
   const pending=d.controls!.find(c=>c.id===controlId)!;pending.status='applied';
   if(parsed.pace&&['quiet','balanced','explore'].includes(parsed.pace))d.pace=parsed.pace;
   if(parsed.intent==='end'){stopDream(d,'ended','endedByPerson');freezeRealtime(w,d);}
   else if(parsed.intent==='pause'){stopDream(d,'paused','ownerInstruction');freezeRealtime(w,d);}
   else if(parsed.intent==='topic'){d.controls!.push({id:uid(),owner:self,role:'em',text:typeof parsed.reply==='string'?parsed.reply.slice(0,260):'',time:Date.now(),topics:Array.isArray(parsed.topics)?parsed.topics.filter(v=>typeof v==='string').slice(0,3).map(v=>({id:uid(),icon:'question',text:v.slice(0,180),eventId:d.events.at(-1)?.id})):[]});}
   else{const event=executeEMAction(w,d,self,parsed.action!);pending.eventId=event.id;actionVersion=d.version;}
  });
  const run=parsed.intent==='continue'||parsed.intent==='adjust';
  if(run)await beginRun(worldId,id,self,userId,{afterActor:self,expectedVersion:actionVersion});
  if(parsed.intent==='end')await summarize(worldId,id,userId);
  return {id,run};
 }catch(e){await mutate(worldId,w=>{const d=w.dreams.find(d=>d.id===id),pending=d?.controls?.find(c=>c.id===controlId);if(pending?.status==='pending')pending.status=d?.version===version?'failed':'cancelled';});throw e;}
}
