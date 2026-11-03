/** Home UI regression with mocked navigation/API. Not an authenticated E2E test. Run after build with CHROME set if needed. */
const fs = require('fs');
const path = require('path');
const artifacts=process.env.JUMPA_QA_DIR||fs.mkdtempSync(path.join(require('os').tmpdir(),'jumpa-home-qa-'));fs.mkdirSync(artifacts,{recursive:true});
const root = process.cwd().replaceAll("\\", "/");
const esbuild = require(path.join(root,'node_modules/esbuild'));
const http = require('http');
(async()=>{
const data={effective:'GURU',isJunior:false,rooms:[{code:'abc-defg-hjk',title:'Diskusi pembelajaran Bahasa Indonesia',kind:'GURU',mode:'MEETING',status:'LIVE',mine:true}],groups:[],communities:[],canSeePanel:false,plan:null,trialLimits:{maxParticipants:150,maxDurationMin:120}};
const source=`import React from 'react';import{createRoot}from'react-dom/client';import Home from '${root}/components/jumpa/JumpaHome.tsx';window.__data=${JSON.stringify(data)};createRoot(document.getElementById('root')).render(<Home data={window.__data} displayName="Rina Sari" dashboardHref="/guru/beranda"/>);`;
const out=await esbuild.build({stdin:{contents:source,loader:'tsx',resolveDir:root},bundle:true,write:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'qa-navigation',setup(b){b.onResolve({filter:/^next\/(link|navigation)$/},a=>({path:a.path,namespace:'qa'}));b.onLoad({filter:/.*/,namespace:'qa'},a=>({contents:a.path==='next/link'?`import React from 'react';export default function Link(p){return React.createElement('a',p,p.children)}`:`export function useRouter(){return {push(url){window.__navigate=url}}}`,resolveDir:root}));}}]});
const cssfiles=fs.readdirSync(path.join(root,'.next/static/chunks')).filter(f=>f.endsWith('.css'));
const css=cssfiles.map(f=>fs.readFileSync(path.join(root,'.next/static/chunks',f),'utf8')).join('\n');
const html=`<html lang="id" class="dark"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><body><div id="root"></div><script src="/qa.js"></script></body></html>`;
const server=http.createServer((req,res)=>{res.setHeader('content-type',req.url==='/qa.js'?'application/javascript':'text/html');res.end(req.url==='/qa.js'?out.outputFiles[0].text:html)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {chromium}=require(path.join(root,'node_modules/playwright'));
let browser;
try{
browser=await chromium.launch({executablePath:process.env.CHROME||undefined,headless:true,args:process.platform==='linux'?['--no-sandbox','--no-zygote','--single-process','--disable-gpu','--disable-software-rasterizer']:[]});
for(const width of [360,1280]){
const page=await browser.newPage({viewport:{width,height:900},colorScheme:'dark'});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.getByRole('heading',{name:'Mulai ruang baru'}).waitFor();
if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('horizontal overflow '+width);
await page.getByLabel('Topik ruang').fill('Diskusi cerpen');if(await page.getByLabel('Topik ruang').inputValue()!=='Diskusi cerpen')throw Error('input');
await page.getByLabel('Kode atau tautan ruang').fill('abc-defg-hjk');await page.getByRole('button',{name:'Gabung',exact:true}).click();if(await page.evaluate(()=>window.__navigate)!=='/jumpa/abc-defg-hjk')throw Error('navigation');
await page.evaluate(()=>{window.__calls=[];window.fetch=async(url,opts)=>{window.__calls.push(JSON.parse(opts.body));return {ok:true,json:async()=>({url:'/jumpa/abc-defg-hjk'})}}});
await page.getByRole('button',{name:'Mulai sekarang'}).click();await page.waitForFunction(()=>window.__calls.length===1);const calls=await page.evaluate(()=>window.__calls);if(calls[0].kind!=='GURU'||calls[0].title!=='Diskusi cerpen')throw Error('create payload');
if(errors.length)throw Error(errors.join('\n'));await page.screenshot({animations:'disabled',path:path.join(artifacts,'home-'+width+'.png'),fullPage:true});console.log('PASS viewport '+width+': layout, input, join, create, no page errors');
}
console.log('Screenshots: '+artifacts);
}finally{await browser?.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
