import {PLACES,uid,type World,type PlaceId} from './world';
import {lifePosition,pauseLife,lifeStep} from './life';
import type {Dream,DreamEvent} from './dream-types';
import type {EMAction} from './conversation-types';

export function actorPlace(d:Dream,actor:string):PlaceId{return [...d.events].reverse().find(e=>e.actor===actor)?.place||d.place;}
export function freezeRealtime(w:World,d:Dream,actor?:string){if(d.mode!=='realtime')return;for(const p of w.people)if(p.life&&(actor?p.id===actor:p.life.control?.dreamId===d.id)){p.life.control={dreamId:d.id,eventId:p.life.control?.eventId||'',hold:true};pauseLife(p,true);}}
export function executeEMAction(w:World,d:Dream,actor:string,action:EMAction,source:DreamEvent['source']='em'){
 if(d.status==='ended')throw Error('This round is complete. Start a new Dream.');
 const p=w.people.find(p=>p.id===actor);if(!p)throw Error('This EM is unavailable.');
 const live=d.mode==='realtime'&&source==='em'&&d.participants.includes(actor);
 const target=action.kind==='move'?(action.place||actorPlace(d,actor)):live?p.place:actorPlace(d,actor);
 if(live&&action.kind==='move'&&!p.settings.behavior.destinations.includes(target))throw Error('This place is outside your EM activity range. Update EM settings first.');
 const now=Date.now(),event:DreamEvent={id:uid(),actor,source,kind:action.kind,text:action.text.slice(0,320),place:target,time:now,sceneTime:d.mode==='accelerated'?(d.events.at(-1)?.sceneTime||d.createdAt)+3600_000:now,memoryIds:[]};
 if(live){
  // A private projection never moves the peer's real Life EM.
  for(const other of w.dreams)if(other.id!==d.id&&other.mode==='realtime'&&other.participants.includes(actor)&&['running','waiting'].includes(other.status)){other.status='paused';other.stopReason='activeSceneChanged';other.version++;if(other.run)other.run.lease=undefined;freezeRealtime(w,other);}
  if(!p.life)lifeStep(p);
  const base=PLACES.find(place=>place.id===p.place)!,from=p.life?lifePosition(p.life):[base.lng,base.lat] as [number,number];
  if(action.kind==='move'){
   const to=PLACES.find(place=>place.id===target)!;
   p.place=target;p.life={place:target,path:[from,[to.lng,to.lat]],startedAt:now,arriveAt:now+30_000,label:action.text,step:(p.life?.step||0)+1,control:{dreamId:d.id,eventId:event.id,hold:false}};
  }else{
   if(!p.life)p.life={place:p.place,path:[from,from],startedAt:now,arriveAt:now+30_000,label:action.text,step:0};
   p.life.control={dreamId:d.id,eventId:event.id,hold:true};p.life.label=action.text;pauseLife(p,true);
  }
  event.motion=structuredClone(p.life);p.revision++;p.updatedAt=now;
  p.activities.push({id:uid(),kind:action.kind==='move'?'move':action.kind==='wait'?'wait':'speak',text:action.text,time:now});
  p.activities=p.activities.slice(-100);
 }
 d.events.push(event);if(actor===d.owner||d.mode==='accelerated')d.place=target;
 d.version++;if(d.run){d.run.lease=undefined;d.run.nextActor=actor===d.owner?d.peer:d.owner;}
 return event;
}
