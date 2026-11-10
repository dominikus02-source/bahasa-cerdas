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
const QA_USER = {
  id: "qa-user-1", fullName: "QA Guru Palsu", nickname: "QA", email: "qa@bahasacerdas.test",
  avatar: null, bio: "Profil QA untuk audit overflow.", school: "SMP BahasaCerdas", city: "Jakarta",
  province: "DKI Jakarta", subject: "Bahasa Indonesia", grade: "IX", xp: 120, level: 3, streak: 2,
  isPremium: false, isFounder: false, badgeKind: null, coins: 10, league: "bronze", totalLikes: 0, totalViews: 0,
};

const QA_FOUNDER = { ...QA_USER, id: "qa-founder-1", fullName: "QA Founder Palsu", email: "qa-founder@bahasacerdas.test", isFounder: true, role: "ADMIN", isPremium: true, badgeKind: "founder" };
const LONG_EMAIL = "musyawarah.guru.mata.pelajaran.bahasa.indonesia@kabupatenbandungbarat.example.test";
const QA_ADMIN_USERS = [
  { id: "u1", fullName: longName, email: LONG_EMAIL, role: "GURU", isFounder: false, isPremium: true, premiumUntil: "2027-01-01T00:00:00.000Z", trialEndsAt: null, plan: "PRO", xp: 2400, level: 12, simLimit: 10, simUsage: 3, createdAt: "2026-01-15T00:00:00.000Z" },
  { id: "u2", fullName: "Siti Nurhaliza BahasaCerdas", email: "siti.nurhaliza@bahasacerdas.test", role: "MURID", isFounder: false, isPremium: false, premiumUntil: null, trialEndsAt: null, plan: "FREE", xp: 80, level: 2, simLimit: 0, simUsage: 0, createdAt: "2026-03-02T00:00:00.000Z" },
  { id: "u3", fullName: "QA Founder Palsu", email: "qa-founder@bahasacerdas.test", role: "ADMIN", isFounder: true, isPremium: true, premiumUntil: null, trialEndsAt: null, plan: "FOUNDER", xp: 9999, level: 50, simLimit: 0, simUsage: 0, createdAt: "2025-01-01T00:00:00.000Z" },
];
const QA_USER_ANALYTICS = {
  generatedAt: "2026-11-10T13:00:00.000Z",
  summary: { totalUsers: 1280, murid: 1100, guru: 180, other: 0, active30d: 510, new30d: 190 },
  roles: [{ key: "MURID", label: "Murid", value: 1100 }, { key: "GURU", label: "Guru", value: 180 }],
  statuses: [{ key: "free", label: "Free", value: 1000 }, { key: "premium", label: "Pro", value: 280 }],
  growth: [{ key: "2026-10", label: "Okt", murid: 80, guru: 12, other: 0, total: 92 }, { key: "2026-11", label: "Nov", murid: 60, guru: 8, other: 0, total: 68 }],
};
const QA_LIVE_PULSE = {
  onlineUsers: 7, onlineGuru: 2, onlineMurid: 4, onlineAdmin: 1, onlineUmum: 0,
  onlineLocations: [{ key: "guru:beranda", label: "Guru · Beranda", total: 2, guru: 2, murid: 0, admin: 0, umum: 0 }],
  totalKarya: 120, generatedAt: "2026-11-10T13:00:00.000Z", presenceWindowSeconds: 60, presenceAvailable: true,
};

