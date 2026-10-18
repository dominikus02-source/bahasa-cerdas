/**
 * E2E regresi: mengetik di semua input JUMPA (HP Android, tema gelap).
 * Tiga cara mengetik per input: keyboard.type, insertText, dan komposisi IME
 * (CDP Input.imeSetComposition → insertText, seperti Gboard/Samsung).
 * Plus uji "ketik sebelum hidrasi" dengan jam HP bergeser (dulu: React #418 →
 * DOM dibuang → input fokus hilang & ketikan lenyap).
 *
 * Butuh server JUMPA yang berjalan (flag nyala) + sesi guru. Tidak jalan di CI
 * (CI memakai scripts/test-jumpa-input.ts). Contoh lokal:
 *   BASE=http://localhost:3200 COOKIE='nama=nilai' CODE=<kode-ruang> \
 *     node scripts/e2e/jumpa-ketik.mjs
 * CHROME=/path/ke/chrome opsional.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3200";
const CODE = process.env.CODE ?? "";
const UA = "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, headless: true, args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
let failed = 0;
const ok = (label, cond, extra = "") => { console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` (${extra})` : ""}`); if (!cond) failed++; };

async function context(skewSec = 0) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, colorScheme: "dark", locale: "id-ID", permissions: ["camera", "microphone"] });
  if (process.env.COOKIE) {
    const host = new URL(BASE).hostname;
    await ctx.addCookies(process.env.COOKIE.split(";").map((kv) => { const [name, ...v] = kv.trim().split("="); return { name, value: v.join("="), domain: host, path: "/" }; }));
  }
  const p = await ctx.newPage();
  if (skewSec) await p.clock.install({ time: new Date(Date.now() + skewSec * 1000) });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  return { ctx, p, errors };
}

async function typeAll(p, loc, label) {
  const cdp = await p.context().newCDPSession(p);
  await loc.scrollIntoViewIfNeeded();
  await loc.tap(); await p.keyboard.type("Rapat"); await p.waitForTimeout(150);
  ok(`${label}: keyboard.type`, (await loc.inputValue()) === "Rapat", JSON.stringify(await loc.inputValue()));
  await loc.fill(""); await loc.tap(); await p.keyboard.insertText("Diskusi"); await p.waitForTimeout(150);
  ok(`${label}: insertText`, (await loc.inputValue()) === "Diskusi", JSON.stringify(await loc.inputValue()));
  await loc.fill(""); await loc.tap();
  for (const s of ["K", "Ka", "Kab", "Kaba", "Kabar"]) { await cdp.send("Input.imeSetComposition", { text: s, selectionStart: s.length, selectionEnd: s.length }); await p.waitForTimeout(30); }
  await cdp.send("Input.insertText", { text: "Kabar" }); await p.waitForTimeout(150);
  ok(`${label}: komposisi IME`, (await loc.inputValue()) === "Kabar", JSON.stringify(await loc.inputValue()));
  const fs = await loc.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  ok(`${label}: font ≥ 16px (Safari iOS tidak zoom)`, fs >= 16, `${fs}px`);
  await loc.fill("");
}

// 1. /jumpa — kode ruang, topik ruang guru, komunitas.
{
  const { ctx, p, errors } = await context();
  await p.goto(`${BASE}/jumpa`, { waitUntil: "networkidle" });
  await typeAll(p, p.locator("#jumpa-code"), "/jumpa kode ruang");
  await typeAll(p, p.getByLabel("Topik ruang"), "/jumpa topik ruang guru");
  const sel = p.getByLabel("Komunitas");
  ok("/jumpa komunitas: bisa dipilih", (await sel.locator("option").count()) >= 1);
  ok("/jumpa tanpa galat hidrasi", errors.length === 0, errors.join(" | ").slice(0, 200));
  await ctx.close();
}

// 2. Ketik sebelum hidrasi selesai, jam HP bergeser ±90 detik, CPU lambat.
for (const skew of [90, -90]) {
  const { ctx, p, errors } = await context(skew);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 20 });
  await p.addInitScript(() => {
    const iv = setInterval(() => {
      const el = document.querySelector('[aria-label="Topik ruang"]');
      if (!el || el.getBoundingClientRect().height === 0) return;
      el.focus();
      if (document.activeElement === el) { window.__first = el; clearInterval(iv); }
    }, 5);
  });
  await p.goto(`${BASE}/jumpa`, { waitUntil: "commit" });
  await p.waitForFunction(() => window.__first, null, { timeout: 120000, polling: 10 });
  for (const ch of "Rapat MGMP") await cdp.send("Input.insertText", { text: ch });
  await p.waitForTimeout(5000);
  const r = await p.evaluate(() => ({ v: document.querySelector('[aria-label="Topik ruang"]')?.value, same: window.__first?.isConnected, focus: document.activeElement?.getAttribute("aria-label") }));
  ok(`Ketik sebelum hidrasi (jam ${skew > 0 ? "+" : ""}${skew} dtk): teks tetap`, r.v === "Rapat MGMP" && r.same && r.focus === "Topik ruang", JSON.stringify(r));
  ok(`Ketik sebelum hidrasi (jam ${skew > 0 ? "+" : ""}${skew} dtk): tanpa React #418`, !errors.some((e) => e.includes("418")), errors.join(" | ").slice(0, 160));
  await ctx.close();
}

// 3. /jumpa/jadwal — judul, tanggal, jam, durasi, cari orang.
{
  const { ctx, p, errors } = await context();
  await p.goto(`${BASE}/jumpa/jadwal`, { waitUntil: "networkidle" });
  await typeAll(p, p.getByLabel("Judul"), "/jumpa/jadwal judul");
  await typeAll(p, p.getByLabel("Undang orang tertentu (opsional)"), "/jumpa/jadwal cari orang");
  const date = p.getByLabel("Tanggal"); await date.fill("2030-01-15");
  ok("/jumpa/jadwal tanggal", (await date.inputValue()) === "2030-01-15");
  const time = p.getByLabel("Jam (WIB)"); await time.fill("14:30");
  ok("/jumpa/jadwal jam", (await time.inputValue()) === "14:30");
  const dur = p.getByRole("radio").nth(1); await dur.tap();
  ok("/jumpa/jadwal durasi", (await dur.getAttribute("aria-checked")) === "true");
  ok("/jumpa/jadwal tanpa galat", errors.length === 0, errors.join(" | ").slice(0, 200));
  await ctx.close();
}

// 4. Di dalam ruang — obrolan (+ Enter saat komposisi tidak mengirim) & laporan.
if (CODE) {
  const { ctx, p, errors } = await context();
  await p.goto(`${BASE}/jumpa/${CODE}`, { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /Gabung sekarang/ }).tap();
  await p.getByRole("button", { name: /^Obrolan/ }).first().waitFor({ timeout: 60000 });
  await p.getByRole("button", { name: /^Obrolan/ }).first().tap();
  const chat = p.getByLabel("Tulis pesan");
  await typeAll(p, chat, "Ruang: obrolan");
  const cdp = await ctx.newCDPSession(p);
  await chat.tap();
  await cdp.send("Input.imeSetComposition", { text: "hal", selectionStart: 3, selectionEnd: 3 });
  await chat.evaluate((el) => el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 229, isComposing: true, bubbles: true })));
  await p.waitForTimeout(400);
  ok("Ruang: Enter saat komposisi tidak mengirim", (await p.locator(".jumpa-bubble").count()) === 0 || (await chat.inputValue()).length > 0);
  await cdp.send("Input.insertText", { text: "halo" }); await chat.fill("");
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: "Lainnya" }).tap();
  await p.getByRole("menuitem", { name: /Laporkan masalah/ }).tap();
  await typeAll(p, p.locator("textarea").last(), "Ruang: laporan");
  ok("Ruang tanpa galat halaman", errors.length === 0, errors.join(" | ").slice(0, 200));
  await ctx.close();
} else {
  console.log("- Lewati uji di dalam ruang (set CODE=<kode ruang>)");
}

await browser.close();
console.log(`\n${failed ? `GAGAL: ${failed}` : "Semua lulus"}`);
process.exit(failed ? 1 : 0);
