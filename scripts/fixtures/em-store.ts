import {world} from './em-runtime';
import type {World} from '../../lib/world';
export async function loadWorld(_id:string){return {world:structuredClone(world),version:0};}
export async function mutate<T>(_id:string,fn:(w:World)=>T){const snapshot=structuredClone(world);const result=fn(snapshot);Object.assign(world,snapshot);return result;}
