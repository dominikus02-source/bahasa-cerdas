/**
 * QA visual Beranda Guru & Murid — komponen asli, tanpa DB/auth.
 * Membundel GuruBerandaClient (dalam shell .bc-guru-shell/.bc-guru seperti
 * app/(dashboard)/guru/layout.tsx) dan halaman /murid/beranda (dalam
 * MuridShellFrame), menyajikan fixture JSON untuk semua endpoint beranda,
 * lalu memotret 360/390/768/1024/1440 px dalam mode terang & gelap serta
 * memeriksa: overflow horizontal, teks bertumpuk, dan teks terpotong.
 *
 * Jalankan: BERANDA_QA_OUTPUT=/tmp/beranda node scripts/qa-beranda-browser.mjs
 * Opsional: AI_BC_CHROME_PATH=/path/chrome, AI_BC_PLAYWRIGHT_MODULE=/path/playwright,
 * BERANDA_QA_WIDTHS=390,1440. Keluar non-nol bila ada temuan.
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { build } from "esbuild";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.AI_BC_PLAYWRIGHT_MODULE || "playwright");
const root = process.cwd();
const bundleDir = await fs.mkdtemp(path.join(os.tmpdir(), "bc-beranda-bundle-"));
const outputDir = process.env.BERANDA_QA_OUTPUT || "/tmp/bc-beranda-qa";
const widths = (process.env.BERANDA_QA_WIDTHS || "360,390,768,1024,1440").split(",").map(Number);
await fs.mkdir(outputDir, { recursive: true });

await build({
  stdin: {
    resolveDir: root,
    loader: "tsx",
    contents: `
      import React from 'react';
      import {createRoot} from 'react-dom/client';
      import {ShellLayout} from './components/shell/ShellLayout';
      import {GuruNavList, GuruMobileNav} from './components/dashboard/GuruNav';
      import GuruBerandaClient from './components/guru/GuruBerandaClient';
      import {MuridShellFrame} from './components/shell/MuridShellFrame';
      import MuridBeranda from './app/(dashboard)/murid/beranda/page';
      const role = new URLSearchParams(location.search).get('role') || 'guru';
      const guru = <ShellLayout
          rootClassName="bc-guru-shell bg-gradient-to-br from-blue-50 via-white to-slate-50 dark:from-[#061225] dark:via-[#08182b] dark:to-[#0b1f38]"
          sidebar={<><div className="p-5 border-b border-blue-500/20 bg-gradient-to-r from-[#0b4fc7] to-[#1671e8]"><span className="shell-label font-bold text-white text-sm block truncate">BahasaCerdas</span></div><GuruNavList isFounder={false} /></>}
          header={<header className="shrink-0 sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-blue-100/80 bg-white/88 px-4 backdrop-blur-xl md:px-6 dark:border-blue-950/70 dark:bg-[#08182b]/92"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Guru</span></header>}
          mainClassName="bc-guru flex-1 px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-6 lg:py-8 pb-24 md:pb-8 mx-auto max-w-[1440px] w-full"
          bottomNav={<GuruMobileNav role="GURU" isFounder={false} />}>
          <GuruBerandaClient displayName="Kartikasari" userKey="qa-guru" />
        </ShellLayout>;
      const murid = <MuridShellFrame user={{fullName:'Muhammad Rizky Ananda Pratama', avatar:null, role:'MURID', isFounder:false}} rank={'SILVER'}>
          <MuridBeranda />
        </MuridShellFrame>;
      createRoot(document.getElementById('root')).render(role === 'murid' ? murid : guru);
    `,
  },
  outfile: path.join(bundleDir, "bundle.js"),
  bundle: true,
  format: "esm",
  jsx: "automatic",
  tsconfig: path.join(root, "tsconfig.json"),
  define: { "process.env.NODE_ENV": '"development"', "process.env.NEXT_PUBLIC_JUMPA_ENABLED": '"true"' },
  logLevel: "error",
  banner: { js: "globalThis.process = globalThis.process || { env: {} };" },
  plugins: [{
    name: "next-fixture-adapters",
    setup(api) {
      api.onResolve({ filter: /^(next\/(image|link|navigation|dynamic)|next-themes|@\/lib\/supabase\/(server|client))$/ }, args => ({ path: args.path, namespace: "fixture" }));
      api.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path: id }) => ({
        resolveDir: root,
        loader: "tsx",
        contents: id === "next/image" ? `import React from 'react'; export default function Image({priority, sizes, fill, quality, placeholder, blurDataURL, unoptimized, loader, style, ...props}) { const s = fill ? {position:'absolute', inset:0, width:'100%', height:'100%', ...style} : style; return <img {...props} style={s}/> }`
          : id === "next/link" ? `import React from 'react'; const Link = React.forwardRef(function Link({prefetch, replace, scroll, shallow, ...props}, ref) { return <a ref={ref} {...props}/> }); export default Link;`
          : id === "next/navigation" ? `const p=()=>new URLSearchParams(location.search).get('role')==='murid'?'/murid/beranda':'/guru/beranda'; export const usePathname=p; export const useRouter=()=>({push(){},replace(){},refresh(){},back(){},prefetch(){}}); export const useSearchParams=()=>new URLSearchParams(); export const redirect=()=>{throw Error('Unexpected fixture redirect')}`
          : id === "next/dynamic" ? `import React from 'react'; export default function dynamic(loader){ const L = React.lazy(()=>loader().then(m=>({default:m.default||m}))); return (p)=> <React.Suspense fallback={null}><L {...p}/></React.Suspense> }`
          : id === "next-themes" ? `import React from 'react'; export const useTheme=()=>({theme: document.documentElement.classList.contains('dark')?'dark':'light', resolvedTheme: document.documentElement.classList.contains('dark')?'dark':'light', setTheme(){}}); export const ThemeProvider=({children})=>children;`
          : `export const getUser=async()=>null; export const createClient=()=>({auth:{getUser:async()=>({data:{user:null}}), onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}});`,
      }));
    },
  }],
});

execFileSync(process.execPath, [path.join(root, "node_modules/tailwindcss/lib/cli.js"), "-i", "app/globals.css", "-o", path.join(bundleDir, "globals.css"), "--minify"], { cwd: root, stdio: "ignore" });

const iso = (h) => new Date(Date.now() - h * 3600_000).toISOString();
const soon = new Date(Date.now() + 26 * 3600_000).toISOString();
const fixtures = {
  "/api/guru/misi": { data: { mingguMulai: iso(48), misi: [
    { id: "mgmp", selesai: true, jumlah: 1, target: 1 }, { id: "artikel", selesai: false, jumlah: 0, target: 1 },
    { id: "materi", selesai: true, jumlah: 2, target: 2 }, { id: "kelas", selesai: false, jumlah: 0, target: 1 },
    { id: "kirim-materi", selesai: false, jumlah: 1, target: 2 }, { id: "toko-karya", selesai: false, jumlah: 0, target: 1 },
    { id: "latihan", selesai: false, jumlah: 0, target: 1 } ], totalSelesai: 2, totalMisi: 7, xp: 120, xpMax: 400, level: 3, xpLevel: 20, xpPerLevel: 100, streak: 4, semuaSelesai: false } },
  "/api/guru/leaderboard": { myRank: 12, myXp: 1280, participants: 348 },
  "/api/jumpa/beranda": { live: [], next: { code: "abc-defg-hij", title: "Diskusi Teks Eksposisi Kelas XI IPA 2 — Persiapan Asesmen Sumatif Akhir Semester", kind: "KELAS", status: "SCHEDULED", place: "Bahasa Indonesia XI IPA 2", mine: true, scheduledAt: soon, startedAt: null, endedAt: null, endReason: null, durationMin: 0, attended: 0, present: 0 } },
  "/api/guru/berkarya": { currentUserId: "g1", meta: { xpArtikel: 50, xpPuisi: 40 }, data: [
    { id: "k1", title: "Strategi Membaca Intensif untuk Teks Eksplanasi di Kelas Delapan yang Heterogen", slug: "k1", excerpt: "Ringkasan", articleType: "ARTIKEL", coverImage: null, readCount: 1284, likeCount: 32, commentCount: 7, likedByCurrentUser: true, createdAt: iso(3), publishedAt: iso(3), author: { id: "g1", fullName: "Kartikasari Paramitha Sulistyaningrum, S.Pd., M.Pd.", avatar: null, role: "GURU", isFounder: false, isPremium: true, badgeKind: null, trialEndsAt: null, profile: { school: "SMP Negeri 2 Kabupaten Tasikmalaya" } } },
    { id: "k2", title: "Hujan di Bulan Juni", slug: "k2", excerpt: "Tak ada yang lebih tabah", articleType: "PUISI", coverImage: null, readCount: 98, likeCount: 4, commentCount: 0, likedByCurrentUser: false, createdAt: iso(30), publishedAt: iso(30), author: { id: "g2", fullName: "Bambang", avatar: null, role: "GURU", isFounder: false, isPremium: false, badgeKind: null, trialEndsAt: null, profile: { school: null } } },
    { id: "k3", title: "Menulis Cerpen dengan Teknik Show, Don't Tell", slug: "k3", excerpt: "x", articleType: "ARTIKEL", coverImage: null, readCount: 412, likeCount: 12, commentCount: 3, likedByCurrentUser: false, createdAt: iso(80), publishedAt: iso(80), author: { id: "g3", fullName: "Dra. Wahyuningsih Setyaningrum", avatar: null, role: "GURU", isFounder: false, isPremium: false, badgeKind: null, trialEndsAt: null, profile: { school: "SMA Kristen Petra 5 Surabaya" } } } ] },
  "/api/player/badges": { badges: [
    { code: "guru-pertama", name: "Langkah Pertama", icon: "🎯", description: "d", rarity: "BRONZE", progress: 1, unlocked: true, condition: { target: 1 } },
    { code: "guru-penulis", name: "Penulis Inspiratif Sepanjang Masa", icon: "✍️", description: "d", rarity: "SILVER", progress: 2, unlocked: false, condition: { target: 5 } },
    { code: "guru-mentor", name: "Mentor Kelas", icon: "🏅", description: "d", rarity: "GOLD", progress: 0, unlocked: false, condition: { target: 10 } },
    { code: "guru-legenda", name: "Legenda", icon: "👑", description: "d", rarity: "LEGENDARY", progress: 0, unlocked: false, condition: { target: 50 } },
    { code: "guru-kelas", name: "Kelas Aktif", icon: "📚", description: "d", rarity: "BRONZE", progress: 3, unlocked: true, condition: { target: 3 } } ] },
  "/api/player/profile": { profile: { userId: "m1", level: 7, totalXp: 4200, rank: "SILVER", rankLabel: "Silver", rankTitle: "Silver", rankColor: "#999", rankAsset: "", coin: 12850, weeklyXp: 1240, weeklyLabel: "", seasonXp: 0, seasonLabel: "", streak: 12, avatar: null, frame: null, title: null, equippedNameColor: null, equippedBadge: null, equippedNameplate: null, equippedFrame: null, equippedBackground: null, levelProgress: { current: 20, needed: 100, pct: 20, remaining: 80 }, xpToNextLevel: 80, createdAt: iso(500) }, summary: { badges: { total: 10, unlocked: 2 }, achievements: { total: 5, completed: 1, claimed: 1 } }, periods: { weekKey: "w", seasonKey: "s" } },
  "/api/user/me": { user: { displayName: "Muhammad Rizky Ananda Pratama", fullName: "Muhammad Rizky Ananda Pratama", school: "SMA Negeri 1 Kabupaten Tasikmalaya", isPremium: false } },
  "/api/murid/dashboard/summary": { pengumuman: [], materi: [], totalTugas: 2 },
  "/api/player/adaptive-practice": { mode: "PREVIEW", actionType: "DIAGNOSTIC", actionTitle: "Tes Awal", ctaLabel: "Mulai Tes", targetSkill: null, targetSubskill: null, targetDifficulty: null, sessionSize: 10, reasonCode: "NO_BASELINE", reasonText: "Ikuti tes awal.", estimatedMinutes: 10, confidence: "NO_DATA", premiumDepth: "STANDARD", selectionVersion: "v1", learnerState: [], mentor: null, diagnosticCompleted: false, assessmentState: "NOT_STARTED" },
  "/api/player/premium/status": { plan: "FREE", subscriptionStatus: null },
  "/api/student/daily-action": { status: "PENDING", id: "d1", source: "BANK", skill: "VOCABULARY", questionType: "PILIHAN_GANDA", difficulty: "EASY", questionText: "Kata yang bermakna sama dengan \"cermat\" dalam kalimat \"Ia membaca soal dengan cermat sebelum menjawab\" adalah ...", options: JSON.stringify(["teliti", "cepat", "ceroboh", "santai dan tidak terburu-buru sama sekali"]), date: iso(0) },
  "/api/player/quests": { quests: [
    { id: "q1", date: iso(0), questType: "BACA_MATERI", target: 1, progress: 1, completed: true, rewardCoins: 20, claimed: false },
    { id: "q2", date: iso(0), questType: "MENJAWAB_KUIS", target: 5, progress: 2, completed: false, rewardCoins: 30, claimed: false },
    { id: "q3", date: iso(0), questType: "MENULIS", target: 1, progress: 1, completed: true, rewardCoins: 50, claimed: true } ] },
  "/api/siswa/karya": { karya: [
    { id: "s1", title: "Senja di Pelabuhan Ratu yang Tak Pernah Benar-Benar Pergi dari Ingatanku", type: "PUISI", likesCount: 41, commentsCount: 9, isFeatured: true, createdAt: iso(5), user: { displayName: "Anindya Kirana Larasati Wibowo" } },
    { id: "s2", title: "Ponsel dan Kita", type: "OPINI", likesCount: 3, commentsCount: 1, isFeatured: false, createdAt: iso(20), user: { displayName: "Bima" } },
    { id: "s3", title: "Si Kancil Pergi ke Kota", type: "CERPEN", likesCount: 12, commentsCount: 4, isFeatured: false, createdAt: iso(50), user: { displayName: "Citra Ayu" } },
    { id: "s4", title: "Pantun Nasihat", type: "PANTUN", likesCount: 0, commentsCount: 0, isFeatured: false, createdAt: iso(90), user: { displayName: "Dewi" } } ] },
};
const html = `<!doctype html><html lang="id"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/globals.css"><link rel="stylesheet" href="/classroom.css"><link rel="stylesheet" href="/bundle.css"><script>if(new URLSearchParams(location.search).get('theme')==='dark')document.documentElement.classList.add('dark')</script></head><body><div id="root"></div><script type="module" src="/bundle.js"></script></body></html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) {
    const body = fixtures[url.pathname];
    res.writeHead(body ? 200 : 404, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body ?? { error: "fixture" }));
    return;
  }
  const files = {
    "/bundle.js": [path.join(bundleDir, "bundle.js"), "text/javascript"],
    "/bundle.css": [path.join(bundleDir, "bundle.css"), "text/css"],
    "/globals.css": [path.join(bundleDir, "globals.css"), "text/css"],
    "/classroom.css": [path.join(root, "components/kelas/classroom.css"), "text/css"],
  };
  if (files[url.pathname]) {
    const [file, type] = files[url.pathname];
    try { res.writeHead(200, { "Content-Type": type }); res.end(await fs.readFile(file)); } catch { res.end(); }
    return;
  }
  const pub = path.join(root, "public", decodeURIComponent(url.pathname));
  if (url.pathname !== "/" && pub.startsWith(path.join(root, "public"))) {
    try { const buf = await fs.readFile(pub); res.writeHead(200); res.end(buf); return; } catch { /* html */ }
  }
  res.writeHead(200, { "Content-Type": "text/html" }); res.end(html);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-gpu"], ...(process.env.AI_BC_CHROME_PATH ? { executablePath: process.env.AI_BC_CHROME_PATH } : {}) });

