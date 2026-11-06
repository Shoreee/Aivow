import assert from 'node:assert/strict';
import {makePerson} from '../lib/world';
import {lifeStep,lifePosition,pauseLife,LIFE_POINTS} from '../lib/life';
const p=makePerson('walker');p.open=true;p.settings.behavior.autopilot=true;
lifeStep(p);assert(p.life);const l=p.life;assert(l.path.length>=2);assert.deepEqual(lifePosition(l,l.startedAt),l.path[0]);assert.deepEqual(lifePosition(l,l.arriveAt),l.path.at(-1));const halfway=lifePosition(l,(l.startedAt+l.arriveAt)/2);assert(halfway.every(Number.isFinite));pauseLife(p,true);const at=lifePosition(p.life!);assert.deepEqual(lifePosition(p.life!,Date.now()+900000),at);pauseLife(p,false);assert(!p.life!.pausedAt);p.open=false;lifeStep(p);assert(p.life!.pausedAt);assert(LIFE_POINTS.length>=20);assert(LIFE_POINTS.every(p=>p.lng>121.46&&p.lng<121.49&&p.lat>31.20&&p.lat<31.25));
console.log('PASS: public OSM locations, timed path interpolation, endpoint continuity, freeze and resume, disabled Life activity');
