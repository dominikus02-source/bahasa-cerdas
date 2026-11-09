// Audit overflow horizontal & tumpang tindih header/nav bawah untuk halaman klien
// Guru/Murid yang bisa dirender fixture QA (BC_QA_FIXTURE=1). API dimock (tanpa sesi,
// tanpa DB). Pakai: QA_BASE=http://127.0.0.1:3100 node scripts/qa-page-overflow-audit.mjs
// Opsional: AUDIT_ROUTES=/guru/komunitas,/murid/belajar  AUDIT_FULL=1 (matriks penuh semua rute)
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const BASE = process.env.QA_BASE || "http://127.0.0.1:3100";
const OUT = process.env.QA_OUT || "/tmp/bc-overflow-audit";
mkdirSync(OUT, { recursive: true });

const registry = readFileSync("app/qa-fixture/client-pages.tsx", "utf8");
const ALL = [...registry.matchAll(/^\s+"(\/[^"]+)":/gm)].map((m) => m[1]);
const ROUTES = process.env.AUDIT_ROUTES ? process.env.AUDIT_ROUTES.split(",") : ALL;
const dart = readFileSync("mobile/lib/core/constants/mobile_premium_style.dart", "utf8");
const LEGACY_JS = dart.slice(dart.indexOf("r'''") + 4, dart.lastIndexOf("'''"));

const FULL = [];
for (const w of [320, 360, 412]) for (const font of [100, 130]) for (const theme of ["light", "dark"]) for (const legacy of [false, true]) FULL.push({ w, font, theme, legacy });
const QUICK = [
  { w: 360, font: 100, theme: "light", legacy: false },
  { w: 320, font: 130, theme: "dark", legacy: true },
  { w: 390, font: 130, theme: "light", legacy: true },
  { w: 412, font: 100, theme: "dark", legacy: false },
];
const FULL_ROUTES = new Set(["/guru/komunitas"]);
// Tidak bisa dirender setia di fixture (dilaporkan, bukan diklaim lulus).
const FULLSCREEN_GAMES = ["benar-salah", "bermain-kata", "irama-kata", "lari-kata", "menara", "susun-kata", "tebak-kata", "teka-teki-silang"];
const NOT_RENDERABLE = Object.fromEntries([
  ...FULLSCREEN_GAMES.map((g) => [`/guru/game/${g}`, "gim layar penuh: arena.css/game-env.css tidak dimuat di fixture"]),
  ["/guru/pengaturan/premium", "halaman hanya redirect"],
  ["/murid/game", "halaman hanya redirect"],
]);

const longName = "Musyawarah Guru Mata Pelajaran Bahasa Indonesia Kabupaten Bandung Barat Jawa";
const COMMUNITIES = [
  { id: "qa1", name: longName, type: "MGMP", description: "Forum berbagi perangkat ajar, " + "praktik baik ".repeat(12), province: "Jawa Barat", city: "Kabupaten Bandung Barat", memberCount: 1280, postCount: 342, isVerified: false, creator: null, avatarUrl: null },
  { id: "qa2", name: "KKG Gugus Melati Kecamatan Sukmajaya", type: "KKG", description: "Komunitas guru kelas.", province: "Jawa Barat", city: null, memberCount: 31, postCount: 4, isVerified: true, creator: { id: "u1" }, avatarUrl: null },
  { id: "qa3", name: "Komunitas_Penulis_Puisi_Remaja_Nusantara_TanpaSpasi", type: "PUBLIKASI", description: null, province: null, city: null, memberCount: 7, postCount: 0, isVerified: false, creator: { id: "u2" }, avatarUrl: null },
];
const MINE = COMMUNITIES.map((c, i) => ({ ...c, status: ["PENDING", "APPROVED", "REJECTED"][i], reviewNote: i === 2 ? "Nama belum sesuai pedoman. " + "Lengkapi dokumen ".repeat(6) : null, createdAt: "2026-11-01T03:00:00.000Z" }));

