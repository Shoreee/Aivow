import type {World} from '../../lib/world';
export let world:World;
export const reset=(next:World)=>{world=next;};
export let generate:(system:string,input:any)=>Promise<any>=async()=>{throw Error('Set a model fixture');};
export const model=(fn:typeof generate)=>{generate=fn;};
