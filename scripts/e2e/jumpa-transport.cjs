/** Synthetic WebRTC staging test. Scoped, short-lived tokens come from JUMPA_MEDIA_TOKEN_FILE.
 * Never use production tokens. Does not test physical cameras, microphones or diverse networks.
 */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=process.cwd().replaceAll('\\','/');
const esbuild=require(path.join(root,'node_modules/esbuild'));
const {chromium}=require(path.join(root,'node_modules/playwright'));
(async()=>{
  const config=JSON.parse(fs.readFileSync(process.env.JUMPA_MEDIA_TOKEN_FILE,'utf8').replace(/^\uFEFF/,''));
  if(new URL(config.url).hostname!=='jumpa-staging.bahasacerdas.com'||!/^qa-jumpa-media-\d+$/.test(config.room)||config.tokens.length!==20)throw Error('Invalid staging fixture');
  const source=`import {Room,RoomEvent,Track} from 'livekit-client';
  window.__join=async(url,token,index)=>{
    const room=new Room({adaptiveStream:false,dynacast:true,videoCaptureDefaults:{resolution:{width:160,height:90,frameRate:5}},publishDefaults:{simulcast:true,videoEncoding:{maxBitrate:100000,maxFramerate:5},stopMicTrackOnMute:true,dtx:true,red:true}});
    window.__room=room;window.__resources=[];window.__reason=null;room.on(RoomEvent.Disconnected,r=>window.__reason=r);
    const subscribe=(pub,participant)=>{const n=Number(participant.identity.split('-').at(-1));pub.setSubscribed(pub.kind==='audio'||(pub.source==='camera'&&n<4));};
    room.on(RoomEvent.TrackPublished,subscribe);
    room.on(RoomEvent.TrackSubscribed,track=>{const element=track.attach();element.muted=true;Object.assign(element.style,{width:'160px',height:'90px'});document.body.append(element);void element.play().catch(()=>{});});
    const started=performance.now();await room.connect(url,token,{autoSubscribe:false});
    for(const p of room.remoteParticipants.values())for(const pub of p.trackPublications.values())subscribe(pub,p);
    const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;const ctx=canvas.getContext('2d');let f=0;const timer=setInterval(()=>{ctx.fillStyle=f++%2?'teal':'violet';ctx.fillRect(0,0,160,90);ctx.fillStyle='white';ctx.fillText('QA '+index+' '+f,10,30)},200);
    const video=canvas.captureStream(5);const ac=new AudioContext();await ac.resume();const oscillator=ac.createOscillator();oscillator.frequency.value=220+index*10;const gain=ac.createGain();gain.gain.value=0.005;const audio=ac.createMediaStreamDestination();oscillator.connect(gain).connect(audio);oscillator.start();
    window.__resources.push(()=>{clearInterval(timer);video.getTracks().forEach(t=>t.stop());audio.stream.getTracks().forEach(t=>t.stop());oscillator.stop();void ac.close();});
    await room.localParticipant.publishTrack(video.getVideoTracks()[0],{source:Track.Source.Camera});
    await room.localParticipant.publishTrack(audio.stream.getAudioTracks()[0],{source:Track.Source.Microphone});
    window.__joinMs=performance.now()-started;
    return window.__joinMs;
  };
  window.__toggle=async()=>{const p=window.__room.localParticipant;await p.setMicrophoneEnabled(false);await p.setCameraEnabled(false);await p.setMicrophoneEnabled(true);await p.setCameraEnabled(true);return p.isMicrophoneEnabled&&p.isCameraEnabled;};
  window.__stats=async()=>{const room=window.__room;let cameras=0,audios=0,frames=0,packets=0;for(const p of room.remoteParticipants.values())for(const pub of p.trackPublications.values()){if(!pub.isSubscribed||!pub.track)continue;if(pub.kind==='audio')audios++;if(pub.source==='camera')cameras++;const report=await pub.track.getRTCStatsReport();report?.forEach(s=>{if(s.type==='inbound-rtp'){frames+=s.framesDecoded||0;packets+=s.packetsReceived||0;}});}return {state:room.state,reason:window.__reason,peers:room.remoteParticipants.size,cameras,audios,frames,packets};};
  window.__close=async()=>{await window.__room?.disconnect();window.__resources?.forEach(f=>f());document.querySelectorAll('audio,video').forEach(e=>e.remove());};`;
  const out=await esbuild.build({stdin:{contents:source,loader:'js',resolveDir:root},bundle:true,write:false,define:{'process.env.NODE_ENV':'"production"'}});
  const server=http.createServer((req,res)=>{res.setHeader('content-type',req.url==='/test.js'?'application/javascript':'text/html');res.end(req.url==='/test.js'?out.outputFiles[0].text:'<html><body><script src="/test.js"></script></body></html>')});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let browser;const pages=[];
  try{
    browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows',...(process.platform==='linux'?['--no-sandbox']:[])]});
    for(let i=0;i<20;i++){const page=await browser.newPage({viewport:{width:360,height:640}});await page.goto('http://127.0.0.1:'+server.address().port);pages.push(page);}
    const joins=await Promise.allSettled(pages.map((page,i)=>page.evaluate(({url,token,i})=>window.__join(url,token,i),{url:config.url,token:config.tokens[i],i})));
    if(joins.some(r=>r.status!=='fulfilled'))throw Error('WebRTC join failed: '+joins.filter(r=>r.status!=='fulfilled').length+' of 20');
    const durations=joins.map(r=>r.value).sort((a,b)=>a-b);
    const settleMs=Number(process.env.JUMPA_MEDIA_SETTLE_MS||0);
    if(settleMs)await new Promise(r=>setTimeout(r,settleMs));
    const toggles=await Promise.allSettled(pages.map(page=>page.evaluate(()=>window.__toggle())));
    if(toggles.some(r=>r.status!=='fulfilled'||!r.value))throw Error('Microphone/camera toggle failed');
    let stats;
    for(let attempt=0;attempt<15;attempt++){
      stats=await Promise.all(pages.map(page=>page.evaluate(()=>window.__stats())));
      if(stats.every(s=>s.peers===19&&s.audios===19&&s.cameras>=3&&s.cameras<=4&&s.frames>0&&s.packets>0))break;
      await new Promise(r=>setTimeout(r,1000));
    }
    if(!stats.every(s=>s.peers===19&&s.audios===19&&s.cameras>=3&&s.cameras<=4&&s.frames>0&&s.packets>0))throw Error('Inbound media expectations failed: '+JSON.stringify(stats));
    await pages[19].evaluate(()=>window.__close());
    await pages[19].evaluate(({url,token})=>window.__join(url,token,19),{url:config.url,token:config.tokens[19]});
    await new Promise(r=>setTimeout(r,3000));
    const rejoined=await pages[19].evaluate(()=>window.__stats());
    if(rejoined.peers!==19||rejoined.frames<=0||rejoined.audios!==19)throw Error('Rejoin media failed');
    const report={settleMs,sessions:20,publishedCameras:20,publishedMicrophones:20,togglesPassed:20,joinP95Ms:Math.round(durations[18]),remoteCamerasPerSession:stats.map(s=>s.cameras),allRemoteMicrophonesReceived:stats.every(s=>s.audios===19),videoFramesDecoded:true,rejoinPassed:true,limitations:'Synthetic low-resolution media on one PC and staging; not 20 physical devices or production capacity.'};
    if(process.env.JUMPA_MEDIA_REPORT)fs.writeFileSync(process.env.JUMPA_MEDIA_REPORT,JSON.stringify(report,null,2));
    console.log(JSON.stringify(report));
  }finally{await Promise.allSettled(pages.map(p=>p.evaluate(()=>window.__close())));await browser?.close();server.close();}
})().catch(e=>{console.error(e.message.replace(/(access_token=)[^&\s]+/g,'$1[redacted]'));process.exitCode=1});