/** Pemeriksaan di halaman: overflow-x, teks bertumpuk, teks terpotong tanpa elipsis. */
function inspect() {
  const vw = window.innerWidth;
  const issues = [];
  const main = document.querySelector("main") || document.body;
  const describe = (el) => {
    const t = (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60);
    return `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${String(el.className).split(" ").slice(0, 3).join(".")} «${t}»`;
  };
  const visible = (el) => {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  if (document.documentElement.scrollWidth > vw + 1) issues.push({ type: "overflow-x", detail: `scrollWidth ${document.documentElement.scrollWidth} > ${vw}` });
  const texts = [];
  const ellipsized = (el) => !!el.closest(".truncate,[class*='line-clamp'],[class*='jpe-trunc']") || getComputedStyle(el).textOverflow === "ellipsis";
  // Potong rect teks oleh semua leluhur ber-overflow (truncate/line-clamp memotong secara sah).
  const clipRect = (el, r) => {
    let { left, top, right, bottom } = r;
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      const c = e.getBoundingClientRect();
      if (cs.overflowX !== "visible") { left = Math.max(left, c.left); right = Math.min(right, c.right); }
      if (cs.overflowY !== "visible") { top = Math.max(top, c.top); bottom = Math.min(bottom, c.bottom); }
    }
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  };
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim() || !n.parentElement || !visible(n.parentElement)) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const raw of range.getClientRects()) {
      if (raw.width <= 2 || raw.height <= 2) continue;
      const r = clipRect(n.parentElement, raw);
      const lost = (raw.width * raw.height - Math.max(0, r.width) * Math.max(0, r.height)) / (raw.width * raw.height);
      if (lost > 0.15 && !ellipsized(n.parentElement) && !n.parentElement.closest("[aria-hidden='true'],.sr-only,[data-qa-scroll]")) {
        // Teks yang hilang di luar wadah tanpa elipsis = kalimat terpotong.
        const sc = n.parentElement.closest("[class*='overflow-x-auto'],[class*='overflow-auto'],[class*='snap-x']");
        if (!sc) issues.push({ type: "text-clipped", detail: describe(n.parentElement) });
      }
      if (r.width > 2 && r.height > 2) {
        texts.push({ el: n.parentElement, r });
        if (r.right > vw + 1 || r.left < -1) issues.push({ type: "text-offscreen", detail: describe(n.parentElement) });
      }
    }
  }
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const a = texts[i], b = texts[j];
    if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
    const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (w > 3 && h > 3 && w * h > 0.25 * Math.min(a.r.width * a.r.height, b.r.width * b.r.height)) issues.push({ type: "text-overlap", detail: `${describe(a.el)} ⟷ ${describe(b.el)}` });
  }
  // Teks melebar keluar dari kotaknya sendiri (mis. wordmark ukuran-vw di kolom sempit).
  const boxes = new Set(texts.map((t) => t.el));
  for (const el of boxes) {
    const cs = getComputedStyle(el);
    if (cs.display.startsWith("inline") || el.clientWidth === 0 || ellipsized(el)) continue;
    if (el.closest("[class*='overflow-x-auto'],[class*='overflow-auto'],[class*='snap-x'],[data-qa-scroll]")) continue;
    if (el.scrollWidth > el.clientWidth + 4) issues.push({ type: "text-overflow-box", detail: `${describe(el)} (${el.scrollWidth}>${el.clientWidth})` });
  }
  // Teks tertimpa/menimpa gambar besar (art hero, ilustrasi) di luar wadah kecil yang sama.
  const imgs = [...main.querySelectorAll("img")].filter(visible).map((el) => ({ el, r: el.getBoundingClientRect() })).filter((x) => x.r.width > 60 && x.r.height > 60);
  for (const t of texts) for (const im of imgs) {
    const w = Math.min(t.r.right, im.r.right) - Math.max(t.r.left, im.r.left);
    const h = Math.min(t.r.bottom, im.r.bottom) - Math.max(t.r.top, im.r.top);
    if (w <= 3 || h <= 3 || w * h < 0.3 * t.r.width * t.r.height) continue;
    // Label sengaja di atas foto (ubin video, kartu sampul): wadah bersama kecil.
    let common = im.el.parentElement;
    while (common && !common.contains(t.el)) common = common.parentElement;
    const cr = common ? common.getBoundingClientRect() : null;
    if (cr && cr.width * cr.height < 3 * im.r.width * im.r.height) continue;
    issues.push({ type: "text-over-image", detail: describe(t.el) });
  }
  const seen = new Set();
  return issues.filter(x => { const k = x.type + x.detail; if (seen.has(k)) return false; seen.add(k); return true; });
}

