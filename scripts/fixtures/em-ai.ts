import {generate} from './em-runtime';
export class AiError extends Error{constructor(public code:string,message:string,public status=400){super(message);}}
export const credential=async(_user:string)=>({key:'invalid-local-fixture',version:1});
export const aiStatus=async(_user:string)=>({configured:true,version:1,hint:'fixture'});
export const modelJson=async<T>(_key:unknown,system:string,input:unknown):Promise<T>=>generate(system,input);
export const safeError=(e:unknown)=>e instanceof AiError?{code:e.code,error:e.message}:{code:'REQUEST_FAILED',error:e instanceof Error?e.message:'Failed'};
