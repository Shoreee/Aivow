import data from '../public/maps/life-data.json';
import {PLACES,type Person,type PlaceId} from './world';
export type LifeMotion={place:PlaceId;path:[number,number][];startedAt:number;arriveAt:number;pausedAt?:number;label:string;step:number};
export const LIFE_POINTS=data.points;
export function lifePosition(life:LifeMotion,now=Date.now()):[number,number]{const path=life.path;if(path.length<2)return path[0];const at=Math.max(0,Math.min(1,((life.pausedAt||now)-life.startedAt)/(life.arriveAt-life.startedAt)));const weights=path.slice(1).map((p,i)=>Math.hypot((p[0]-path[i][0])*.86,p[1]-path[i][1]));const length=weights.reduce((a,b)=>a+b,0);let remaining=at*length;for(let i=0;i<weights.length;i++){if(remaining<=weights[i]||i===weights.length-1){const fraction=weights[i]?remaining/weights[i]:0;return [path[i][0]+(path[i+1][0]-path[i][0])*fraction,path[i][1]+(path[i+1][1]-path[i][1])*fraction];}remaining-=weights[i];}return path.at(-1)!;}
export function pauseLife(p:Person,paused:boolean){if(!p.life)return;const now=Date.now();if(paused&&!p.life.pausedAt)p.life.pausedAt=now;else if(!paused&&p.life.pausedAt){const elapsed=now-p.life.pausedAt;p.life.startedAt+=elapsed;p.life.arriveAt+=elapsed;p.life.pausedAt=undefined;}}
export function lifeStep(p:Person){if(!p.open||!p.settings.behavior.autopilot){pauseLife(p,true);return;}pauseLife(p,false);const now=Date.now();if(p.life&&p.life.place===p.place&&now<p.life.arriveAt)return;
 const base=PLACES.find(s=>s.id===p.place)!;let path:[number,number][];
 if(p.life&&p.life.place===p.place)path=[...p.life.path].reverse();
 else if(p.place==='park'&&data.paths.length)path=[[base.lng,base.lat],...(data.paths[0] as [number,number][])];
 else{const points=data.points.filter(point=>point.kind===p.place).sort((a,b)=>Math.hypot(a.lng-base.lng,a.lat-base.lat)-Math.hypot(b.lng-base.lng,b.lat-base.lat));const next=points[0];path=next?[[base.lng,base.lat],[next.lng,next.lat]]:[[base.lng,base.lat],...(data.paths[0] as [number,number][])];}
 p.life={place:p.place,path,startedAt:now,arriveAt:now+40_000,label:base.label,step:(p.life?.step||0)+1};
}
