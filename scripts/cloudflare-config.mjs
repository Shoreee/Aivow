// Pure config conversion: no account access, resource creation or deployment.
export function deploymentConfig(built,settings){
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(!uuid.test(settings.database_id||'')||settings.database_id==='00000000-0000-4000-8000-000000000000')throw Error('Set AIVOW_D1_DATABASE_ID to your new Cloudflare D1 database ID. No cloud database has been connected yet.');
 if(!/^[a-z][a-z0-9-]{1,62}$/.test(settings.worker_name||''))throw Error('Use a lowercase Worker name.');
 if(!/^[a-zA-Z0-9_-]{1,64}$/.test(settings.database_name||''))throw Error('Invalid D1 database name.');
 if(settings.worker_name==='aivow')throw Error('Use a new Worker name such as aivow-demo to preserve the older hosted version.');
 if(!built.main||!built.assets?.directory)throw Error('Build Aivow first: npm run build.');
 const config=structuredClone(built);
 config.name=config.topLevelName=settings.worker_name;
 if(settings.account_id){if(!/^[a-f0-9]{32}$/i.test(settings.account_id))throw Error('Invalid Cloudflare account ID.');config.account_id=settings.account_id;}else delete config.account_id;
 config.d1_databases=[{binding:'DB',database_name:settings.database_name,database_id:settings.database_id,migrations_dir:'../../drizzle'}];
 // Production is self-contained: no old hosted services or shared test keys.
 config.services=[];config.vars={DEEPSEEK_MODEL:'deepseek-flash'};
 config.workers_dev=true;config.preview_urls=false;
 return config;
}
