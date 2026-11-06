import assert from 'node:assert/strict';
import {createWorld,makePerson} from '../lib/world';
import {newDream,operateDream,visibleDreams} from '../lib/dream';
import {controlEM} from '../lib/em-control';
import {beginRun,tickDream,summarize} from '../lib/dream-runner';
import {lifeStep,lifePosition} from '../lib/life';
import {executeEMAction} from '../lib/em-actions';
import {literalUtterance} from '../lib/em-literal';
import {world,reset,model} from './fixtures/em-runtime';

function fixture(){const a=makePerson('a','River'),b=makePerson('b','Sky');a.open=b.open=true;a.ready=b.ready=true;a.settings.behavior.destinations=b.settings.behavior.destinations=['park','cafe','bookshop','riverside'];const w=createWorld('w','code',a);w.people.push(b);b.circles=['w'];a.memory=[{id:'a-secret',text:'PRIVATE-A',shared:false,source:'test',updatedAt:1}];b.memory=[{id:'b-secret',text:'PRIVATE-B',shared:false,source:'test',updatedAt:1}];lifeStep(a);lifeStep(b);reset(w);return newDream(world,'a',{peer:'b',mode:'realtime',place:'cafe',pace:'explore',template:'future'});}
const scene=(id:string)=>world.dreams.find(d=>d.id===id)!;
const deferred=()=>{let resolve:(v:any)=>void=()=>{};const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
const waitFor=async(test:()=>boolean)=>{for(let i=0;i<40&&!test();i++)await new Promise(r=>setTimeout(r,0));assert(test());};

let d=fixture();assert.equal(d.place,'park','live creation uses the Life context, not supplied imaginary conditions');assert.equal(d.activity,'live');
assert.equal(literalUtterance('请你立刻咕咕嘎嘎'),'咕咕嘎嘎');assert.equal(literalUtterance('请你立刻说“咕咕嘎嘎”'),'咕咕嘎嘎');assert.equal(literalUtterance('Say hello'),'hello');assert.equal(literalUtterance('\u4e0d\u8981\u8bf4\u201c\u5495\u5495\u560e\u560e\u201d'),undefined);assert.equal(literalUtterance('\u53bb\u5496\u5561\u5e97\u8bf4\u201chello\u201d'),undefined);assert.equal(literalUtterance('请你立刻去咖啡店'),undefined);
model(async()=>{throw Error('Literal utterances must execute without asking a model to reinterpret them.');});
await controlEM('w','a','user-a',{id:d.id,text:'请你立刻咕咕嘎嘎'});
assert.equal(scene(d.id).events.at(-1)?.text,'咕咕嘎嘎');assert.equal(scene(d.id).events.at(-1)?.kind,'speak');assert.equal(scene(d.id).events.at(-1)?.actor,'a');assert.equal(scene(d.id).events.at(-1)?.source,'em');assert.equal(scene(d.id).run?.nextActor,'b');
console.log('PASS: 请你立刻咕咕嘎嘎 produces the exact EM utterance 咕咕嘎嘎 immediately, without a hollow acknowledgment or model reinterpretation.');
const peerLife=JSON.stringify(world.people.find(p=>p.id==='b')!.life),settings=JSON.stringify(world.people.find(p=>p.id==='a')!.settings);
model(async()=>({intent:'adjust',action:{kind:'move',text:'Walks to the cafe.',place:'cafe'}}));
const result=await controlEM('w','a','user-a',{id:d.id,text:'Go to the cafe.'});d=scene(result.id);
assert.equal(result.id,d.id);assert.equal(d.events.at(-1)?.kind,'move');assert.equal(d.events.at(-1)?.actor,'a');assert.equal(d.events.at(-1)?.source,'em');
assert.equal(world.people.find(p=>p.id==='a')!.place,'cafe');assert.equal(d.run?.nextActor,'b');assert.equal(JSON.stringify(world.people.find(p=>p.id==='b')!.life),peerLife);assert.equal(JSON.stringify(world.people.find(p=>p.id==='a')!.settings),settings);
assert(!visibleDreams(world,'b').length);assert(!d.controls!.some(c=>c.role==='em'),'physical commands produce an action, not a hollow acknowledgment');
model(async(_s,input)=>{assert(!JSON.stringify(input).includes('PRIVATE-B'));assert(!input.privateOwnerInstruction);return {kind:'speak',text:'Would you like a window seat?',place:'cafe',memoryIds:[]};});
await tickDream('w',d.id);assert.equal(scene(d.id).events.at(-1)?.source,'projection');assert.equal(JSON.stringify(world.people.find(p=>p.id==='b')!.life),peerLife);
model(async()=>({intent:'continue',action:{kind:'wait',text:'Waits here.'}}));await controlEM('w','a','user-a',{id:d.id,text:'Stay here.'});let me=world.people.find(p=>p.id==='a')!;const position=lifePosition(me.life!);lifeStep(me);assert.deepEqual(lifePosition(me.life!,Date.now()+100_000),position);assert(me.life!.control!.hold);
console.log('PASS: live command executes immediately, syncs own Life route, freezes on wait, preserves long-term preferences and never moves the projected peer.');

// An old in-flight scene action cannot write after a new owner instruction.
d=fixture();await beginRun('w',d.id,'a','user-a');const old=deferred();let oldStarted=false;
model(async(system)=>{if(system.startsWith('You perform')){oldStarted=true;return old.promise;}return {intent:'continue',action:{kind:'move',text:'Takes the new route.',place:'bookshop'}};});
const pending=tickDream('w',d.id);await waitFor(()=>oldStarted);await controlEM('w','a','user-a',{id:d.id,text:'Change route to the bookshop.'});old.resolve({kind:'move',text:'STALE OLD ACTION',place:'cafe',memoryIds:[]});await pending;assert(!scene(d.id).events.some(e=>e.text==='STALE OLD ACTION'));assert.equal(world.people.find(p=>p.id==='a')!.place,'bookshop');

// Two commands resolving out of order: only the latest command can execute.
d=fixture();const first=deferred();let parsing=false;
model(async(_s,input)=>{if(input.instruction==='Old instruction'){parsing=true;return first.promise;}return {intent:'continue',action:{kind:'move',text:'Latest choice.',place:'riverside'}};});
const firstCommand=controlEM('w','a','user-a',{id:d.id,text:'Old instruction'}).then(()=>null,e=>e);await waitFor(()=>parsing);await controlEM('w','a','user-a',{id:d.id,text:'Newest instruction'});first.resolve({intent:'continue',action:{kind:'move',text:'OUTDATED',place:'cafe'}});assert.equal((await firstCommand).code,'EM_INSTRUCTION_SUPERSEDED');assert.equal(world.people.find(p=>p.id==='a')!.place,'riverside');assert(!scene(d.id).events.some(e=>e.text==='OUTDATED'));
console.log('PASS: new instructions cancel outstanding generations; out-of-order commands cannot overwrite the latest action.');

d=fixture();const interrupted=deferred();let waiting=false;model(async()=>{waiting=true;return interrupted.promise;});
const interruptedCommand=controlEM('w','a','user-a',{id:d.id,text:'A slow instruction'}).then(()=>null,e=>e);await waitFor(()=>waiting);operateDream(world,'a',{op:'pause',id:d.id});interrupted.resolve({intent:'continue',action:{kind:'move',text:'Should not execute.',place:'cafe'}});assert.equal((await interruptedCommand).code,'EM_INSTRUCTION_SUPERSEDED');assert.equal(scene(d.id).events.length,0);
console.log('PASS: pausing while an instruction is being parsed cancels it before any action or route write.');

d=fixture();operateDream(world,'a',{op:'invite',id:d.id,previewIds:[]});const shared=operateDream(world,'b',{op:'accept',id:d.id,accept:true})!;
model(async(_s,input)=>{assert(!JSON.stringify(input).includes('PRIVATE-A'));assert(!JSON.stringify(input).includes('PRIVATE-B'));return {intent:'continue',action:{kind:'move',text:'Sky goes to the cafe.',place:'cafe'}};});
await controlEM('w','b','user-b',{id:shared.id,text:'Go to the cafe.'});assert.equal(world.people.find(p=>p.id==='b')!.place,'cafe');assert.equal(world.people.find(p=>p.id==='a')!.place,'park');assert.equal(scene(shared.id).run?.nextActor,'a');assert(!JSON.stringify(visibleDreams(world,'a')).includes('Go to the cafe.'));

const accelerated=newDream(world,'a',{peer:'b',mode:'accelerated',place:'park'});const before=JSON.stringify(world.people.find(p=>p.id==='a')!.life);executeEMAction(world,accelerated,'a',{kind:'move',text:'An imagined detour.',place:'riverside'});assert.equal(JSON.stringify(world.people.find(p=>p.id==='a')!.life),before);
console.log('PASS: shared commands affect only their owner and authorized input; accelerated imagination stays separate from Life.');

d=fixture();executeEMAction(world,d,'a',{kind:'move',text:'Starts walking.',place:'cafe'});operateDream(world,'a',{op:'end',id:d.id});const version=scene(d.id).version;operateDream(world,'a',{op:'end',id:d.id});assert.equal(scene(d.id).version,version);assert(world.people.find(p=>p.id==='a')!.life?.control?.hold);await assert.rejects(()=>beginRun('w',d.id,'a','user-a'),/complete/);await assert.rejects(()=>controlEM('w','a','user-a',{id:d.id,text:'Go back.'}),/complete/);assert.equal(await tickDream('w',d.id),false);
let summaries=0;const summary=deferred();model(async()=>{summaries++;return summary.promise;});const recap1=summarize('w',d.id,'user-a');await waitFor(()=>summaries===1);await summarize('w',d.id,'user-a');assert.equal(summaries,1);summary.resolve({summary:'The EM walked to the cafe.',highlights:[],topics:[]});await recap1;await summarize('w',d.id,'user-a');assert.equal(summaries,1);assert.equal(scene(d.id).status,'ended');assert(!scene(d.id).recapJob);
console.log('PASS: end is terminal/idempotent, stops live movement and rejects resuming; concurrent or repeated recap requests generate only once.');
