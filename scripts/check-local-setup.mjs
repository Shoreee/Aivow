import assert from 'node:assert/strict';
import {cp,copyFile,mkdir,mkdtemp,readFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=new URL('../',import.meta.url),fixture=await mkdtemp(join(tmpdir(),'aivow-setup-check-'));
try{
 await mkdir(join(fixture,'scripts'));await copyFile(new URL('scripts/setup-local.mjs',root),join(fixture,'scripts/setup-local.mjs'));
 await cp(new URL('drizzle/',root),join(fixture,'drizzle'),{recursive:true});await symlink(fileURLToPath(new URL('node_modules/',root)),join(fixture,'node_modules'),'dir');
 await copyFile(new URL('.env.example',root),join(fixture,'.dev.vars'));
 const run=()=>spawnSync(process.execPath,['scripts/setup-local.mjs'],{cwd:fixture,encoding:'utf8',env:{...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_WRITE_LOGS:'false'}});
 const first=run();assert.equal(first.status,0,first.stderr+'\n'+first.stdout);
 const secret=await readFile(join(fixture,'.dev.vars'),'utf8');assert(/^AI_KEY_ENCRYPTION_SECRET=[A-Za-z0-9_-]{40,}$/m.test(secret));assert(!secret.includes('DEEPSEEK_API_KEY='));
 const second=run();assert.equal(second.status,0,second.stderr+'\n'+second.stdout);assert(second.stdout.includes('already exist'));assert.equal(await readFile(join(fixture,'.dev.vars'),'utf8'),secret);
 console.log('PASS: fresh clone local setup, empty-template secret creation, migrations and repeat-run data/key preservation. No cloud operations.');
}finally{await rm(fixture,{recursive:true,force:true});}
