import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const project=fileURLToPath(new URL('../',import.meta.url));
const child=spawn(process.execPath,['--import',fileURLToPath(new URL('./sites-env.mjs',import.meta.url)),fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url)),'dev','--config',fileURLToPath(new URL('../dist/server/wrangler.json',import.meta.url)),'--local','--env-file',fileURLToPath(new URL('../.dev.vars',import.meta.url)),'--persist-to',fileURLToPath(new URL('../.wrangler/state',import.meta.url)),'--ip','0.0.0.0','--port','5173','--inspector-port','0'],{cwd:project,stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));
