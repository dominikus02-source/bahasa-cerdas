const fs=require('fs'),os=require('os'),path=require('path'),http=require('http'),cp=require('child_process');
const esbuild=require('esbuild'); const {chromium}=require('playwright');
(async()=>{
 const js=(await esbuild.build({entryPoints:['components/jumpa/recording-safety.ts'],bundle:true,write:false,format:'esm',platform:'browser'})).outputFiles[0].text;
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/module.js'?'application/javascript':'text/html');res.end(req.url==='/module.js'?js:'<html><body>JUMPA QA</body></html>')});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 let failures=0;const results=[];
 for(let i=0;i<3;i++){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'jumpa-checkpoint-profile-'));
  let ctx;
  try{
   ctx=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
   let page=ctx.pages()[0]||await ctx.newPage();await page.goto(url);
   const id=await page.evaluate(async()=>{
    const mod=await import('/module.js');
    const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
    const g=canvas.getContext('2d');let n=0;const timer=setInterval(()=>{g.fillStyle=n++%2?'red':'blue';g.fillRect(0,0,320,180)},100);
    const stream=canvas.captureStream(15);const recorder=new MediaRecorder(stream,{mimeType:'video/webm'});
    mod.startRecordingSafetySegments(stream,console.error,750);
    window.__timer=timer;
    return true;
   });
   await page.waitForTimeout(3500);
   const escaped=profile.replaceAll("'","''");
   const pids=cp.execFileSync('powershell.exe',['-NoProfile','-Command',`Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" | Where-Object { $_.CommandLine -like '*${escaped}*' -and $_.CommandLine -notlike '*--type=*' } | Select-Object -ExpandProperty ProcessId`],{encoding:'utf8'}).trim().split(/\s+/).filter(Boolean);
   if(!pids.length)throw Error('NO_CHROME_PID');
   for(const pid of pids)cp.spawnSync('taskkill',['/PID',pid,'/T','/F'],{stdio:'ignore'});
   ctx=null;
   await new Promise(r=>setTimeout(r,800));
   ctx=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true});
   page=ctx.pages()[0]||await ctx.newPage();await page.goto(url);
   const archiveBytes=await page.evaluate(async()=>{const mod=await import('/module.js');const b=await mod.restoreLatestSafetyArchive();if(!b)throw Error('NO_COMPLETE_SEGMENT');return [...new Uint8Array(await b.arrayBuffer())]});
   const zip=await require('jszip').loadAsync(Buffer.from(archiveBytes));
   const entries=Object.keys(zip.files).filter(n=>n.endsWith('.webm'));
   if(!entries.length)throw Error('ZIP_NO_VIDEO');
   const bytes=await zip.files[entries[0]].async('nodebuffer');
   const out=path.join(os.tmpdir(),'jumpa-checkpoint-'+i+'.webm');fs.writeFileSync(out,Buffer.from(bytes));
   let probe='';try{probe=cp.execFileSync('ffprobe',['-v','error','-show_entries','format=duration,size','-of','default=noprint_wrappers=1',out],{encoding:'utf8'}).trim()}catch(e){probe='FFPROBE_FAILED '+e.message}
   let totalDuration=0;
   for(let j=0;j<entries.length;j++){
    const clip=await zip.files[entries[j]].async('nodebuffer');
    const clipPath=path.join(os.tmpdir(),'jumpa-checkpoint-'+i+'-'+j+'.webm');
    fs.writeFileSync(clipPath,clip);
    const duration=cp.execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',clipPath],{encoding:'utf8'}).trim();
    totalDuration+=Number(duration);
   }
   const ok=bytes.length>0&&!probe.includes('FAILED')&&Number.isFinite(totalDuration)&&totalDuration>=3.0;
   results.push({iteration:i+1,bytes:bytes.length,segments:entries.length,totalDuration,probe,ok});if(!ok)failures++;
  }catch(e){failures++;results.push({iteration:i+1,error:String(e),ok:false})}
  finally{if(ctx)await ctx.close().catch(()=>{});fs.rmSync(profile,{recursive:true,force:true})}
 }
 console.log(JSON.stringify({results,failures},null,2));server.close();process.exitCode=failures?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
