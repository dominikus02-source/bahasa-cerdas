const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const dart=fs.readFileSync('mobile/lib/core/constants/mobile_premium_style.dart','utf8');
const js=dart.split("static const javascript = r'''")[1]?.split("'''")[0];
assert.ok(js,'WebView injection script must exist');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('https://www.bahasacerdas.com/guru/beranda',r=>r.fulfill({status:200,contentType:'text/html',body:`<meta name="viewport" content="width=device-width,initial-scale=1"><div style="display:flex;width:100%;gap:8px;align-items:center"><span style="width:44px">←</span><details data-founder-dashboard-switcher><summary style="width:216px"><svg></svg><span>Pindah Dasbor Founder</span></summary><nav style="position:absolute"><a href="/umum"><svg></svg>Dasbor Umum</a><a href="/guru/beranda"><svg></svg>Dasbor Guru</a><a href="/murid/beranda"><svg></svg>Dasbor Murid</a><a href="/admin"><svg></svg>Panel Admin</a></nav></details><span>🔔</span></div>`}));
  await page.goto('https://www.bahasacerdas.com/guru/beranda');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(js);
  const read=()=>page.evaluate(()=>({title:document.querySelector('summary span')?.textContent,labels:[...document.querySelectorAll('details nav a')].map(a=>a.textContent.trim()),summaryWidth:Math.round(document.querySelector('summary').getBoundingClientRect().width),scrollWidth:document.documentElement.scrollWidth}));
  let state=await read();console.log('initial',state);assert.equal(state.title,'FOUNDER');assert.deepEqual(state.labels,['UMUM','GURU','MURID','FOUNDER']);assert.ok(state.summaryWidth<=112);assert.ok(state.scrollWidth<=390);
  await page.evaluate(()=>{document.querySelector('details').innerHTML='<summary><span>Pindah Dasbor Founder</span></summary><nav><a href="/umum">Dasbor Umum</a><a href="/guru/beranda">Dasbor Guru</a><a href="/murid/beranda">Dasbor Murid</a><a href="/admin">Panel Admin</a></nav>'});
  await page.waitForFunction(()=>document.querySelector('summary span')?.textContent==='FOUNDER'&&document.querySelector('details nav a')?.textContent==='UMUM',{timeout:4000});
  state=await read();assert.deepEqual(state.labels,['UMUM','GURU','MURID','FOUNDER']);assert.equal(errors.length,0,JSON.stringify(errors));
  console.log('PASS Founder WebView old-server DOM, React re-render, mobile header, no JS errors');
  await page.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
