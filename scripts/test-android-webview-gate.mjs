/**
 * Uji perilaku (Chromium nyata) untuk migrasi gaya WebView Android:
 *  1. Skrip boot app/layout.tsx memasang html.bc-android-app +
 *     data-bc-native-styles HANYA bila jembatan BahasaCerdasMobile ada.
 *  2. Injeksi lama (mobile_premium_style.dart) tidak mengubah DOM sama sekali
 *     bila situs sudah menandai data-bc-native-styles="1", dan tetap bekerja
 *     (fallback) pada situs lama tanpa penanda.
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const layout = readFileSync("app/layout.tsx", "utf8");
const boot = JSON.parse(layout.match(/const ANDROID_APP_BOOT =\s*("(?:[^"\\]|\\.)*");/)[1]);
const dart = readFileSync("mobile/lib/core/constants/mobile_premium_style.dart", "utf8");
const legacy = dart.slice(dart.indexOf("r'''") + 4, dart.lastIndexOf("'''"));

let passed = 0, failed = 0;
const check = (label, ok) => { console.log(`${ok ? "PASS" : "FAIL"} ${label}`); ok ? passed++ : failed++; };

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage();
await page.route("https://www.bahasacerdas.com/**", (r) => r.fulfill({ contentType: "text/html", body: "<html><head></head><body><main><h2>x</h2></main></body></html>" }));

async function fresh(withBridge, marker) {
  await page.goto("https://www.bahasacerdas.com/login");
  if (withBridge) await page.evaluate(() => { window.BahasaCerdasMobile = { postMessage() {} }; });
  await page.evaluate(boot);
  if (marker === false) await page.evaluate(() => { const h = document.documentElement; h.classList.remove("bc-android-app"); h.removeAttribute("data-bc-native-styles"); });
}
const state = () => page.evaluate(() => ({
  cls: document.documentElement.className,
  marker: document.documentElement.getAttribute("data-bc-native-styles"),
  style: !!document.getElementById("bc-android-premium-style-v2"),
  brand: !!document.getElementById("bc-android-login-brand"),
  obs: !!window.__bcFounderLabelsObserver || !!window.__bcAndroidDrawerObserver,
}));

await fresh(false);
let s = await state();
check("boot: peramban web biasa tidak ditandai", !s.cls.includes("bc-android-app") && s.marker === null);

await fresh(true);
s = await state();
check("boot: jembatan Android → html.bc-android-app + data-bc-native-styles=1", s.cls.includes("bc-android-app") && s.marker === "1");
await page.evaluate(legacy);
s = await state();
check("injeksi lama dilewati pada situs baru (tanpa style/brand/observer)", !s.style && !s.brand && !s.obs);

await fresh(true, false);
await page.evaluate(legacy);
s = await state();
check("fallback: situs lama tanpa penanda tetap mendapat gaya lama", s.style && s.cls.includes("bc-android-app"));

await browser.close();
console.log(`RESULT ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
