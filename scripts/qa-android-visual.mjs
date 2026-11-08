/**
 * QA visual terender (lokal) untuk fixture app/qa-fixture (BC_QA_FIXTURE=1).
 * Memeriksa: overflow horizontal, tumpang-tindih kontrol header, label
 * pemilih peran (tanpa "Dasbor"/"Panel"), target sentuh header >= 40px,
 * nav bawah tidak menutupi konten akhir. Menyimpan tangkapan layar.
 * Jalankan: QA_BASE=http://127.0.0.1:3100 node scripts/qa-android-visual.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.QA_BASE || "http://127.0.0.1:3100";
const OUT = process.env.QA_OUT || "qa-output/android-visual";
const VIEWS = (process.env.QA_VIEWS || "guru-founder,guru,murid-founder,murid,login").split(",");
const SIZES = [[320, 720], [360, 760], [390, 844], [412, 915], [430, 932], [768, 1024], [740, 360]];
const THEMES = ["light", "dark"];
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const results = [];
for (const view of VIEWS) for (const theme of THEMES) for (const [w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 768, hasTouch: true, colorScheme: theme });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 160)));
  await page.goto(`${BASE}/qa-fixture/frame?view=${view}&theme=${theme}&app=1`, { waitUntil: "networkidle", timeout: 120000 }).catch(() => {});
  await page.waitForSelector("html[data-qa-ready='1']", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(300);
  const m = await page.evaluate((vw) => {
    const doc = document.documentElement;
    const overflowX = doc.scrollWidth - doc.clientWidth;
    const header = document.querySelector("header");
    const overlaps = [];
    const small = [];
    if (header) {
      const items = [...header.querySelectorAll("a,button,summary")].filter((el) => {
        const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.visibility !== "hidden";
      });
      const rects = items.map((el) => ({ el, r: el.getBoundingClientRect(), label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30) }));
      for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i], b = rects[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
        const iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
        if (ix > 1 && iy > 1) overlaps.push(`${a.label} × ${b.label}`);
      }
      for (const { r, label } of rects) {
        if (r.right > vw + 1 || r.left < -1) overlaps.push(`${label} keluar layar`);
        if (Math.min(r.width, r.height) < 40) small.push(`${label}:${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }
    const switcher = document.querySelector("details[data-founder-dashboard-switcher]");
    const switcherText = switcher ? switcher.textContent.replace(/\s+/g, " ").trim() : null;
    const nav = document.querySelector("nav.bc-mobile-nav, nav[aria-label*='Navigasi']");
    const contentEnd = document.querySelector("[data-qa-content] > :last-child");
    let navCovers = false;
    if (nav && contentEnd && getComputedStyle(nav).position === "fixed" && getComputedStyle(nav).display !== "none") {
      window.scrollTo(0, doc.scrollHeight);
      const n = nav.getBoundingClientRect(), c = contentEnd.getBoundingClientRect();
      navCovers = c.bottom > n.top + 1;
    }
    const loginHero = document.querySelector("[data-bc-login='hero']");
    return {
      overflowX, overlaps, small, switcherText, navCovers,
      dasbor: switcherText ? /Dasbor|Panel/.test(switcherText) : false,
      loginHeroVisible: loginHero ? getComputedStyle(loginHero).display !== "none" : null,
      loginFitsNoScroll: document.querySelector("[data-bc-login='panel']") ? doc.scrollHeight <= window.innerHeight + 1 : null,
    };
  }, w);
  const name = `${view}-${theme}-${w}x${h}`;
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  const fail = [];
  if (m.overflowX > 1) fail.push(`overflowX=${m.overflowX}`);
  if (m.overlaps.length) fail.push(`overlap:${m.overlaps.join(";")}`);
  if (m.dasbor) fail.push("label Dasbor/Panel");
  if (m.navCovers) fail.push("nav bawah menutupi konten");
  if (m.loginHeroVisible) fail.push("hero login tampil di app");
  if (errors.length) fail.push(`pageerror:${errors.join("|")}`);
  results.push({ name, view, theme, w, h, status: fail.length ? "FAIL" : "PASS", fail, warn: { smallTargets: m.small, loginFitsNoScroll: m.loginFitsNoScroll }, switcherText: m.switcherText });
  await ctx.close();
}
await browser.close();
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
const failed = results.filter((r) => r.status === "FAIL");
for (const r of results) console.log(`${r.status} ${r.name}${r.fail.length ? " — " + r.fail.join(", ") : ""}${r.warn.smallTargets.length ? " [kecil:" + r.warn.smallTargets.join(",") + "]" : ""}${r.warn.loginFitsNoScroll === false ? " [login perlu gulir]" : ""}`);
console.log(`RESULT ${results.length - failed.length} passed, ${failed.length} failed`);
if (failed.length) process.exitCode = 1;
