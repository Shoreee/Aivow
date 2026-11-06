import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const out=await mkdtemp(join(tmpdir(),'aivow-em-check-'));
try{
 for(const entry of ['check-dream-domain','check-life-domain','check-em-control']){
 const file=join(out,entry+'.mjs');
 await build({entryPoints:['scripts/'+entry+'.ts'],bundle:true,platform:'node',format:'esm',outfile:file,plugins:[{name:'local-test-runtime',setup(b){b.onResolve({filter:/^\.\/store$/},()=>({path:resolve('scripts/fixtures/em-store.ts')}));b.onResolve({filter:/^\.\/ai$/},()=>({path:resolve('scripts/fixtures/em-ai.ts')}));}}]});
 const r=spawnSync(process.execPath,[file],{stdio:'inherit'});if(r.status!==0){process.exitCode=r.status||1;break;}
 }
}finally{await rm(out,{recursive:true,force:true});}
