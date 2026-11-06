import type {World} from './world';
import type {SceneReference} from './conversation-types';
import {canReadDream} from './dream';
export function sceneReference(w:World,self:string,peer:string,input:unknown):SceneReference|undefined{
 if(!input||typeof input!=='object')return;
 const b=input as {dreamId?:string;eventId?:string};
 const d=w.dreams.find(d=>d.id===b.dreamId&&canReadDream(d,self)&&(d.owner===self&&d.peer===peer||d.peer===self&&d.owner===peer&&d.visibility==='shared'));
 const e=d?.events.find(e=>e.id===b.eventId);if(!d||!e)throw Error('This scene is unavailable.');
 return {dreamId:d.id,eventId:e.id,title:d.title,place:e.place,mode:d.mode,source:e.source,quote:e.text,sceneTime:e.sceneTime,actors:[d.owner,d.peer].map(id=>{const p=w.people.find(p=>p.id===id)!;return {name:p.name,avatar:p.avatar};})};
}
