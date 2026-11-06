import type {LifeMotion} from './life';
import type {SceneReference,AutoPending} from './conversation-types';
import type {Dream,DisclosureGrant,Relationship,PreferenceSuggestion} from './dream-types';
import {initDreams,visibleDreams,relationshipViews,disclosed} from './dream';
import {defaultSettings,settingsFrom,interestNames,paceLabel,type AgentSettings,type Category} from './settings';
export type PlaceId = 'park' | 'bookshop' | 'cafe' | 'riverside';
export const PLACES = [
  {id:'park' as PlaceId,name:'公园',label:'复兴公园活动点',lng:121.4728,lat:31.2166,color:'#69c68a'},
  {id:'bookshop' as PlaceId,name:'书店',label:'思南路书店活动点',lng:121.4743,lat:31.2198,color:'#9d8ae5'},
  {id:'cafe' as PlaceId,name:'咖啡',label:'思南路咖啡活动点',lng:121.4783,lat:31.2220,color:'#f6b65e'},
  {id:'riverside' as PlaceId,name:'河边',label:'苏州河活动点',lng:121.4745,lat:31.2398,color:'#53bacf'},
];
export type Memory={id:string;text:string;shared:boolean;source:string;updatedAt:number;category?:Category;field?:string};
export type Activity={id:string;kind:'move'|'meet'|'speak'|'review'|'pause'|'correct'|'wait'|'memory';text:string;time:number;meetingId?:string};
export type DraftReply={id:string;meetingId:string;text:string;source:'agent'|'example';memoryIds:string[];needsOwner:boolean;version:number;revision:number;createdAt:number};
export type Thread={id:string;a:string;b:string;messages:Message[];createdAt:number;pending?:AutoPending;autoError?:{code:string;message:string}};
export type MemoryChange={id:string;field:string;before:string;after:string;time:number};
export type Person={id:string;name:string;avatar:number;place:PlaceId;open:boolean;story:string;pace:string;phrase:string;memory:Memory[];circles:string[];sample?:boolean;sampleMode?:'auto'|'dead';revision:number;ready:boolean;updatedAt:number;settings:AgentSettings;activities:Activity[];memoryUpdates:MemoryChange[];draft?:DraftReply;guideVersion?:number;lifeDefaultVersion?:number;life?:LifeMotion};
export type Link={a:string;b:string;kind:'friend'|'introduction';via?:string};
export type Message={id:string;author:string;source:'person'|'agent'|'example'|'auto';text:string;time:number;memoryIds?:string[];sceneRef?:SceneReference};
export type Meeting={id:string;a:string;b:string;place:PlaceId;status:'active'|'ended';messages:Message[];createdAt:number;version:number;generating?:string;pendingFor?:string;pendingQuestion?:string;reviewFor?:string};
export type Branch={id:string;meetingId:string;owner:string;title:string;correction:string;messages:Message[];createdAt:number;parentMessageId?:string};
export type World={dreams:Dream[];disclosures:DisclosureGrant[];relationships:Relationship[];preferenceSuggestions:PreferenceSuggestion[];id:string;code:string;createdAt:number;people:Person[];links:Link[];meetings:Meeting[];branches:Branch[];threads:Thread[];blocks:{a:string;b:string}[];introductions:{id:string;from:string;target:string;to:string;status:'pending'|'accepted'|'declined'}[]};
export const uid=()=>crypto.randomUUID();
export const placeName=(id:string)=>PLACES.find(p=>p.id===id)?.name||'口袋公园';
export const makePerson=(id:string,name='Member',avatar=0):Person=>({id,name,avatar,place:'park',open:false,story:'',pace:'慢慢认识，不用一直在线',phrase:'',memory:[],circles:[],revision:0,ready:false,updatedAt:Date.now(),settings:defaultSettings(),guideVersion:0,lifeDefaultVersion:1,activities:[],memoryUpdates:[]});
export function createWorld(id:string,code:string,person:Person):World {
  const one=makePerson(uid(),'Mina (auto)',1),two=makePerson(uid(),'Alex',2);
  one.sample=true;one.sampleMode='auto';two.sample=true;one.settings.behavior.review=two.settings.behavior.review=false;one.settings.interests=['walk','photo'];two.settings.interests=['reading','coffee'];two.settings.behavior.destinations=['bookshop','cafe'];one.ready=two.ready=true;one.open=two.open=true;
  one.place='park';two.place='bookshop';
  one.story='I enjoy a slow weekend walk and stop to look at interesting trees.';
  two.story='I enjoy browsing bookshops and sometimes choose a book for its cover.';
  one.memory=[{id:uid(),text:one.story,shared:true,source:'示例资料',updatedAt:Date.now()}];
  two.memory=[{id:uid(),text:two.story,shared:true,source:'示例资料',updatedAt:Date.now()}];
  person.circles=[id];one.circles=[id];
  return ensureDemoPeople({dreams:[],disclosures:[],relationships:[],preferenceSuggestions:[],id,code,createdAt:Date.now(),people:[person,one,two],links:[{a:person.id,b:one.id,kind:'friend'},{a:one.id,b:two.id,kind:'friend'}],meetings:[],branches:[],threads:[],blocks:[],introductions:[{id:uid(),from:one.id,target:two.id,to:person.id,status:'pending'}]});
}
export function connection(w:World,a:string,b:string):string|null {
  if(a===b||w.blocks.some(l=>(l.a===a&&l.b===b)||(l.a===b&&l.b===a)))return null;
  const p=w.people.find(p=>p.id===a),q=w.people.find(p=>p.id===b);if(!p||!q)return null;
  const links=w.links.filter(l=>(l.a===a&&l.b===b)||(l.a===b&&l.b===a));const link=links.find(l=>l.kind==='friend')||links[0];
  if(link)return link.kind==='friend'?'朋友':'朋友引荐';
  if(p.circles.some(c=>q.circles.includes(c)))return '共同生活圈';
  return null;
}
export function visibleWorld(w:World,selfId:string) {
  const me=w.people.find(p=>p.id===selfId)!;
  const relevant=w.people.filter(p=>p.id!==selfId&&(connection(w,selfId,p.id)||w.introductions.some(i=>i.to===selfId&&i.target===p.id&&i.status==='pending')));
  return {id:w.id,code:w.code,me,dreams:visibleDreams(w,selfId),relationships:relationshipViews(w,selfId),preferenceSuggestions:w.preferenceSuggestions.filter(s=>s.owner===selfId),people:relevant.map(p=>({id:p.id,name:p.name,avatar:p.avatar,open:p.open,ready:p.ready,sample:!!p.sample,sampleMode:p.sampleMode,connection:connection(w,selfId,p.id),sharedStory:disclosed(w,p.id,selfId).map(m=>m.text).slice(0,3).join(' ')})),
    threads:w.threads.filter(t=>t.a===selfId||t.b===selfId),meetings:w.meetings.filter(m=>m.a===selfId||m.b===selfId),branches:w.branches.filter(b=>b.owner===selfId),introductions:w.introductions.filter(i=>i.to===selfId&&i.status==='pending')};
}
export type View=ReturnType<typeof visibleWorld>;
export function createBranch(w:World,selfId:string,meetingId:string,text:string,parentMessageId?:string) {
  const p=w.people.find(p=>p.id===selfId)!;
  const meeting=meetingId==='daily'?{messages:[{id:'daily',author:selfId,source:'person' as const,text:p.story||`今天去${placeName(p.place)}走走`,time:Date.now()}]}:w.meetings.find(m=>m.id===meetingId&&(m.a===selfId||m.b===selfId));if(!meeting)throw Error('找不到这段相遇');
  const index=parentMessageId?meeting.messages.findIndex(m=>m.id===parentMessageId):-1;
  const source=index>=0?meeting.messages.slice(0,index):meeting.messages;
  const branch:Branch={id:uid(),meetingId,owner:selfId,title:'如果换一种说法',correction:text,messages:[...source.map(m=>({...m})),{id:uid(),author:selfId,source:'person',text,time:Date.now()}],createdAt:Date.now(),parentMessageId};
  w.branches.push(branch);return branch;
}
export function updateMemory(person:Person,text:string,shared=false,source='本人确认') {
  const m:Memory={id:uid(),text,shared,source,updatedAt:Date.now()};person.memory.push(m);person.revision++;return m;
}
export function startMeeting(w:World,selfId:string,target:string,place:PlaceId) {
  const me=w.people.find(p=>p.id===selfId),other=w.people.find(p=>p.id===target);
  if(!me?.ready||!me.open||!other?.ready||!other.open)throw Error('双方开启 EM 后才可交流');
  if(!connection(w,selfId,target))throw Error('通过朋友引荐或加入共同生活圈后，才可以相遇');
  const existing=w.meetings.find(m=>m.status==='active'&&(m.a===selfId||m.b===selfId));if(existing){if(existing.a===target||existing.b===target)return existing;throw Error('请先结束当前 EM 交流');}
  if(w.meetings.some(m=>m.status==='active'&&(m.a===target||m.b===target)))throw Error('对方正在另一段相遇里，稍后再来');
  if(!me.settings.behavior.destinations.includes(place)||!other.settings.behavior.destinations.includes(place))throw Error('该地点不在双方 EM 的活动范围内');
  me.place=other.place=place;
  const m:Meeting={id:uid(),a:selfId,b:target,place,status:'active',messages:[],createdAt:Date.now(),version:0};w.meetings.push(m);return m;
}