const report = [];
for (const role of ["guru", "murid"]) for (const theme of ["light", "dark"]) for (const width of widths) {
  const page = await browser.newPage({ viewport: { width, height: width < 768 ? 844 : 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(`${base}/?role=${role}&theme=${theme}`);
  await page.waitForTimeout(1800);
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" });
  await page.waitForTimeout(200);
  const issues = await page.evaluate(inspect);
  const file = path.join(outputDir, `${role}-${theme}-${width}.png`);
  // Elemen fixed (bottom nav, tombol AI, ajakan pasang) akan tergambar di tengah
  // tangkapan full-page; sembunyikan (kecuali sidebar setinggi layar) supaya tangkapan menunjukkan isi beranda.
  await page.evaluate(() => { for (const el of document.querySelectorAll("body *")) if (getComputedStyle(el).position === "fixed" && el.getBoundingClientRect().height < window.innerHeight * 0.8) el.style.setProperty("visibility", "hidden", "important"); });
  await page.screenshot({ path: file, fullPage: true });
  report.push({ role, theme, width, issues, errors });
  console.log(`${role} ${theme} ${width}: ${issues.length} temuan${errors.length ? `, ${errors.length} error JS` : ""}`);
  for (const x of issues.slice(0, 12)) console.log(`   - ${x.type}: ${x.detail}`);
  for (const e of errors.slice(0, 3)) console.log(`   ! ${e.slice(0, 200)}`);
  await page.close();
}
await browser.close();
server.close();
await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
const total = report.reduce((s, r) => s + r.issues.length + r.errors.length, 0);
console.log(`TOTAL temuan: ${total} (${outputDir})`);
process.exit(total ? 1 : 0);
