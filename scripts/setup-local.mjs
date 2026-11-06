import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=new URL('../',import.meta.url),runtime=new URL('.sites-runtime/',root);
await mkdir(runtime,{recursive:true});
const vars=new URL('.dev.vars',root);
let current='';try{current=await readFile(vars,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
const existing=(current.match(/^AI_KEY_ENCRYPTION_SECRET[ \t]*=[ \t]*(.*)$/m)?.[1]||'').trim().replace(/^['"]|['"]$/g,'');
if(!existing){
 if(/^AI_KEY_ENCRYPTION_SECRET[ \t]*=/m.test(current))current=current.replace(/^AI_KEY_ENCRYPTION_SECRET[ \t]*=.*$/m,'');
 await writeFile(vars,current.trimEnd()+'\nAI_KEY_ENCRYPTION_SECRET='+randomBytes(32).toString('base64url')+'\n',{mode:0o600});
 console.log('Created a local encryption secret in ignored .dev.vars. No DeepSeek key added.');
}else console.log('Preserved the existing local encryption secret.');

const config=new URL('wrangler.local-db.json',runtime);
await writeFile(config,JSON.stringify({name:'aivow-local',compatibility_date:'2026-11-01',d1_databases:[{binding:'DB',database_name:'aivow-local',database_id:'00000000-0000-4000-8000-000000000000',migrations_dir:'../drizzle'}]},null,2)+'\n');
const common=['node_modules/wrangler/bin/wrangler.js','d1'];
const flags=['--local','--config',fileURLToPath(config),'--persist-to',fileURLToPath(new URL('.wrangler/state',root))];
function run(args,capture=false){const result=spawnSync(process.execPath,[...common,...args,...flags],{cwd:fileURLToPath(root),encoding:'utf8',stdio:capture?'pipe':'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});if(result.status!==0)throw Error(capture?result.stderr:'Local D1 setup failed.');return result.stdout;}
const rows=JSON.parse(run(['execute','DB','--command',"SELECT name FROM sqlite_master WHERE type='table'",'--json'],true))[0].results;
const tables=new Set(rows.map(r=>r.name)),required=['aivow_users','aivow_sessions','aivow_worlds','aivow_ai_keys'];
if(required.every(name=>tables.has(name)))console.log('Local Aivow tables already exist; existing accounts and chats preserved.');
else if([...tables].some(name=>/^(aivow_|xuyu_)/.test(name)))throw Error('A partial or legacy database already exists. Back it up and review drizzle/ before applying migrations. No existing tables were changed.');
else{run(['migrations','apply','DB']);console.log('Initialized a fresh local D1 database.');}
console.log('Ready: npm run dev. User AI keys are configured in Me / Settings / AI.');