export function activity(p:Person,kind:Activity['kind'],text:string,meetingId?:string){if(p.activities.at(-1)?.text===text&&Date.now()-p.activities.at(-1)!.time<60000)return;p.activities.push({id:uid(),kind,text,time:Date.now(),meetingId});p.activities=p.activities.slice(-100);}
export function normalizeWorld(w:World){initDreams(w);ensureDemoPeople(w);w.threads??=[];for(const p of w.people){p.guideVersion??=1;p.settings=settingsFrom(p.settings);if(!p.lifeDefaultVersion){p.settings.behavior.autopilot=true;if(p.ready&&!p.sample)p.open=true;p.lifeDefaultVersion=1;}p.activities??=[];p.memoryUpdates??=[];}return w;}
export function syncSettingsMemories(p:Person){
 const s=p.settings;
 const items:{field:string;category:Category;text:string}[]=[
 {field:'identity',category:'base',text:s.identity&&s.identity!=='暂不设置'?`当前身份：${s.identity}`:''},
 {field:'current',category:'current',text:s.current.length?`当前状态：${s.current.join('、')}`:''},
 {field:'goals',category:'current',text:s.goals.length?`近期计划：${s.goals.join('、')}`:''},
 {field:'rhythm',category:'habits',text:s.rhythm!=='暂不设置'?`作息：${s.rhythm}`:''},
 {field:'leisure',category:'habits',text:s.leisure.length?`休闲方式：${s.leisure.join('、')}`:''},
 {field:'values',category:'inner',text:s.values.length?`重视：${s.values.join('、')}`:''},
 {field:'interests',category:'preferences',text:s.interests.length?`感兴趣的话题：${interestNames(s.interests)}`:''},
 {field:'pace',category:'social',text:`当前交流节奏：${paceLabel(s.pace)}`},
 ];
 for(const item of items){const existing=p.memory.find(m=>m.field===item.field);if((existing?.text||'')!==item.text)p.memoryUpdates.push({id:uid(),field:item.field,before:existing?.text||'',after:item.text,time:Date.now()});if(!item.text){p.memory=p.memory.filter(m=>m.field!==item.field);continue;}if(existing){existing.text=item.text;existing.updatedAt=Date.now();}else p.memory.push({id:uid(),text:item.text,shared:false,source:'本人选择',updatedAt:Date.now(),category:item.category,field:item.field});}
 p.memoryUpdates=p.memoryUpdates.slice(-100);p.revision++;
}
export function cancelDraft(w:World,m:Meeting){if(m.reviewFor){const owner=w.people.find(p=>p.id===m.reviewFor);if(owner?.draft?.meetingId===m.id)owner.draft=undefined;m.reviewFor=undefined;}}
export function conversation(w:World,a:string,b:string){let t=w.threads.find(t=>(t.a===a&&t.b===b)||(t.a===b&&t.b===a));if(!t){t={id:uid(),a,b,messages:[],createdAt:Date.now()};w.threads.push(t);}return t;}

export function ensureDemoPeople(w:World){
 const mina=w.people.find(p=>p.sample&&(p.sampleMode==='auto'||p.name==='Mina'||p.name==='Mina (auto)'));
 if(mina){mina.name='Mina (auto)';mina.sampleMode='auto';}
 if(!w.people.some(p=>p.sampleMode==='dead')){
  const dead=makePerson(`demo-dead-${w.id}`,'Mina (dead)',4);dead.sample=true;dead.sampleMode='dead';dead.ready=true;dead.open=false;dead.circles=[w.id];dead.updatedAt=0;
  dead.memory=[{id:`${dead.id}-intro`,text:'Demo profile: enjoys reading and quiet places. The person is offline and cannot respond or join a shared Dream.',shared:true,source:'Demo fixture',updatedAt:0}];w.people.push(dead);
 }
 return w;
}
