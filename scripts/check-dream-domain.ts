import assert from 'node:assert/strict';
import {createWorld,makePerson,normalizeWorld,visibleWorld} from '../lib/world';
import {newDream,operateDream,disclosed,activeMemories,visibleDreams} from '../lib/dream';
const a=makePerson('a','A'),b=makePerson('b','B');const w=createWorld('w','code',a);w.people.push(b);b.circles=['w'];a.memory=[{id:'private-a',text:'private-A',shared:true,source:'legacy',updatedAt:1}];b.memory=[{id:'private-b',text:'private-B',shared:true,source:'legacy',updatedAt:1}];
assert.deepEqual(disclosed(w,'a','b'),[],'legacy sharing never creates a relation grant');
operateDream(w,'b',{op:'disclosure',peer:'a',memoryIds:['private-b']});const d=newDream(w,'a',{peer:'b',correction:'private correction'});assert.deepEqual(activeMemories(w,d,'b').map(m=>m.id),['private-b']);
b.memory.push({id:'new',text:'new fact',shared:true,source:'choice',updatedAt:1});operateDream(w,'b',{op:'disclosure',peer:'a',memoryIds:['private-b','new']});assert.equal(activeMemories(w,d,'b').length,1,'new grant cannot expand an existing private snapshot');
b.memory[0].text='changed fact';b.memory[0].updatedAt=2;assert.equal(activeMemories(w,d,'b').length,0,'edited memories require new authorization');
assert.equal(visibleDreams(w,'b').length,0,'private branches stay private');operateDream(w,'a',{op:'invite',id:d.id,previewIds:[]});assert(!JSON.stringify(visibleDreams(w,'b')).includes('private correction'),'unselected correction is not invitation metadata');
const shared=operateDream(w,'b',{op:'accept',id:d.id,accept:true})!;assert.equal(shared.correction,'');assert.equal(shared.events.length,0);assert.equal(activeMemories(w,shared,'a').length,0,'shared owner cannot use private self memories');
operateDream(w,'a',{op:'message',id:shared.id,text:'A human statement'});const event=shared.events[0];operateDream(w,'b',{op:'understanding',peer:'a',dreamId:shared.id,sourceIds:[event.id],text:event.text});assert.throws(()=>operateDream(w,'b',{op:'stage',peer:'a'}),/Both people/,'one-sided knowledge cannot advance a mutual stage');
shared.events.push({...event,id:'fake-em',actor:'a',source:'em'});assert.throws(()=>operateDream(w,'b',{op:'understanding',peer:'a',dreamId:shared.id,sourceIds:['fake-em']}),/actually said/,'EM dialogue is not human evidence');
const count=shared.events.length;const fork=operateDream(w,'b',{op:'fork',id:shared.id,correction:'another choice',eventId:event.id})!;assert.equal(shared.events.length,count);assert.equal(fork.events.length,2);assert(!visibleDreams(w,'a').some(d=>d.id===fork.id));
assert.throws(()=>operateDream(w,'a',{op:'pause',id:shared.id,version:-1}),/changed/);operateDream(w,'a',{op:'withdraw',id:shared.id});assert.equal(shared.status,'paused');assert.deepEqual(shared.participants,['b']);
const legacy=JSON.parse(JSON.stringify(w));delete legacy.dreams;delete legacy.disclosures;delete legacy.relationships;delete legacy.preferenceSuggestions;normalizeWorld(legacy);assert.deepEqual(legacy.dreams,[]);assert(!JSON.stringify(visibleWorld(legacy,'b')).includes('private-A'));
console.log('PASS: frozen snapshots, reauthorization on memory edit, legacy privacy, invitation redaction, shared/private context separation, real-human evidence, stage symmetry, non-destructive fork, version guard, withdrawal, legacy normalization');
// EM instructions are private even inside an accepted shared branch.
shared.controls=[{id:'instruction',owner:'a',role:'user',text:'private instruction',time:1}];
assert(!JSON.stringify(visibleDreams(w,'b').find(d=>d.id===shared.id)).includes('private instruction'));
