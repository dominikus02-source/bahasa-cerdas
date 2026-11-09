/** Real ArenaHeader rendered by dev-only fixture, no auth bypass or production data. */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { readFileSync } from "node:fs";
const out = process.env.QA_OUT || "qa-output/arena-brand";
mkdirSync(out, { recursive: true });
let passed=0, failed=0;
function check(name, ok, details="") { console.log(`${ok ? "PASS" : "FAIL"} ${name} ${details}`); ok ? passed++ : failed++; }
const layout=readFileSync("app/arena/layout.tsx","utf8");
check("real Arena layout mounts ArenaHeader for both web and APK", layout.includes("<ArenaHeader") && !layout.includes("<ArenaBackButton") && layout.includes('homeHref={umum ? UMUM_HOME : "/murid/beranda"}'));
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || undefined});
for (const w of [320,360,454,768]) for (const theme of ["light","dark"]) for (const font of [100,130]) for (const app of [0,1]) {
 const ctx=await browser.newContext({viewport:{width:w,height:800},isMobile:true,hasTouch:true});
 const page=await ctx.newPage();
 await page.goto(`${process.env.QA_BASE || "http://127.0.0.1:3100"}/qa-fixture/frame?view=arena&path=/arena&theme=${theme}&font=${font}&app=${app}`,{waitUntil:"networkidle"});
 await page.waitForSelector("html[data-qa-ready='1']",{state:"attached"});
 const r=await page.evaluate(()=>{
   const h=document.querySelector("header");
   const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0;};
   const b=h.querySelector('a[aria-label="Beranda dasbor BahasaCerdas"]');
   const controls=[...h.querySelectorAll("a,button")].filter(vis);
   const imgs=[...b.querySelectorAll("img")].filter(vis);
   const rects=controls.map(e=>e.getBoundingClientRect());
   const overlaps=rects.some((r,i)=>rects.some((s,j)=>i<j&&Math.min(r.right,s.right)-Math.max(r.left,s.left)>1&&Math.min(r.bottom,s.bottom)-Math.max(r.top,s.top)>1));
   return {text:b.textContent,href:b.getAttribute("href"),logos:imgs.length,logo:imgs[0]?.getAttribute("src"),
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    outside:rects.some(r=>r.left<0||r.right>innerWidth+1),small:rects.some(r=>r.height<44),overlaps,
    bell:!!h.querySelector('[aria-label*="otifikasi"]'),theme:!!h.querySelector('[aria-label*="tema"], [aria-label*="Tema"]'),back:!!h.querySelector('a[aria-label*="Kembali"],button[aria-label*="Kembali"]')};
 });
 const tag=`Arena ${w}px ${theme} font${font} app${app}`;
 check(tag+" one canonical logo/name/tagline",r.logos===1&&r.text.includes("BahasaCerdas")&&r.text.includes("Dunia Bahasa Indonesia")&&r.href==="/murid/beranda"&&!r.back,JSON.stringify(r));
 check(tag+" bell/theme retained, ≥44px, no overlap/overflow",r.bell&&r.theme&&!r.small&&!r.overlaps&&!r.outside&&r.overflow<=1);
 if(app===1&&(w===320||w===454)) await page.screenshot({path:`${out}/arena-${w}-${theme}-f${font}.png`});
 await ctx.close();
}
await browser.close();
console.log(`RESULT ${passed} passed, ${failed} failed`);
process.exitCode=failed?1:0;
