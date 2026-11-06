import assert from 'node:assert/strict';
import {readFile,writeFile,rm,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {deploymentConfig} from './cloudflare-config.mjs';
const root=new URL('../',import.meta.url),fixture={worker_name:'aivow-config-check',database_name:'aivow-check-db',database_id:'11111111-1111-4111-8111-111111111111'};
const built=JSON.parse(await readFile(new URL('dist/server/wrangler.json',root),'utf8'));
assert.throws(()=>deploymentConfig(built,{...fixture,database_id:''}),/No cloud database/);
assert.throws(()=>deploymentConfig(built,{...fixture,database_id:'00000000-0000-4000-8000-000000000000'}),/No cloud database/);
assert.throws(()=>deploymentConfig(built,{...fixture,worker_name:'aivow'}),/older hosted/);
const config=deploymentConfig({...built,vars:{DEEPSEEK_API_KEY:'fixture-never-export',AI_KEY_ENCRYPTION_SECRET:'fixture-never-export'},services:[{binding:'OLD_SERVICE',service:'old'}]},fixture);
assert.equal(config.d1_databases[0].binding,'DB');assert.equal(config.d1_databases[0].migrations_dir,'../../drizzle');assert.deepEqual(config.services,[]);assert(!JSON.stringify(config).includes('fixture-never-export'));
assert.deepEqual(config.durable_objects.bindings.map(b=>b.class_name),['DreamScheduler','DemoChatScheduler']);
assert(config.migrations.every(m=>m.new_sqlite_classes?.length));
const {readdir}=await import('node:fs/promises');
const migrations=(await readdir(new URL('drizzle/',root))).filter(f=>/^\d{4}_.*\.sql$/.test(f)).sort();
const sql=(await Promise.all(migrations.map(f=>readFile(new URL('drizzle/'+f,root),'utf8')))).join('\n');
const migration=spawnSync('python3',['-c',"import sqlite3,sys; db=sqlite3.connect(':memory:'); db.executescript(sys.stdin.read()); assert {r[0] for r in db.execute(\"SELECT name FROM sqlite_master WHERE type='table'\")} >= {'aivow_users','aivow_sessions','aivow_worlds','aivow_ai_keys'}; print('PASS: clean D1 SQLite schema')"],{input:sql,encoding:'utf8'});
assert.equal(migration.status,0,migration.stderr);process.stdout.write(migration.stdout);
const path=new URL('dist/server/wrangler.check.json',root),out=await mkdtemp(join(tmpdir(),'aivow-cloudflare-check-'));
try{
 await writeFile(path,JSON.stringify(config));
 const result=spawnSync(process.execPath,[fileURLToPath(new URL('node_modules/wrangler/bin/wrangler.js',root)),'deploy','--dry-run','--config',fileURLToPath(path),'--outdir',out],{cwd:fileURLToPath(root),encoding:'utf8',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
 assert.equal(result.status,0,result.stderr+'\n'+result.stdout);console.log('PASS: offline Worker bundle check, D1 binding, SQLite alarms, separate target and no inherited keys. No resources created or deployed.');
}finally{await rm(path,{force:true});await rm(out,{recursive:true,force:true});}
