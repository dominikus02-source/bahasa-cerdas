import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
const cache=process.env.BC_NPM_CACHE || join(homedir(),'.cache','bc-staging','npm');
mkdirSync(cache,{recursive:true});
const npm=process.platform==='win32'?'npm.cmd':'npm';
for(const args of [['ci','--prefer-offline','--no-audit','--no-fund','--cache',cache],['run','build']]){
 const start=Date.now();
 const r=spawnSync(npm,args,{stdio:'inherit',shell:process.platform==='win32',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}});
 console.log(JSON.stringify({step:args[0],seconds:(Date.now()-start)/1000,status:r.status}));
 if(r.error)throw r.error;
 if(r.status!==0)process.exit(r.status||1);
}
console.log('Staging build complete. Compiler cache retained. No deployment performed.');
