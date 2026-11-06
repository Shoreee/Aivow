import {DurableObject} from 'cloudflare:workers';
import {tickDream} from '../lib/dream-runner';
import {DREAM_LIMITS} from '../lib/dream';
export class DreamScheduler extends DurableObject {
 async schedule(worldId:string,dreamId:string){await this.ctx.storage.put('job',{worldId,dreamId});await this.ctx.storage.setAlarm(Date.now()+100);}
 async halt(){await this.ctx.storage.deleteAlarm();}
 async alarm(){const job=await this.ctx.storage.get<{worldId:string;dreamId:string}>('job');if(!job)return;try{if(await tickDream(job.worldId,job.dreamId))await this.ctx.storage.setAlarm(Date.now()+DREAM_LIMITS.intervalMs);}catch{await this.ctx.storage.deleteAlarm();}}
}

import {runAutoReply} from '../lib/auto-chat';
import type {AutoJob} from '../lib/conversation-types';
export class DemoChatScheduler extends DurableObject {
 async schedule(job:AutoJob){await this.ctx.storage.put('reply',job);await this.ctx.storage.setAlarm(Date.now()+100);}
 async alarm(){const job=await this.ctx.storage.get<AutoJob>('reply');if(!job)return;await runAutoReply(job);const current=await this.ctx.storage.get<AutoJob>('reply');if(current?.pendingId!==job.pendingId)await this.ctx.storage.setAlarm(Date.now()+100);else await this.ctx.storage.delete('reply');}
}
