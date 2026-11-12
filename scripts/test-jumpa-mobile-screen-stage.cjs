const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");

(async () => {
 const css = fs.readFileSync("components/jumpa/jumpa.css","utf8");
 const browser = await chromium.launch({headless:true, executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe"});
 try {
  for (const [width,height,orientation] of [[844,390,"row"],[390,844,"column"]]) {
   const page = await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true});
   await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><div class="jumpa-scope" style="width:100%;height:100vh"><div class="jumpa-screen-stage" data-screen-sharing="true" style="height:200px;width:100%;display:flex;gap:8px"><div class="jumpa-screen-primary" style="flex:1;min-width:0"><div class="jumpa-tile" data-screen="true" style="width:100%;height:100%"><video></video></div></div><div class="jumpa-strip"><div></div><div></div><div></div></div></div><nav class="jumpa-dock"><div class="jumpa-ctl"><button class="jumpa-key"></button><span class="jumpa-ctl-label">Mik</span></div></nav></div>');
   await page.addStyleTag({content:".jumpa-screen-stage{flex-direction:column}"});
   await page.addStyleTag({content:css});
   const r=await page.evaluate(() => {
    const stage=document.querySelector(".jumpa-screen-stage"), strip=document.querySelector(".jumpa-strip"), main=document.querySelector(".jumpa-screen-primary");
    return {direction:getComputedStyle(stage).flexDirection,screen:main.getBoundingClientRect().width,rail:strip.getBoundingClientRect().width,fit:getComputedStyle(document.querySelector('video')).objectFit,scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth};
   });
   assert.equal(r.direction,orientation);
   assert.equal(r.fit,"contain");
   assert.ok(r.scrollWidth<=r.viewport+1,"No horizontal overflow: "+JSON.stringify(r));
   if (orientation==="row") {assert.ok(r.rail<=110);assert.ok(r.screen>r.rail*3);}
   console.log("PASS", width+"x"+height, JSON.stringify(r));
   await page.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e); process.exitCode=1;});
