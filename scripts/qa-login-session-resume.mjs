/** Real LoginPage; server verification mocked, no accounts or real auth tokens.
 * Tests startup navigation, not real Android cookie durability / Google login. */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const base=process.env.QA_BASE||"http://127.0.0.1:3100";
const out=process.env.QA_OUT||"qa-output/login-resume";mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});
let pass=0,fail=0;
const check=(n,ok)=>{console.log(`${ok?"PASS":"FAIL"} ${n}`);ok?pass++:fail++;};
for (const [name,status,user,extra,target] of [
 ["persisted-murid",200,{role:"MURID",isFounder:false},"","/murid/beranda"],
 ["persisted-guru",200,{role:"GURU",isFounder:false},"","/guru/beranda"],
 ["logged-out",200,null,"",null],
 ["expired-rejected",401,null,"",null],
 ["refresh-unavailable",503,null,"",null],
 ["oauth-feedback",200,{role:"MURID",isFounder:false},"&error=google_expired",null],
 ["recovery-feedback",200,{role:"MURID",isFounder:false},"&reset=success",null],
]) {
 let ctx=await browser.newContext({serviceWorkers:"block",viewport:{width:360,height:760}});
 // Synthetic non-auth cookie persisted across context recreation, just to model restart.
 if(name.startsWith("persisted")) {
  await ctx.addCookies([{name:"qa_restart_marker",value:"not-a-token",url:base,expires:Math.floor(Date.now()/1000)+3600}]);
  const state=await ctx.storageState();await ctx.close();ctx=await browser.newContext({storageState:state,serviceWorkers:"block",viewport:{width:360,height:760}});
 }
 const page=await ctx.newPage();let probes=0;
 await page.route("**/api/user/me?fresh=1",async route=>{probes++;await route.fulfill({status,contentType:"application/json",body:JSON.stringify({success:status===200,user})});});
 if(target) await page.route(base+target,route=>route.fulfill({status:200,contentType:"text/html",body:"<h1>QA verified-session destination (mock)</h1>"}));
 await page.goto(`${base}/qa-fixture/frame?view=login&app=1${extra}`,{waitUntil:"domcontentloaded",timeout:60000});
 if (target) await page.waitForURL(base+target, { timeout: 12000 }).catch(() => {});
 else await page.waitForSelector("#email",{timeout:12000});
 await page.waitForTimeout(250);
 if(target) {
  check(`${name}: verified existing session navigates without password`,new URL(page.url()).pathname===target&&probes===1);
 } else {
  check(`${name}: stays on login with email/password form`,new URL(page.url()).pathname==="/qa-fixture/frame"&&await page.locator("#email").isVisible()&&await page.locator("#password").isVisible());
  if(extra)check(`${name}: no automatic probe overrides feedback`,probes===0);
 }
 await page.screenshot({path:`${out}/${name}.png`});await ctx.close();
}
await browser.close();console.log(`RESULT ${pass} passed, ${fail} failed`);process.exitCode=fail?1:0;