function mockApi(url) {
  const p = new URL(url).pathname;
  if (p === "/api/komunitas/mine") return { communities: MINE };
  if (p === "/api/komunitas") return { communities: COMMUNITIES };
  return {};
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const results = [];
let fails = 0;

async function audit(route, cfg, tab) {
  const ctx = await browser.newContext({ viewport: { width: cfg.w, height: 780 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  const page = await ctx.newPage();
  await page.route("**/api/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockApi(r.request().url())) }));
  const q = `view=page&path=${encodeURIComponent(route)}&theme=${cfg.theme}&app=1&font=${cfg.font}`;
  const tag = `${route}${tab ? `#${tab}` : ""} ${cfg.w}px f${cfg.font} ${cfg.theme}${cfg.legacy ? " +APK-lama" : ""}`;
  try {
    await page.goto(`${BASE}/qa-fixture/frame?${q}`, { waitUntil: "networkidle", timeout: 180000 }).catch(() => {});
    await page.waitForSelector("html[data-qa-ready='1']", { state: "attached", timeout: 60000 });
    await page.waitForSelector("[data-qa-page], [data-qa-page-error], [data-qa-page-missing]", { state: "attached", timeout: 60000 });
    await page.waitForTimeout(900);
    if (cfg.legacy) {
      await page.evaluate((js) => { try { (0, eval)(js); } catch (e) { console.warn(e); } }, LEGACY_JS);
      await page.waitForTimeout(400);
    }
    if (tab === "mine") { await page.getByRole("button", { name: /Komunitas Saya/ }).click().catch(() => {}); await page.waitForTimeout(400); }
    const r = await page.evaluate((vw) => {
      const de = document.documentElement;
      const err = document.querySelector("[data-qa-page-error], [data-qa-page-missing]");
      const root = document.querySelector("[data-qa-page]");
      const clipped = (el) => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a); if (/(hidden|auto|scroll|clip)/.test(s.overflowX) && a.getBoundingClientRect().right <= vw + 1) return true; } return false; };
      const offenders = [];
      for (const el of document.querySelectorAll("body *")) {
        if (el.closest("details:not([open])") && el.tagName !== "SUMMARY") continue;
        if (el.closest("[data-qa-controls]")) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || r.left >= vw - 1) continue; // drawer tertutup di luar layar
        const s = getComputedStyle(el); if (s.visibility === "hidden" || s.display === "none") continue;
        if (r.right > vw + 1 && !clipped(el)) {
          const pr = el.parentElement?.getBoundingClientRect();
          if (pr && pr.right > vw + 1 && !clipped(el.parentElement)) continue; // laporkan yang terluar saja
          offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 4).join(".")} "${(el.textContent || "").trim().slice(0, 30)}" right=${Math.round(r.right)}`);
        }
      }
      const header = document.querySelector("header");
      const first = root?.firstElementChild;
      let headerOverlap = false;
      if (header && first) { const hs = getComputedStyle(header); if (/(fixed|sticky)/.test(hs.position)) headerOverlap = first.getBoundingClientRect().top < header.getBoundingClientRect().bottom - 1; }
      return { overflow: de.scrollWidth - de.clientWidth, offenders: offenders.slice(0, 6), error: err ? err.textContent.slice(0, 120) : null, rendered: !!root && (root.textContent || "").trim().length > 0, headerOverlap };
    }, cfg.w);
    // nav bawah tidak menutupi akhir konten
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(200);
    r.bottomOverlap = await page.evaluate(() => {
      const nav = [...document.querySelectorAll("nav")].find((n) => getComputedStyle(n).position === "fixed" && n.getBoundingClientRect().bottom >= innerHeight - 2 && n.getBoundingClientRect().height < 120);
      const root = document.querySelector("[data-qa-page]");
      if (!nav || !root) return false;
      const kids = [...root.querySelectorAll("*")].filter((e) => { if (e.closest("details:not([open])") && e.tagName !== "SUMMARY") return false; const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.height > 0 && s.position !== "fixed" && !e.closest("[class*='fixed']"); });
      const bottom = Math.max(...kids.map((e) => e.getBoundingClientRect().bottom), 0);
      return bottom > nav.getBoundingClientRect().top + 1 ? Math.round(bottom - nav.getBoundingClientRect().top) : false;
    });
    const status = r.error || !r.rendered ? "NOT_RENDERABLE" : r.overflow > 1 || r.offenders.length || r.headerOverlap || r.bottomOverlap ? "FAIL" : "PASS";
    if (status === "FAIL") fails++;
    results.push({ route, tab: tab || null, ...cfg, status, ...r });
    console.log(`${status === "PASS" ? "✓" : status === "FAIL" ? "✗" : "–"} ${tag}${status !== "PASS" ? " " + JSON.stringify({ overflow: r.overflow, offenders: r.offenders, header: r.headerOverlap, bottom: r.bottomOverlap, error: r.error }) : ""}`);
    if (status !== "NOT_RENDERABLE" && (process.env.AUDIT_SHOTS || status === "FAIL" || route === "/guru/komunitas")) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${OUT}/${route.replace(/\//g, "_").slice(1)}${tab ? "-" + tab : ""}-${cfg.w}-f${cfg.font}-${cfg.theme}${cfg.legacy ? "-legacy" : ""}.png` });
    }
  } catch (e) {
    results.push({ route, tab: tab || null, ...cfg, status: "NOT_RENDERABLE", error: String(e).slice(0, 160) });
    console.log(`– ${tag} ${String(e).slice(0, 160)}`);
  }
  await ctx.close();
}

for (const route of ROUTES) {
  if (NOT_RENDERABLE[route]) { results.push({ route, status: "NOT_RENDERABLE", error: NOT_RENDERABLE[route] }); console.log(`– ${route} (${NOT_RENDERABLE[route]})`); continue; }
  const matrix = process.env.AUDIT_FULL || FULL_ROUTES.has(route) ? FULL : QUICK;
  for (const cfg of matrix) {
    await audit(route, cfg);
    if (route === "/guru/komunitas") await audit(route, cfg, "mine");
  }
}
await browser.close();
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
const by = {};
for (const r of results) { const k = r.route; by[k] ??= { PASS: 0, FAIL: 0, NOT_RENDERABLE: 0 }; by[k][r.status]++; }
console.log("\nRingkasan per rute:"); for (const [k, v] of Object.entries(by)) console.log(`  ${k}: ${JSON.stringify(v)}`);
console.log(`\n${results.filter((r) => r.status === "PASS").length} PASS, ${fails} FAIL, ${results.filter((r) => r.status === "NOT_RENDERABLE").length} NOT_RENDERABLE`);
process.exit(fails ? 1 : 0);
