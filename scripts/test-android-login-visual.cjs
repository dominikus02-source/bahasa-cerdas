#!/usr/bin/env node
"use strict";
/* Manual browser-only QA for the Android WebView CSS. No credentials used. */
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root,"mobile/lib/core/constants/mobile_premium_style.dart"), "utf8");
const javascript = source.match(/r'''([\s\S]*?)'''/)?.[1];
assert.ok(javascript, "Mobile WebView CSS script missing");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe"
  });
  try {
    const reports=[];
    for (const [width,height] of [[360,780],[390,844],[430,932],[844,390]]) {
      const page = await browser.newPage({ viewport:{width,height}, isMobile:true, hasTouch:true });
      const errors=[];
      page.on("pageerror", error=>errors.push(error.message));
      const response = await page.goto("https://www.bahasacerdas.com/login?bc_app=1", {waitUntil:"domcontentloaded",timeout:35000});
      await page.locator("form #email").waitFor({timeout:20000});
      await page.evaluate(javascript);
      const r = await page.evaluate(() => {
        const doc = document.documentElement;
        const card = document.querySelector("form")?.closest(".order-1")?.firstElementChild;
        const heading = card?.querySelector("h2");
        const label = card?.querySelector('label[for="email"]');
        const brand = document.getElementById("bc-android-login-brand");
        const style = document.getElementById("bc-android-premium-style-v2");
        const promo = [...document.querySelectorAll("p")].filter(p=>p.textContent.includes("Mengajar, membuat materi")
            && p.getBoundingClientRect().height > 0);
        const rgb = (str) => (str.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
        const luminance = (color) => {
          const channels = rgb(color).map(n => {const v=n/255;return v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4});
          return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];
        };
        const contrast = (a,b) => {
          const [l1,l2]=[luminance(a),luminance(b)].sort((a,b)=>b-a);
          return Number(((l1+.05)/(l2+.05)).toFixed(2));
        };
        const bg = getComputedStyle(card).backgroundColor;
        const fg = getComputedStyle(heading).color;
        const labelFg = getComputedStyle(label).color;
        return {
          width:innerWidth, height:innerHeight,
          docHeight:doc.scrollHeight,scrollWidth:doc.scrollWidth,
          brand:!!brand && brand.getBoundingClientRect().height>0,
          style:!!style,promoCount:promo.length,
          titleContrast:contrast(fg,bg),labelContrast:contrast(labelFg,bg),
          submitVisible:document.querySelector('button[type=submit]')?.getBoundingClientRect().height>0,
        };
      });
      reports.push({http:response?.status(), ...r, jsErrors:errors});
      await page.close();
    }
    for(const r of reports) {
      assert.equal(r.http,200,"login HTTP status");
      assert.equal(r.style,true,"native style injection");
      assert.equal(r.brand,true,"BC logo should be visible");
      assert.equal(r.promoCount,0,"no promotional cards in APK");
      assert.ok(r.scrollWidth<=r.width+1,"no horizontal overflow");
      assert.ok(r.titleContrast>=4.5 && r.labelContrast>=4.5,"login labels contrast >=4.5");
      assert.ok(r.submitVisible,"login submit visible");
      assert.equal(r.jsErrors.length,0,"no JavaScript page errors");
    }
    console.log("PASS Android login visual QA",JSON.stringify(reports,null,2));
  } finally {await browser.close()}
})().catch(e=>{console.error("FAIL Android login visual QA:",e.message);process.exitCode=1});
