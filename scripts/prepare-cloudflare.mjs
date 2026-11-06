import {readFile,writeFile} from 'node:fs/promises';
import {deploymentConfig} from './cloudflare-config.mjs';
const root=new URL('../',import.meta.url);
try{
 let settings;try{settings=JSON.parse(await readFile(new URL('deploy/cloudflare.local.json',root),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;settings=JSON.parse(await readFile(new URL('deploy/cloudflare.example.json',root),'utf8'));}
 settings.database_id=process.env.AIVOW_D1_DATABASE_ID||settings.database_id;
 settings.account_id=process.env.CLOUDFLARE_ACCOUNT_ID||settings.account_id;
 const built=JSON.parse(await readFile(new URL('dist/server/wrangler.json',root),'utf8'));
 const config=deploymentConfig(built,settings);
 await writeFile(new URL('dist/server/wrangler.aivow.json',root),JSON.stringify(config,null,2)+'\n');
 console.log('Prepared dist/server/wrangler.aivow.json. No database created, migrations run or code deployed.');
}catch(e){console.error(e.code==='ENOENT'?'Run npm run build first.':e.message);process.exitCode=1;}
