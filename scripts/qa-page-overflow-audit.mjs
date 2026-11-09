// Audit overflow horizontal & tumpang tindih header/nav bawah untuk SEMUA rute app/**/page.tsx.
// Setiap rute: (1) URL asli di server dev lokal (tanpa sesi; diterima hanya bila tidak
// redirect/error), lalu (2) bila halaman klien: komponen asli lewat fixture QA
// (BC_QA_FIXTURE=1) di replika shell Guru/Murid/Admin/Arena. API selalu dimock
// (tanpa sesi, tanpa DB, tanpa mutasi). Selain itu dilaporkan NOT_RENDERABLE + alasan.
// Matriks per rute: lebar 320/360/390/412 × font 100/130 × terang/gelap × JS sisipan APK lama
// (32 kombinasi; tema/font/lebar diubah di halaman yang sama, JS APK lama disisipkan
// setelah 16 kombinasi pertama).
// Pakai: QA_BASE=http://127.0.0.1:3100 node scripts/qa-page-overflow-audit.mjs
// Opsional: AUDIT_ROUTES=/guru/komunitas,/login  AUDIT_WORKERS=3
import { chromium } from "playwright";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.QA_BASE || "http://127.0.0.1:3100";
const OUT = process.env.QA_OUT || "/tmp/bc-overflow-audit";
const WORKERS = Number(process.env.AUDIT_WORKERS || 3);
mkdirSync(OUT, { recursive: true });

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (n !== "qa-fixture" && n !== "api") walk(p, out); }
    else if (n === "page.tsx") out.push(p);
  }
  return out;
}
const routeOf = (f) => ("/" + f.replace(/^app\/?/, "").replace(/\/?page\.tsx$/, "")).replace(/\/\([^)]+\)/g, "").replace(/^\/\([^)]+\)/, "") || "/";
const registry = readFileSync("app/qa-fixture/client-pages.tsx", "utf8");
const CLIENT = new Set([...registry.matchAll(/^\s+"(\/[^"]*)":/gm)].map((m) => m[1]));
const INVENTORY = walk("app").map((f) => ({ file: f, route: routeOf(f) })).sort((a, b) => a.route.localeCompare(b.route));
const ROUTES = process.env.AUDIT_ROUTES ? INVENTORY.filter((r) => process.env.AUDIT_ROUTES.split(",").includes(r.route)) : INVENTORY;

// JS injeksi APK lama (tanpa gerbang data-bc-native-styles) = perilaku APK yang terpasang.
const LEGACY_JS = readFileSync("scripts/fixtures/legacy-apk-premium-style.js", "utf8");
const COMBOS = [];
for (const w of [320, 360, 390, 412]) for (const font of [100, 130]) for (const theme of ["light", "dark"]) COMBOS.push({ w, font, theme });

const longName = "Musyawarah Guru Mata Pelajaran Bahasa Indonesia Kabupaten Bandung Barat Jawa";
const COMMUNITIES = [
  { id: "qa1", name: longName, type: "MGMP", description: "Forum berbagi perangkat ajar, " + "praktik baik ".repeat(12), province: "Jawa Barat", city: "Kabupaten Bandung Barat", memberCount: 1280, postCount: 342, isVerified: false, creator: null, avatarUrl: null },
  { id: "qa2", name: "KKG Gugus Melati Kecamatan Sukmajaya", type: "KKG", description: "Komunitas guru kelas.", province: "Jawa Barat", city: null, memberCount: 31, postCount: 4, isVerified: true, creator: { id: "u1" }, avatarUrl: null },
  { id: "qa3", name: "Komunitas_Penulis_Puisi_Remaja_Nusantara_TanpaSpasi", type: "PUBLIKASI", description: null, province: null, city: null, memberCount: 7, postCount: 0, isVerified: false, creator: { id: "u2" }, avatarUrl: null },
];
const MINE = COMMUNITIES.map((c, i) => ({ ...c, status: ["PENDING", "APPROVED", "REJECTED"][i], reviewNote: i === 2 ? "Nama belum sesuai pedoman. " + "Lengkapi dokumen ".repeat(6) : null, createdAt: "2026-11-01T03:00:00.000Z" }));
function mockApi(url, mode) {
  const p = new URL(url).pathname;
  if (p === "/api/komunitas/mine") return { communities: MINE };
  if (p === "/api/komunitas") return { communities: COMMUNITIES };
  return mode === "array" ? [] : {};
}

const ERROR_TEXT = /Halaman Tidak Ditemukan|Halaman ini bermasalah|Ups, ada gangguan|Terjadi Kesalahan|This page could not be found|Application error|Unhandled Runtime Error/;

async function measure(page, vw) {
  const r = await page.evaluate((vw) => {
    const de = document.documentElement;
    const clipped = (el) => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a); if (/(hidden|auto|scroll|clip)/.test(s.overflowX) && a.getBoundingClientRect().right <= vw + 1) return true; } return false; };
    const hidden = (el) => el.closest("details:not([open])") && el.tagName !== "SUMMARY";
    const offenders = [];
    for (const el of document.querySelectorAll("body *")) {
      if (hidden(el) || el.closest("[data-qa-controls], nextjs-portal, script, style")) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || r.left >= vw - 1) continue; // drawer tertutup di luar layar
      const s = getComputedStyle(el); if (s.visibility === "hidden" || s.display === "none" || s.opacity === "0") continue;
      if (r.right > vw + 1 && !clipped(el)) {
        const pr = el.parentElement?.getBoundingClientRect();
        if (pr && pr.right > vw + 1 && pr.left < vw - 1 && !clipped(el.parentElement)) continue; // laporkan yang terluar
        offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 4).join(".")} "${(el.textContent || "").trim().slice(0, 30)}" right=${Math.round(r.right)}`);
      }
    }
    const root = document.querySelector("[data-qa-page]") || document.querySelector("main") || document.body;
    const header = [...document.querySelectorAll("header")].find((h) => !root.contains(h) && /(fixed|sticky)/.test(getComputedStyle(h).position) && h.getBoundingClientRect().height > 0);
    let headerOverlap = false;
    const first = [...root.querySelectorAll("*")].find((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && r.width > 0 && !hidden(e); });
    if (header && first && scrollY === 0) {
      const fixedAnc = (e) => { for (let a = e; a && a !== root.parentElement; a = a.parentElement) if (getComputedStyle(a).position === "fixed") return true; return false; };
      if (!fixedAnc(first)) headerOverlap = first.getBoundingClientRect().top < header.getBoundingClientRect().bottom - 1;
    }
    // Tombol/tautan yang saling menimpa (mis. dua tombol kembali bertumpuk).
    const taps = [...document.querySelectorAll("a[href], button")].filter((e) => {
      if (hidden(e) || e.closest("[data-qa-controls], nextjs-portal")) return false;
      const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
      return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && r.left < vw && s.visibility !== "hidden" && s.opacity !== "0" && s.pointerEvents !== "none";
    });
    const layer = (e) => { for (let a = e; a && a !== document.body; a = a.parentElement) { const p = getComputedStyle(a).position; if (p === "fixed" || p === "sticky") return a; } return document.body; };
    const tapOverlap = [];
    for (let i = 0; i < taps.length && tapOverlap.length < 3; i++) for (let j = i + 1; j < taps.length; j++) {
      const a = taps[i], b = taps[j]; if (a.contains(b) || b.contains(a)) continue;
      if (layer(a) !== layer(b)) continue; // konten yang menggulir di bawah header/nav tetap itu wajar
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ix <= 0 || iy <= 0) continue;
      const small = Math.min(ra.width * ra.height, rb.width * rb.height);
      if ((ix * iy) / small > 0.3) tapOverlap.push(`"${(a.getAttribute("aria-label") || a.textContent || "").trim().slice(0, 20)}" × "${(b.getAttribute("aria-label") || b.textContent || "").trim().slice(0, 20)}"`);
    }
    return { overflow: de.scrollWidth - de.clientWidth, offenders: offenders.slice(0, 5), headerOverlap, tapOverlap };
  }, vw);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(120);
  r.bottomOverlap = await page.evaluate(() => {
    const nav = [...document.querySelectorAll("nav, [class*='bottom-0']")].find((n) => { const s = getComputedStyle(n); const r = n.getBoundingClientRect(); return s.position === "fixed" && r.bottom >= innerHeight - 2 && r.height > 30 && r.height < 120 && r.width > innerWidth * 0.6 && s.visibility !== "hidden" && s.display !== "none"; });
    const root = document.querySelector("[data-qa-page]") || document.querySelector("main");
    if (!nav || !root || root.contains(nav)) return false;
    const fixedAnc = (e) => { for (let a = e; a && a !== document.body; a = a.parentElement) { const p = getComputedStyle(a).position; if (p === "fixed" || p === "sticky") return true; } return false; };
    const kids = [...root.querySelectorAll("*")].filter((e) => { if (e.closest("details:not([open])") && e.tagName !== "SUMMARY") return false; const r = e.getBoundingClientRect(); return r.height > 0 && r.width > 0 && !fixedAnc(e) && getComputedStyle(e).visibility !== "hidden"; });
    const bottom = Math.max(...kids.map((e) => e.getBoundingClientRect().bottom), 0);
    const top = nav.getBoundingClientRect().top;
    return bottom > top + 1 ? Math.round(bottom - top) : false;
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  return r;
}

async function applyCfg(page, cfg) {
  await page.setViewportSize({ width: cfg.w, height: 780 });
  await page.evaluate((cfg) => {
    const h = document.documentElement;
    h.classList.toggle("dark", cfg.theme === "dark");
    h.classList.toggle("light", cfg.theme === "light");
    h.style.colorScheme = cfg.theme;
    h.classList.add("bc-android-app");
    h.setAttribute("data-bc-native-styles", "1");
    h.style.setProperty("-webkit-text-size-adjust", `${cfg.font}%`);
    h.style.setProperty("text-size-adjust", `${cfg.font}%`);
  }, cfg);
  await page.waitForTimeout(220);
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });

async function load(url, expectPath, mode, isFixture) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, serviceWorkers: "block", bypassCSP: true });
  const page = await ctx.newPage();
  await page.route("**/api/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockApi(r.request().url(), mode)) }));
  let status = 0;
  try {
    const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 180000 }).catch(() => null);
    status = resp?.status() ?? 0;
    if (isFixture) {
      await page.waitForSelector("html[data-qa-ready='1']", { state: "attached", timeout: 60000 });
      await page.waitForSelector("[data-qa-page], [data-qa-page-error], [data-qa-page-missing]", { state: "attached", timeout: 60000 });
    }
    await page.waitForTimeout(1200);
    const info = await page.evaluate((ERR) => {
      const err = document.querySelector("[data-qa-page-error], [data-qa-page-missing]");
      const root = document.querySelector("[data-qa-page]") || document.querySelector("main") || document.body;
      const text = document.body.innerText || "";
      return { error: err ? err.textContent.slice(0, 140) : (new RegExp(ERR).test(text) ? (text.match(new RegExp(ERR)) || [""])[0] : null), rendered: (root.innerText || "").trim().length > 0 || root.querySelector("canvas, img, svg") != null };
    }, ERROR_TEXT.source);
    const finalPath = new URL(page.url()).pathname;
    const reason = status >= 400 ? `HTTP ${status}` : finalPath !== expectPath ? `redirect ke ${finalPath}` : info.error ? `error: ${info.error}` : !info.rendered ? "konten kosong" : null;
    return { ctx, page, reason };
  } catch (e) {
    return { ctx, page, reason: String(e).split("\n")[0].slice(0, 140) };
  }
}

const results = [];
async function auditRoute({ route, file }) {
  const concrete = route.replace(/\[[^\]]+\]/g, "qa-1");
  const attempts = [];
  // 1) URL asli (tanpa sesi)
  attempts.push({ kind: "url", url: `${BASE}${concrete}`, expect: concrete });
  // 2) fixture (halaman klien)
  if (CLIENT.has(route)) {
    const fx = route.startsWith("/arena") ? `/qa-fixture/arena?route=${encodeURIComponent(route)}&app=1` : `/qa-fixture/frame?view=page&route=${encodeURIComponent(route)}&app=1`;
    const expect = route.startsWith("/arena") ? "/qa-fixture/arena" : "/qa-fixture/frame";
    attempts.push({ kind: "fixture", url: `${BASE}${fx}`, expect, mode: "object" }, { kind: "fixture", url: `${BASE}${fx}`, expect, mode: "array" });
  }
  const reasons = [];
  for (const a of attempts) {
    const { ctx, page, reason } = await load(a.url, a.expect, a.mode || "object", a.kind === "fixture");
    if (reason) { reasons.push(`${a.kind}${a.mode === "array" ? "([])" : ""}: ${reason}`); await ctx.close(); continue; }
    const fails = [];
    let shot = null;
    try {
    for (const legacy of [false, true]) {
      if (legacy) {
        // Sama seperti APK lama: JS dari mobile_premium_style.dart dijalankan apa adanya.
        const ok = await page.evaluate((js) => { (0, eval)(js); return !!document.getElementById("bc-android-premium-style-v2"); }, LEGACY_JS);
        if (!ok) throw new Error("injeksi CSS APK lama gagal");
        await page.waitForTimeout(300);
      }
      for (const cfg of COMBOS) {
        await applyCfg(page, cfg);
        const m = await measure(page, cfg.w);
        const bad = m.overflow > 1 || m.offenders.length || m.headerOverlap || m.bottomOverlap || m.tapOverlap.length;
        const tag = `${cfg.w}px f${cfg.font} ${cfg.theme}${legacy ? " +APK-lama" : ""}`;
        const name = `${route.replace(/[\/\[\]]+/g, "_").replace(/^_/, "") || "root"}-${cfg.w}-f${cfg.font}-${cfg.theme}${legacy ? "-legacy" : ""}`;
        if (bad) {
          fails.push({ tag, overflow: m.overflow, offenders: m.offenders, header: m.headerOverlap, bottom: m.bottomOverlap, taps: m.tapOverlap });
          if (fails.length === 1) { shot = `${OUT}/${name}.png`; await page.screenshot({ path: shot }).catch(() => {}); }
        } else if (cfg.w === 360 && cfg.font === 100 && cfg.theme === "light" && !legacy && !shot) {
          shot = `${OUT}/${name}.png`; await page.screenshot({ path: shot }).catch(() => {});
        }
      }
    }
    // Komunitas: tab kedua juga
    if (route === "/guru/komunitas") {
      await page.getByRole("button", { name: /Komunitas Saya/ }).click().catch(() => {});
      for (const cfg of COMBOS) { await applyCfg(page, cfg); const m = await measure(page, cfg.w); if (m.overflow > 1 || m.offenders.length || m.headerOverlap || m.bottomOverlap || m.tapOverlap.length) fails.push({ tag: `tab Saya ${cfg.w}px f${cfg.font} ${cfg.theme} +APK-lama`, ...m }); }
    }
    } catch (e) {
      reasons.push(`${a.kind}: pengukuran terputus (${String(e).split("\n")[0].slice(0, 100)})`);
      await ctx.close().catch(() => {});
      continue;
    }
    await ctx.close();
    const res = { route, file, via: a.kind + (a.mode === "array" ? "([])" : ""), status: fails.length ? "FAIL" : "PASS", combos: COMBOS.length * 2 + (route === "/guru/komunitas" ? COMBOS.length : 0), failed: fails.length, fails: fails.slice(0, 6), shot, skipped: reasons };
    console.log(`${fails.length ? "✗" : "✓"} ${route} [${res.via}] ${fails.length ? `${fails.length}/${res.combos} gagal: ` + JSON.stringify(fails[0]).slice(0, 300) : `${res.combos} kombinasi`}`);
    return res;
  }
  const res = { route, file, via: null, status: "NOT_RENDERABLE", reasons };
  console.log(`– ${route} ${reasons.join(" | ").slice(0, 260)}`);
  return res;
}

const queue = [...ROUTES];
await Promise.all(Array.from({ length: WORKERS }, async () => { while (queue.length) { const r = queue.shift(); try { results.push(await auditRoute(r)); } catch (e) { results.push({ route: r.route, file: r.file, status: "NOT_RENDERABLE", reasons: [String(e).slice(0, 140)] }); console.log(`– ${r.route} ${String(e).slice(0, 140)}`); } } }));
await browser.close();
results.sort((a, b) => a.route.localeCompare(b.route));
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
const n = (s) => results.filter((r) => r.status === s).length;
console.log(`\n${results.length} rute: ${n("PASS")} PASS, ${n("FAIL")} FAIL, ${n("NOT_RENDERABLE")} NOT_RENDERABLE`);
process.exit(n("FAIL") ? 1 : 0);
