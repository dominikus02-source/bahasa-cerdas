import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const project="bahasa-cerdas";
const pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
if(pkg.name!==project)throw new Error('Unexpected project checkout');
if(process.env.BC_BUILD_ENV!=='staging')throw new Error('Set BC_BUILD_ENV=staging explicitly; this command is staging only');
if(process.versions.node.split('.')[0]!=='22')throw new Error('Use Node 22 (see .nvmrc)');
const cache=join(process.env.BC_NPM_CACHE || join(homedir(),'.cache','bc-build'),project,'staging',process.platform,process.arch,'node22','npm');
mkdirSync(cache,{recursive:true});
const npmCli=process.env.npm_execpath;
if(!npmCli)throw new Error('Run with npm run staging:build');
console.log(JSON.stringify({project,environment:'staging',node:process.versions.node,npmCache:cache}));
const total=Date.now();
for(const [step,args] of [['install',['ci','--prefer-offline','--no-audit','--no-fund','--cache',cache]],['build',['run','build']]]){
 const start=Date.now();
 const r=spawnSync(process.execPath,[npmCli,...args],{cwd:root,stdio:'inherit',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}});
 console.log(JSON.stringify({step,seconds:(Date.now()-start)/1000,status:r.status}));
 if(r.error)throw r.error;
 if(r.status!==0)process.exit(r.status||1);
}
console.log(JSON.stringify({step:'total-install-build',seconds:(Date.now()-total)/1000}));
console.log('Build only; no deployment or migration performed.');
