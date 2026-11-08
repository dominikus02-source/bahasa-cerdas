/**
 * QA perilaku terender (fixture lokal BC_QA_FIXTURE=1, komponen asli, data palsu):
 *  - Tombol "Kembali ke Dasbor Guru" HANYA di /murid/beranda (guru/founder), tidak di turunan.
 *  - Drawer Guru: buka/tutup, target sentuh, grup, lebar, tanpa overflow.
 *  - Skala font 130% (setara font sistem besar) di 360px tanpa overflow/kontrol keluar layar.
 *  - Keyboard terbuka (viewport 360x400): input fokus terlihat & tombol Masuk terjangkau.
 * Jalankan: QA_BASE=http://127.0.0.1:3100 node scripts/qa-android-behavior.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.QA_BASE || "http://127.0.0.1:3100";
const OUT = process.env.QA_OUT || "qa-output/android-behavior";
mkdirSync(OUT, { recursive: true });
const results = [];
const check = (label, ok, detail = "") => { results.push({ label, status: ok ? "PASS" : "FAIL", detail }); console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? " — " + detail : ""}`); };

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
async function open(query, { w = 360, h = 760 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/qa-fixture/frame?${query}`, { waitUntil: "networkidle", timeout: 120000 }).catch(() => {});
  await page.waitForSelector("html[data-qa-ready='1']", { state: "attached", timeout: 60000 });
  await page.waitForTimeout(300);
  return { ctx, page };
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const outside = (page, sel, vw) => page.evaluate(([sel, vw]) => [...document.querySelectorAll(sel)].filter((el) => {
  if (el.closest("details:not([open])") && el.tagName !== "SUMMARY") return false; // tidak dirender saat tertutup
  const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > vw + 1 || r.left < -1);
}).map((el) => (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30)), [sel, vw]);

// 1. Tombol kembali ke Guru
const BACK = 'a[aria-label="Kembali ke dasbor guru"]';
for (const [view, path, expect] of [
  ["murid-founder", "/murid/beranda", true],
  ["murid-founder", "/murid/belajar", false],
  ["murid-founder", "/murid/profile", false],
  ["murid-founder", "/murid/beranda/detail", false],
  ["murid", "/murid/beranda", false],
]) {
  const { ctx, page } = await open(`view=${view}&path=${encodeURIComponent(path)}`);
  const n = await page.locator(BACK).count();
  check(`kembali-ke-guru ${view} ${path} → ${expect ? "tampil" : "tidak tampil"}`, (n === 1) === expect && n <= 1, `jumlah=${n}`);
  if (expect) {
    const box = await page.locator(BACK).boundingBox({ timeout: 5000 }).catch(() => null);
    check("kembali-ke-guru target sentuh ≥44px", !!box && box.height >= 44, box ? `${Math.round(box.width)}x${Math.round(box.height)}` : "");
    await page.screenshot({ path: `${OUT}/back-to-guru-${path.replaceAll("/", "_")}.png` });
  }
  await ctx.close();
}

// 2. Drawer Guru
for (const theme of ["light", "dark"]) {
  const { ctx, page } = await open(`view=guru-founder&theme=${theme}&path=/guru/kelasku`);
  const trigger = page.locator('button[aria-controls="guru-mobile-menu"]');
  check(`drawer ${theme}: tombol Menu ada`, (await trigger.count()) === 1);
  await trigger.click();
  const drawer = page.locator("#guru-mobile-menu");
  await drawer.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  check(`drawer ${theme}: terbuka (role=dialog, aria-modal)`, await drawer.isVisible() && (await drawer.getAttribute("aria-modal")) === "true");
  check(`drawer ${theme}: tombol Menu aria-expanded=true`, (await trigger.getAttribute("aria-expanded")) === "true");
  const box = await drawer.boundingBox();
  check(`drawer ${theme}: lebar ≤300px dan menyisakan latar`, !!box && box.width <= 300 && box.width < 360 - 40, box ? `${Math.round(box.width)}px` : "");
  const close = drawer.locator('button[aria-label="Tutup menu"]');
  const cb = await close.boundingBox();
  check(`drawer ${theme}: tombol tutup ≥44px`, !!cb && cb.width >= 44 && cb.height >= 44, cb ? `${Math.round(cb.width)}x${Math.round(cb.height)}` : "");
  const groups = await drawer.locator("button[aria-expanded]").evaluateAll((els) => els.map((e) => ({ label: e.getAttribute("aria-label"), open: e.getAttribute("aria-expanded") === "true" })));
  const opened = groups.filter((g) => g.open).map((g) => g.label);
  check(`drawer ${theme}: grup tertutup kecuali grup halaman aktif`, groups.length > 0 && opened.length <= 1, `terbuka=[${opened.join(",")}] dari ${groups.length}`);
  check(`drawer ${theme}: tidak ada footer dev "Guru Navigation V2"`, (await drawer.getByText("Guru Navigation V2").count()) === 0);
  check(`drawer ${theme}: tanpa overflow horizontal`, (await overflow(page)) <= 1);
  await page.screenshot({ path: `${OUT}/guru-drawer-${theme}.png` });
  if (groups.length) {
    const first = drawer.locator("button[aria-expanded]").first();
    const before = await first.getAttribute("aria-expanded");
    await first.click();
    check(`drawer ${theme}: grup dapat dibuka/ditutup`, (await first.getAttribute("aria-expanded")) !== before);
  }
  await close.click();
  await page.waitForTimeout(200);
  check(`drawer ${theme}: tertutup setelah Tutup`, (await page.locator("#guru-mobile-menu").count()) === 0);
  await ctx.close();
}

// 2b. Drawer Guru di APK lama: aturan injeksi lama `#guru-mobile-menu > div:last-child {display:none}`
// tidak boleh menyembunyikan isi menu (regresi laporan pengguna: drawer putih kosong).
for (const theme of ["light", "dark"]) {
  const { ctx, page } = await open(`view=guru-founder&theme=${theme}&path=/guru/kelasku`);
  await page.addStyleTag({ content: "#guru-mobile-menu > div:last-child {display:none!important;}" });
  await page.locator('button[aria-controls="guru-mobile-menu"]').click();
  const drawer = page.locator("#guru-mobile-menu");
  await drawer.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  const links = await drawer.locator("nav a, nav button[aria-expanded]").evaluateAll((els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).length);
  check(`drawer APK lama ${theme}: grup & tautan guru terlihat (bukan panel kosong)`, links >= 3, `terlihat=${links}`);
  await page.screenshot({ path: `${OUT}/guru-drawer-legacy-css-${theme}.png` });
  await ctx.close();
}

// 2c. Merek seragam di navbar atas Guru & Murid (logo + nama + tagline seperti Umum), tanpa panah kembali
for (const [view, path, home] of [["guru-founder", "/guru/beranda", "/guru/beranda"], ["guru", "/guru/kelasku", "/guru/beranda"], ["murid-founder", "/murid/beranda", "/murid/beranda"], ["murid", "/murid/belajar", "/murid/beranda"]]) {
  for (const theme of ["light", "dark"]) {
    const { ctx, page } = await open(`view=${view}&theme=${theme}&path=${encodeURIComponent(path)}`);
    const brand = page.locator('header a[aria-label="Beranda dasbor BahasaCerdas"]').first();
    const ok = (await brand.count()) === 1 && await brand.isVisible();
    const txt = ok ? await brand.innerText() : "";
    check(`merek ${view} ${theme}: logo+BahasaCerdas+tagline → ${home}`, ok && txt.includes("BahasaCerdas") && txt.includes("Dunia Bahasa Indonesia") && (await brand.getAttribute("href")) === home && (await brand.locator("img").count()) >= 1, txt.replace(/\s+/g, " "));
    check(`merek ${view} ${theme}: tanpa panah kembali di header`, (await page.locator('header a[aria-label="Kembali ke Beranda"]').count()) === 0);
    if (theme === "light") await page.screenshot({ path: `${OUT}/brand-${view}-${theme}.png` });
    await ctx.close();
  }
}

// 3. Skala font 130%
for (const view of ["guru-founder", "guru", "murid-founder", "murid", "login"]) {
  for (const w of [320, 360]) {
    const { ctx, page } = await open(`view=${view}&font=130`, { w });
    const ox = await overflow(page);
    const out = await outside(page, "header a, header button, header summary, nav a", w);
    check(`font 130% ${view} ${w}px: tanpa overflow & kontrol di dalam layar`, ox <= 1 && out.length === 0, `overflowX=${ox}${out.length ? " keluar=" + out.join(";") : ""}`);
    const sw = page.locator("[data-founder-dashboard-switcher] summary").first();
    if (await sw.count()) {
      await sw.click();
      await page.waitForTimeout(150);
      const menuOut = await outside(page, "[data-founder-dashboard-switcher] nav, [data-founder-dashboard-switcher] nav a", w);
      check(`font 130% ${view} ${w}px: menu peran Founder terbuka di dalam layar`, menuOut.length === 0, menuOut.join(";"));
      await page.screenshot({ path: `${OUT}/font130-${view}-${w}-founder-menu.png` });
      await sw.click();
    }
    await page.screenshot({ path: `${OUT}/font130-${view}-${w}.png` });
    await ctx.close();
  }
}

// 4. Keyboard terbuka (tinggi viewport ±400px)
for (const theme of ["light", "dark"]) {
  const { ctx, page } = await open(`view=login&theme=${theme}`, { w: 360, h: 400 });
  for (const sel of ["#email", "#password"]) {
    await page.locator(sel).focus();
    await page.waitForTimeout(150);
    const vis = await page.locator(sel).evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; });
    check(`keyboard ${theme}: ${sel} terlihat saat fokus`, vis);
  }
  const submit = page.getByRole("button", { name: /Masuk Sekarang/ });
  await submit.scrollIntoViewIfNeeded();
  const sb = await submit.boundingBox();
  check(`keyboard ${theme}: tombol Masuk terjangkau dengan gulir`, !!sb && sb.y >= 0 && sb.y + sb.height <= 400);
  check(`keyboard ${theme}: tanpa overflow horizontal`, (await overflow(page)) <= 1);
  await page.screenshot({ path: `${OUT}/keyboard-login-${theme}.png` });
  await ctx.close();
}

await browser.close();
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
const failed = results.filter((r) => r.status === "FAIL").length;
console.log(`RESULT ${results.length - failed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