function mockApi(url, mode) {
  const p = new URL(url).pathname;
  if (p === "/api/komunitas/mine") return { communities: MINE };
  if (p === "/api/komunitas") return { communities: COMMUNITIES };
  if (p === "/api/user/me") return { user: QA_USER };
  if (p === "/api/admin/users") return { users: QA_ADMIN_USERS, total: QA_ADMIN_USERS.length, pages: 1 };
  if (p === "/api/admin/users/analytics") return QA_USER_ANALYTICS;
  if (p === "/api/analytics/live") return QA_LIVE_PULSE;
  if (p === "/api/admin/monitoring/live") return QA_LIVE_PULSE;
  if (p === "/api/admin/analytics/dashboard") return {
    success: true, generatedAt: "2026-11-10T13:00:00.000Z",
    range: { days: 30, since: "2026-10-11T00:00:00.000Z", until: "2026-11-10T13:00:00.000Z" },
    filterApplied: false,
    funnel: [
      { stage: "login", label: "Login", users: 800, conversion: 100, change: 2 },
      { stage: "learn", label: "Belajar", users: 520, conversion: 65, change: 1 },
      { stage: "create", label: "Berkarya", users: 210, conversion: 26, change: -1 },
      { stage: "return", label: "Kembali", users: 140, conversion: 18, change: 0 },
    ],
    dropoff: [{ from: "Login", to: "Belajar", drop: 280 }],
    retention: { dau: 120, wau: 410, mau: 890, stickiness: 14, retentionD1: 32, retentionD7: 18, retentionD30: 9, avgStreak: 3, maxStreak: 21, avgActiveDays: 6, activeUsers90d: 980 },
    engagement: { avgSessionsPerDay: 4, totalActions: 12000, xpEarned: 54000, xpTransactions: 3200, questsCompleted: 180, badgesAwarded: 40, achievementsCompleted: 22, rankUps: 15, levelUps: 60, gamesPlayed: 900, jalurCompleted: 70, karyaCreated: 55, ukbiCompleted: 30 },
    heatmap: [{ dow: 1, hour: 8, users: 20 }, { dow: 1, hour: 19, users: 40 }],
    cohort: [{ week: "2026-10-06", users: 80, w1: 40, w2: 28, w3: 20, w4: 16 }],
    xpDist: [{ bucket: "0-100", users: 200 }, { bucket: "100-500", users: 80 }],
    rankDist: [{ rank: "BRONZE", users: 400, promotedThisWeek: 12 }],
    skills: [{ skill: "Membaca", avgLevel: 2.4, users: 300 }],
    content: { karyaToday: 3, karyaWeek: 18, karyaMonth: 55, karyaTotal: 120, artikel: 40, comments: 90, likes: 300, views: 2000, topTheme: "Puisi", themes: [{ type: "Puisi", count: 40 }] },
    topGames: [{ source: "benar-salah", label: "Benar Salah", players: 80, totalXp: 4000, avgXp: 50, repeatRate: 20 }],
    aiGuru: { activeGurus: 12, totalPrompts: 400, totalTokens: 80000, rpp: 40, soal: 80, materi: 30, review: 10, eyd: 20, analisis: 8, asisten: 15, download: 6 },
    topJourneys: [{ journey: ["Login", "Belajar", "Berkarya"], count: 40 }],
    insights: [{ tone: "good", text: "Retensi D1 naik pada sampel QA." }],
  };
  if (p === "/api/admin/data-center") return {
    counts: { User: 1280, Profile: 1280, Artikel: 40, Video: 12, Karya: 120, UKBIQuestion: 800, TKAQuestion: 600, PaketKompetensi: 20, LearningLevel: 8, LearningUnit: 40, TestSession: 300, TestAnswer: 2000, AIUsage: 400, AiSavedResult: 90, Transaksi: 70 },
    backupManifest: { id: "b1", backupId: "bak-1", storagePath: "s3://qa/backup", status: "SUCCESS", trigger: "SCHEDULED", totalRows: 9000, totalTables: 15, totalBytes: 1024000, completedAt: "2026-11-10T10:00:00.000Z", startedAt: "2026-11-10T09:50:00.000Z", errorMessage: null, hoursAgo: 3 },
  };
  if (p.startsWith("/api/admin/finance/ledger/export")) return null;
  if (p.startsWith("/api/admin/finance/ledger")) return {
    from: "2026-11-01",
    to: "2026-11-30",
    truncated: false,
    totals: { pemasukan: 15000000, pengeluaran: 3250000, saldo: 11750000 },
    entries: [
      { id: "le-1", entryDate: "2026-11-10", type: "PEMASUKAN", amount: 15000000, description: "Setoran premi uji QA dengan keterangan panjang supaya kartu buku kas tidak overflow di layar sempit", category: "Premium", createdById: "u3", createdByEmail: "qa-founder@bahasacerdas.test", updatedById: null, updatedByEmail: null, createdAt: "2026-11-10T13:00:00.000Z", updatedAt: "2026-11-10T13:00:00.000Z" },
      { id: "le-2", entryDate: "2026-11-08", type: "PENGELUARAN", amount: 3250000, description: "Biaya infrastruktur dan domain bulan November", category: "Infrastruktur", createdById: "u3", createdByEmail: "qa-founder@bahasacerdas.test", updatedById: "u3", updatedByEmail: "qa-founder@bahasacerdas.test", createdAt: "2026-11-08T04:00:00.000Z", updatedAt: "2026-11-08T05:00:00.000Z" },
    ],
  };
  if (p.startsWith("/api/admin/payments/health")) return { pendingOlder30Min: 0, paymentWithoutPremium: 0, premiumWithoutLedger: 0 };
  if (p.startsWith("/api/admin/payments")) return {
    stats: { total: 2, allTimeRevenue: 250000, success: 1, pending: 1, failed: 0, revenueThisMonth: 150000, revenueAllTime: 250000 },
    transactions: [{
      id: "trx-1", orderId: "ORD-QA-1", amount: 150000, status: "SUCCESS", planId: "GURU_PRO_MONTHLY",
      createdAt: "2026-11-01T03:00:00.000Z", updatedAt: "2026-11-01T03:01:00.000Z", midtransId: "mid-qa-1",
      user: { id: "u1", fullName: longName, email: LONG_EMAIL, isPremium: true, premiumPlan: "GURU_PRO_MONTHLY", premiumUntil: "2027-01-01T00:00:00.000Z" },
      premiumActivated: true,
    }],
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  };
  if (p.startsWith("/api/admin/premium/report")) return {
    summary: { totalActive: 2, muridActive: 1, guruActive: 1, expiringSoon: 0, expired: 0, mrr: { total: 200000, activeMuridPremium: 80000, activeGuruPremium: 120000 }, cashCollectedByAudience: { murid: 80000, guru: 120000 }, funnel: { registered: 1280, activePremium: 2, renewed: 1 }, churnRisk: { expiringIn7d: 0, expiringIn14d: 0, expiringIn30d: 1 } },
    data: [{
      userId: "u1", fullName: longName, email: LONG_EMAIL, audience: "GURU", role: "GURU", isPremium: true,
      premiumPlan: "GURU_PRO_MONTHLY", premiumUntil: "2027-01-01T00:00:00.000Z", premiumStatus: "ACTIVE", daysUntilExpiry: 52,
      subscriptionPlan: "GURU_PRO_MONTHLY", amount: 150000,
      lastTransaction: { id: "trx-1", status: "SUCCESS", reference: "ref-1", orderId: "ORD-QA-1", midtransId: "mid-qa-1", amount: 150000, createdAt: "2026-11-01T03:00:00.000Z" },
    }],
    pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    filters: { audience: "ALL", status: "ALL", plan: "ALL" },
  };
  if (p === "/api/admin/founders") return { founders: [{ id: "qa-founder-1", email: "qa-founder@bahasacerdas.test", fullName: "QA Founder Palsu", role: "ADMIN", isSuperFounder: true }], canManage: true };
  if (p.startsWith("/api/admin/audit-log")) return { entries: [{ id: "log-1", actorEmail: "qa-founder@bahasacerdas.test", method: "GET", path: "/api/admin/users", status: 200, targetUserId: null, createdAt: "2026-11-10T13:00:00.000Z" }], pages: 1 };
  if (p.startsWith("/api/admin/settings/promo-video")) return { videoId: null };
  if (p.startsWith("/api/admin/settings/mgmp-media")) return { type: "none" };
  if (p.startsWith("/api/admin/teacher-commissions/payout-control")) return {
    safetyState: "DISABLED", safetyDetail: "Pencairan masih dimatikan pada lingkungan QA.",
    config: { provider: "xendit", realMoneyEnabled: false, providerEnabled: false, killSwitchActive: false, minimumAmount: 10000, maximumAmount: 1000000, pilotPaused: false, pilotGlobalLimit: 0, globalDailyLimit: 0 },
    exposure: { pilotDailyTotal: 0, globalDailyTotal: 0, pilotGlobalLimit: 0, globalDailyLimit: 0 },
    pilot: { teacherIds: [], paused: false },
    founderGate: { autoChecksPassed: false, autoPass: 0, autoFail: 0, manualRequired: 1, items: [{ id: "gate-1", label: "Siap produksi", status: "PENDING", detail: "QA" }] },
    alerts: [],
  };
  if (p.startsWith("/api/admin/teacher-commissions/pre-canary")) return {
    decision: "NOT_YET", items: [], automaticFailures: [], manualPending: [],
    founderDecision: { state: "PENDING", approverEmail: null, decidedAt: null, notes: null },
    realMoneyEnabled: false, providerEnabled: false, provider: "xendit", killSwitchActive: false,
  };
  if (p.startsWith("/api/admin/teacher-commissions/canary")) return {
    run: { canaryRunId: "c1", selectedTeacherId: null, selectedWithdrawalId: null, intendedGrossAmount: null, intendedDestinationSnapshot: null, provider: null, executionEnvironment: null, receiptStatus: null, finalStatus: "IDLE", stopReason: null, reviewNotes: null, startedAt: null, completedAt: null },
    preflight: { blocked: true, blockingReason: "QA", checks: [] },
  };
  if (p.startsWith("/api/admin/teacher-commissions/xendit-readiness")) return {
    config: { overall: "NOT_READY", fields: [] },
    evidence: { updatedAt: null, items: [] },
    readiness: { ready: false, blocks: [] },
    confirmation: { confirmed: false, founderEmail: null, timestamp: null, approvalReference: null, canaryTeacherId: null, withdrawalId: null },
    pilotTeacher: null,
    snapshot: { teacher: { maskedIdentity: "guru-***" }, commission: null, withdrawal: { id: null, amount: null }, destination: null, provider: "xendit", providerFee: "0", teacherReceives: null, risk: "low", exposureRemaining: 0, dailyGlobalExposure: 0, killSwitch: false, pilot: false, founderGateReady: false },
  };
  if (p.startsWith("/api/admin/")) return mode === "array" ? [] : { items: [], users: QA_ADMIN_USERS, total: QA_ADMIN_USERS.length, pages: 1, rows: [], payments: [], subscriptions: [], payouts: [], withdrawals: [], works: [], communities: [], videos: [], articles: [], logs: [], quotas: [], features: [] };
  if (p === "/api/user/rekening") return { bank: "", holder: "", number: "" };
  if (p === "/api/group") return { groups: [{ id: "g1", name: "Kelas QA 9A", accessCode: "QA1", grade: "IX", _count: { members: 0 } }] };
  if (p.startsWith("/api/guru/quiz/")) return { quiz: { id: "qa-1", title: "Kuis QA", assignments: [] } };
  if (p === "/api/guru/leaderboard") return { entries: [], myRank: null, period: "week" };
  if (p === "/api/guru/hasil-karya/leaderboard") return { topCreator: null, topSchools: [], leaderboard: [], topTeachers: [] };
  if (p === "/api/guru/literasi/stats") return { total: { karya: 0, penulis: 0, likes: 0, views: 0 }, pilihanAI: [], palingPopuler: [], penulisTeraktif: [], insight: [], rekomendasi: [] };
  if (p === "/api/siswa/karya") return { items: [], nextCursor: null };
  if (p.startsWith("/api/siswa/karya/")) return { karya: null, comments: [], liked: false };
  if (p === "/api/guru/nilai-kategori") return { kategoris: [] };
  if (p === "/api/siswa/user/karya") return { items: [], karya: [] };
  if (p === "/api/murid/profile-meta") return { memberNumber: "QA-1", gelar: "Pemula", stats: { karyaCount: 0, totalLikes: 0, totalViews: 0, wordCount: 0, xp: 120, coins: 10 }, kebunKata: [], lencana: [], nickname: { value: "QA", updatedAt: null, daysLeftForChange: 0 } };
  if (p.startsWith("/api/user/profile/")) return { followerCount: 0, followingCount: 0, profileLikeCount: 0, followers: [], following: [] };
  if (p === "/api/player/profile") return { profile: null };
  if (p === "/api/player/xp/history") return { entries: [] };
  if (p === "/api/player/badges") return { badges: [] };
  if (p === "/api/player/journey") return { entries: [] };
  if (p === "/api/player/skills") return { skills: [] };
  if (p === "/api/player/diagnostic/baseline") return null;
  if (p === "/api/murid/nickname") return { nickname: "QA", history: [] };
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
    // Elemen konten pertama (teks/kontrol), bukan dekorasi aria-hidden/absolut.
    const first = [...root.querySelectorAll("*")].find((e) => {
      const r = e.getBoundingClientRect(); if (!(r.height > 0 && r.width > 0) || hidden(e) || e.closest("[aria-hidden='true']")) return false;
      const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || /^(A|BUTTON|INPUT|SELECT|TEXTAREA|IMG)$/.test(e.tagName);
      return own && getComputedStyle(e).visibility !== "hidden";
    });
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
  // 2) fixture (halaman klien) / fixture khusus untuk halaman server tertentu
  const SERVER_FIXTURES = { "/jumpa": "/qa-fixture/jumpa" };
  if (SERVER_FIXTURES[route]) attempts.push({ kind: "fixture", url: `${BASE}${SERVER_FIXTURES[route]}?app=1`, expect: SERVER_FIXTURES[route], mode: "object" });
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
// AUDIT_REQUIRE_RENDER=1 (CI): rute yang diminta wajib bisa dirender.
process.exit(n("FAIL") || (process.env.AUDIT_REQUIRE_RENDER && n("NOT_RENDERABLE")) ? 1 : 0);
