const http=require('node:http');
const {build}=require('esbuild');
const {chromium}=require('playwright');
(async()=>{
 const js=(await build({entryPoints:['components/jumpa/recording-quota.ts'],bundle:true,write:false,format:'esm',platform:'browser'})).outputFiles[0].text;
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/quota.js'?'application/javascript':'text/html');res.end(req.url==='/quota.js'?js:'<html><body>quota test</body></html>')});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'chrome',headless:true});
 let failed=0;const results=[];
 try{
  const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
  for(const [name,usage,quota,nextBytes,expectReject] of [
   ['ample-space',0,1024*1024*1024,1024,true===false],
   ['over-90-percent',940*1024*1024,1024*1024*1024,1024,true],
   ['reserved-headroom',64*1024*1024-16*1024*1024,64*1024*1024,1024,true],
   ['invalid-size',0,1024*1024*1024,-1,true],
   ['missing-quota',0,0,1024,true],
  ]){
   const value=await page.evaluate(async({usage,quota,nextBytes})=>{
    Object.defineProperty(navigator,'storage',{configurable:true,value:{estimate:async()=>({usage,quota})}});
    const mod=await import('/quota.js');
    try{await mod.assertRecordingStorageAvailable(nextBytes);return 'accepted'}catch(e){return e.message}
   },{usage,quota,nextBytes});
   const ok=expectReject?value!=='accepted':value==='accepted';
   results.push({name,value,ok});if(!ok)failed++;
  }
  console.log(JSON.stringify({results,failed},null,2));
 }finally{await browser.close();server.close()}
 process.exitCode=failed?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
