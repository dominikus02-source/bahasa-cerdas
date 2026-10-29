/**
 * Role UMUM — regression tests (tanpa DB; DB & Supabase di-mock).
 *
 * Membuktikan:
 *   1. Matriks helper peran (GURU/MURID/ADMIN/UMUM/tak dikenal/founder).
 *   2. Allowlist Arena UMUM (rute & gim solo; BIGT/multipemain tidak).
 *   3. Simulasi redirect: tidak ada loop untuk semua peran × titik masuk,
 *      dikaitkan dengan assert statis pada sumber layout.
 *   4. AI gateway: UMUM & peran tak dikenal → UMUM_FREE (0 kredit), ditolak
 *      di mode soft; GURU/MURID/founder tidak berubah.
 *   5. Checkout langganan: UMUM → 403 CHECKOUT_FORBIDDEN_ROLE untuk semua
 *      paket (dengan/tanpa kupon) TANPA menyentuh DB.
 *   6. Premium: UMUM dengan flag/subscription aktif tetap FREE.
 *   7. API multipemain/kelas/papan murid → 403 untuk UMUM tanpa query lanjutan.
 *   8. NARA: persona netral + saran umum untuk UMUM.
 *   9. JUMPA tetap default-deny untuk UMUM (ruang mandiri menyusul).
 *
 * Usage: npx tsx scripts/test-role-umum.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import Module from "module";

let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}
const src = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
/** Sumber tanpa komentar — assert "tidak ada X" tidak boleh terkecoh dokumentasi. */
const code = (p: string) => src(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

// ─── Mock DB / Supabase / Redis (dipasang SEBELUM modul aplikasi di-require) ───
type MockUser = { id: string; role: string; isFounder: boolean; [k: string]: unknown };
let currentUser: MockUser | null = null;
let findUniqueResult: any = null;
const dbCalls: string[] = [];

const dbMock: any = new Proxy(
  {},
  {
    get(_t, model: string) {
      if (model === "$transaction") {
        return (...a: unknown[]) => { dbCalls.push("$transaction"); void a; return Promise.reject(new Error("db not allowed")); };
      }
      return new Proxy(
        {},
        {
          get(_m, op: string) {
            return (..._args: unknown[]) => {
              dbCalls.push(`${model}.${op}`);
              if (model === "user" && op === "findUnique") return Promise.resolve(findUniqueResult);
              return Promise.reject(new Error(`db not allowed: ${model}.${op}`));
            };
          },
        },
      );
    },
  },
);
const supabaseMock = {
  getUser: async () => currentUser,
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: currentUser ? { id: "sb-" + currentUser.id } : null } }) },
  }),
};
const redisMock = {
  get: async () => null,
  set: async () => undefined,
  del: async () => undefined,
  getOrSet: async (_k: string, fn: () => Promise<unknown>) => fn(),
};

const M = Module as any;
const ROOT = process.cwd();
const MOCKS: Record<string, unknown> = {
  [resolve(ROOT, "lib/db.ts")]: { db: dbMock, prisma: dbMock, default: dbMock },
  [resolve(ROOT, "lib/supabase/server.ts")]: supabaseMock,
  [resolve(ROOT, "lib/redis.ts")]: { default: redisMock, cache: redisMock, __esModule: true },
};
const origLoad = M._load;
M._load = function (request: string, parent: unknown, isMain: boolean) {
  try {
    const file = M._resolveFilename(request, parent, isMain);
    if (file in MOCKS) return MOCKS[file];
  } catch {
    /* biarkan loader asli melapor */
  }
  return origLoad.apply(this, arguments as any);
};

const R = (p: string) => require(resolve(ROOT, p));

async function main() {
  const roles = R("lib/auth/roles.ts");
  const redirectLib = R("lib/auth/redirect.ts");

  // ═══ 1. Matriks helper peran ═══
  console.log("\n1. Matriks helper peran");
  const matrix: Array<[string, boolean, boolean, boolean, boolean, boolean]> = [
    // role, known, guru, murid, umum, admin
    ["GURU", true, true, false, false, false],
    ["MURID", true, false, true, false, false],
    ["ADMIN", true, false, false, false, true],
    ["UMUM", true, false, false, true, false],
    ["INVESTOR", false, false, false, false, false],
    ["", false, false, false, false, false],
  ];
  for (const [r, known, g, m, u, a] of matrix) {
    assert(roles.isKnownRole(r) === known, `isKnownRole(${JSON.stringify(r)}) = ${known}`);
    assert(roles.isGuru(r) === g && roles.isMurid(r) === m && roles.isUmum(r) === u && roles.isAdmin(r) === a, `predikat ${JSON.stringify(r)} tepat (else ≠ peran lain)`);
  }
  assert(roles.isUmum(null) === false && roles.isUmum(undefined) === false, "isUmum(null/undefined) = false");
  assert(roles.dashboardForRole("MURID") === "/murid/beranda", "dashboard MURID tidak berubah");
  assert(roles.dashboardForRole("GURU") === "/guru/beranda", "dashboard GURU tidak berubah");
  assert(roles.dashboardForRole("ADMIN") === "/admin", "dashboard ADMIN = /admin");
  assert(roles.dashboardForRole("UMUM") === roles.UMUM_HOME && roles.UMUM_HOME === "/umum", "dashboard UMUM = /umum");
  assert(roles.dashboardForRole("HACKER") === roles.ROLE_DENIED_PATH, "peran tak dikenal → halaman akses ditolak (default-deny)");
  assert(redirectLib.dashboardForUser("UMUM", true) === "/guru/beranda", "founder tetap ke dasbor guru");
  assert(redirectLib.dashboardForUser("MURID", false) === "/murid/beranda", "dashboardForUser MURID tidak berubah");
  assert(roles.roleLabel("HACKER") === "Pengguna", "roleLabel tak dikenal = Pengguna");

  // ═══ 2. Allowlist Arena UMUM ═══
  console.log("\n2. Allowlist Arena UMUM");
  const allowed = ["/arena/ai", "/arena/ai/", "/arena/jalur-cerdas", "/arena/jalur-cerdas/unit-1", "/arena/game", "/arena/game/menara", "/arena/game/teka-teki-silang?x=1", "/arena/game/kata-play"];
  const blocked = ["/arena", "/arena/chat", "/arena/league", "/arena/game/kuis-tempur", "/arena/game/tantang", "/arena/game/adu-cepat", "/arena/game/rpg", "/arena/simulasi/bigt", "/arena/simulasi/ukbi", "/arena/aix", "/arena/gamex", "", null];
  for (const p of allowed) assert(roles.isUmumArenaPath(p) === true, `UMUM boleh ${p}`);
  for (const p of blocked) assert(roles.isUmumArenaPath(p) === false, `UMUM ditolak ${JSON.stringify(p)}`);
  const { GAME_REGISTRY } = R("lib/arena/game-registry.ts");
  const regIds = new Set((GAME_REGISTRY as Array<{ id: string }>).map((g) => g.id));
  for (const id of roles.UMUM_GAME_IDS as string[]) assert(regIds.has(id), `gim UMUM "${id}" ada di GAME_REGISTRY`);
  for (const id of ["kuis-tempur", "tantang", "adu-cepat", "rpg"]) assert(!roles.isUmumGameId(id), `gim multipemain/non-solo "${id}" bukan gim UMUM`);
  const chrome = src("components/arena/UmumArenaChrome.tsx");
  assert(!/simulasi\/bigt/.test(chrome.replace(/\/\*[\s\S]*?\*\//g, "")), "nav UMUM tidak menautkan BIGT internal (BIGT = tautan eksternal)");

  // ═══ 3. Simulasi redirect (tanpa loop) + assert statis sumber ═══
  console.log("\n3. Simulasi redirect & sumber layout");
  const guruL = src("app/(dashboard)/guru/layout.tsx");
  const muridL = src("app/(dashboard)/murid/layout.tsx");
  const arenaL = src("app/arena/layout.tsx");
  const aiBc = src("app/ai-bc/page.tsx");
  assert(/dashboardForUser/.test(guruL), "layout guru mengalihkan peran lain via dashboardForUser");
  assert(/dashboardForUser/.test(muridL), "layout murid mengalihkan peran lain via dashboardForUser");
  assert(/isUmumArenaPath\(pathname\)/.test(arenaL) && /redirect\(UMUM_HOME\)/.test(arenaL), "layout arena: UMUM di luar allowlist → UMUM_HOME");
  assert(/UmumRouteGate/.test(arenaL), "layout arena membungkus anak dengan UmumRouteGate (navigasi klien)");
  assert(/\/arena\/ai/.test(aiBc), "/ai-bc meneruskan non-guru ke /arena/ai");
  assert(!/getUser|redirect\(/.test(code("app/auth/akses-ditolak/page.tsx")), "halaman akses ditolak statis (terminal)");

  type U = { role: string; isFounder: boolean };
  const dfu = (u: U) => redirectLib.dashboardForUser(u.role, u.isFounder) as string;
  function hop(u: U, path: string): string | null {
    const priv = u.isFounder;
    if (path.startsWith("/guru")) return u.role === "GURU" || priv ? null : dfu(u);
    if (path.startsWith("/murid")) return u.role === "MURID" || priv ? null : dfu(u);
    if (path.startsWith("/admin")) return u.role === "ADMIN" || priv ? null : "/login";
    if (path === "/login") return dfu(u);
    if (path === "/ai-bc") return u.role === "GURU" || u.role === "ADMIN" || priv ? "/guru/ai-bc" : "/arena/ai";
    if (path.startsWith("/arena")) {
      if (u.role === "MURID" || u.role === "GURU" || priv) return null;
      if (u.role === "UMUM") return roles.isUmumArenaPath(path) ? null : roles.UMUM_HOME;
      return dfu(u);
    }
    if (path === "/umum" || path.startsWith("/umum/")) {
      // requireUmumPage(): UMUM tinggal; peran lain ke dasbornya sendiri.
      if (u.role === "UMUM" && !priv) return null;
      return dfu(u);
    }
    if (path === roles.ROLE_DENIED_PATH) return null;
    return null;
  }
  const users: Array<[string, U]> = [
    ["GURU", { role: "GURU", isFounder: false }],
    ["MURID", { role: "MURID", isFounder: false }],
    ["ADMIN", { role: "ADMIN", isFounder: false }],
    ["UMUM", { role: "UMUM", isFounder: false }],
    ["tak dikenal", { role: "INVESTOR", isFounder: false }],
    ["founder", { role: "GURU", isFounder: true }],
  ];
  const entries = ["/guru/beranda", "/murid/beranda", "/admin", "/arena", "/arena/chat", "/arena/ai", "/arena/game/kuis-tempur", "/ai-bc", "/login", "/umum", "/umum/koleksi"];
  for (const [name, u] of users) {
    for (const e of entries) {
      let p = e;
      const seen = new Set<string>();
      let loop = false;
      for (let i = 0; i < 8; i++) {
        if (seen.has(p)) { loop = true; break; }
        seen.add(p);
        const n = hop(u, p);
        if (n === null) break;
        p = n;
      }
      assert(!loop && hop(u, p) === null, `${name}: ${e} → ${p} (tanpa loop)`);
      if (name === "UMUM") assert(!p.startsWith("/guru") && !p.startsWith("/murid") && !p.startsWith("/admin"), `UMUM: ${e} tidak berakhir di area guru/murid/admin`);
      if (name === "tak dikenal") assert(p === roles.ROLE_DENIED_PATH || p === "/login", `peran tak dikenal: ${e} → ${p} (ditolak)`);
    }
  }

  // ═══ 4. AI gateway ═══
  console.log("\n4. AI gateway (plan & kuota)");
  delete process.env.AI_GATEWAY_HARD_MODE;
  const { resolveUserAiPlan } = R("lib/ai-gateway/plan-resolver.ts");
  const umumPlan = resolveUserAiPlan({ id: "u", role: "UMUM", isFounder: false });
  assert(umumPlan.plan === "UMUM_FREE" && umumPlan.creditsTotal === 0 && umumPlan.unlimited === false, "UMUM → UMUM_FREE, 0 kredit");
  const unkPlan = resolveUserAiPlan({ id: "u", role: "INVESTOR", isFounder: false });
  assert(unkPlan.plan === "UMUM_FREE" && unkPlan.creditsTotal === 0, "peran tak dikenal → UMUM_FREE, 0 kredit");
  const umumPrem = resolveUserAiPlan({ id: "u", role: "UMUM", isFounder: false, isPremium: true, premiumPlan: "PRO", premiumUntil: new Date(Date.now() + 864e5) });
  assert(umumPrem.plan === "UMUM_FREE", "UMUM dengan flag premium tetap UMUM_FREE");
  assert(resolveUserAiPlan({ id: "u", role: "MURID", isFounder: false }).plan === "MURID_FREE", "MURID tetap MURID_FREE (unlimited)");
  const guruFree = resolveUserAiPlan({ id: "u", role: "GURU", isFounder: false });
  assert(guruFree.plan === "GURU_FREE" && guruFree.creditsTotal === 30, "GURU free tetap GURU_FREE 30 kredit");
  assert(resolveUserAiPlan({ id: "u", role: "GURU", isFounder: true }).plan === "FOUNDER", "founder tetap FOUNDER");
  const { checkQuota, checkExportQuota } = R("lib/ai-gateway/quota-checker.ts");
  dbCalls.length = 0;
  const origWarn = console.warn;
  console.warn = () => {};
  const q = await checkQuota({ id: "u1", role: "UMUM", isFounder: false }, "rpp-generator");
  const qx = await checkExportQuota({ id: "u1", role: "UMUM", isFounder: false }, "pdf");
  const qu = await checkQuota({ id: "u2", role: "INVESTOR", isFounder: false }, "rpp-generator");
  console.warn = origWarn;
  assert(q.allowed === false && q.plan === "UMUM_FREE" && q.mode === "soft", "checkQuota UMUM ditolak walau mode soft");
  assert(qx.allowed === false, "checkExportQuota UMUM ditolak");
  assert(qu.allowed === false, "checkQuota peran tak dikenal ditolak");
  assert(dbCalls.length === 0, `kuota UMUM tidak membuat ledger / query DB (calls=${dbCalls.join(",") || "0"})`);

  // ═══ 5. Checkout langganan ═══
  console.log("\n5. Checkout langganan (pembayaran TIDAK diubah)");
  const { NextRequest } = require("next/server");
  const checkout = R("app/api/billing/checkout/route.ts");
  const { PLANS } = R("lib/billing/plans.ts");
  const planIds: string[] = Array.isArray(PLANS) ? PLANS.map((p: any) => p.id) : Object.keys(PLANS ?? {});
  const ids = planIds.length ? planIds : ["GURU_PRO_MONTHLY", "GURU_PRO_YEARLY", "MURID_PREMIUM_MONTHLY", "MURID_PREMIUM_YEARLY"];
  for (const role of ["UMUM", "INVESTOR"]) {
    for (const planId of ids) {
      for (const couponCode of [undefined, "HEMAT50"]) {
        currentUser = { id: "u-" + role, role, isFounder: false };
        dbCalls.length = 0;
        const req = new NextRequest("http://localhost/api/billing/checkout", { method: "POST", body: JSON.stringify({ planId, couponCode }), headers: { "content-type": "application/json" } });
        const res = await checkout.POST(req);
        const body = await res.json().catch(() => ({}));
        const errCode = body?.code ?? body?.error?.code ?? body?.errorCode;
        assert(res.status === 403 && JSON.stringify(body).includes("CHECKOUT_FORBIDDEN_ROLE") && dbCalls.length === 0, `${role} checkout ${planId}${couponCode ? " +kupon" : ""} → 403 ${errCode ?? ""} tanpa DB`);
      }
    }
  }
  // Premium Umum (feat/umum-premium): UMUM masuk allowlist, tetapi hanya untuk
  // paket targetRole UMUM (dicek per paket) dan di balik ENABLE_UMUM_PREMIUM.
  const checkoutSrc = src("app/api/billing/checkout/route.ts");
  assert(/const allowedRoles = \["GURU", "ADMIN", "MURID", "UMUM"\]/.test(checkoutSrc) && /plan\.targetRole !== user\.role/.test(checkoutSrc), "gerbang peran checkout: UMUM hanya paket UMUM (targetRole harus cocok)");

  // ═══ 6. Premium / identitas ═══
  console.log("\n6. Premium & identitas");
  const { resolveIdentity } = R("lib/account/identity.ts");
  const future = new Date(Date.now() + 864e5);
  const umumId = resolveIdentity({ role: "UMUM", isFounder: false, isPremium: true, premiumPlan: "PRO", premiumUntil: future, subscriptions: [{ status: "ACTIVE", currentPeriodStart: new Date(0), currentPeriodEnd: future }] });
  // Premium Umum: UMUM berbayar → UMUM_PREMIUM (tidak pernah PRO/MURID_PREMIUM);
  // Subscription legacy saja (tanpa isPremium) tetap FREE.
  assert(umumId.plan === "UMUM_PREMIUM" && umumId.plan !== "PRO", "resolveIdentity UMUM premium → UMUM_PREMIUM (bukan PRO)");
  const umumSubOnly = resolveIdentity({ role: "UMUM", isFounder: false, isPremium: false, premiumPlan: "FREE", premiumUntil: null, subscriptions: [{ status: "ACTIVE", currentPeriodStart: new Date(0), currentPeriodEnd: future }] });
  assert(umumSubOnly.plan === "FREE" && umumSubOnly.isPremium === false, "resolveIdentity UMUM subscription legacy saja → FREE");
  const muridId = resolveIdentity({ role: "MURID", isFounder: false, isPremium: true, premiumPlan: "PRO", premiumUntil: future });
  assert(muridId.plan === "MURID_PREMIUM", "resolveIdentity MURID premium tetap MURID_PREMIUM");
  const { resolvePlan } = R("lib/premium-economy/plans.ts");
  findUniqueResult = { role: "UMUM", isFounder: false, isPremium: true, premiumPlan: "PRO", premiumUntil: future, trialEndsAt: null, subscriptions: [{ id: "s1", status: "ACTIVE", currentPeriodStart: new Date(0), currentPeriodEnd: future }] };
  const rp = await resolvePlan("umum-sub-1");
  assert(rp.plan !== "PRO" && rp.plan !== "MURID_PREMIUM", `resolvePlan UMUM dengan subscription aktif → bukan PRO/MURID_PREMIUM (dapat ${rp.plan})`);
  findUniqueResult = { ...findUniqueResult, isPremium: false, premiumPlan: "FREE", premiumUntil: null };
  const rpSub = await resolvePlan("umum-sub-2");
  assert(rpSub.plan === "FREE", `resolvePlan UMUM hanya subscription legacy → FREE (dapat ${rpSub.plan})`);
  findUniqueResult = { ...findUniqueResult, isPremium: true, premiumPlan: "PRO", premiumUntil: future };
  findUniqueResult = { ...findUniqueResult, role: "MURID" };
  const rpm = await resolvePlan("murid-sub-1");
  assert(rpm.plan === "MURID_PREMIUM", `resolvePlan MURID dengan subscription aktif tetap MURID_PREMIUM (dapat ${rpm.plan})`);

  // ═══ 7. API 403 untuk UMUM ═══
  console.log("\n7. API multipemain/kelas/papan murid → 403 untuk UMUM");
  const umum: MockUser = { id: "umum-1", role: "UMUM", isFounder: false };
  const jsonReq = (url: string, body: unknown = {}) => new NextRequest(url, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
  const ctx = { params: Promise.resolve({ id: "x" }) };
  const cases: Array<[string, () => Promise<Response>]> = [
    ["GET /api/game/tantang", () => R("app/api/game/tantang/route.ts").GET()],
    ["POST /api/game/tantang", () => R("app/api/game/tantang/route.ts").POST(jsonReq("http://l/api/game/tantang", { opponentId: "m1" }))],
    ["GET /api/game/tantang/[id]", () => R("app/api/game/tantang/[id]/route.ts").GET(jsonReq("http://l/x"), ctx)],
    ["POST /api/game/tantang/[id]/submit", () => R("app/api/game/tantang/[id]/submit/route.ts").POST(jsonReq("http://l/x", {}), ctx)],
    ["POST /api/game/kuis-tempur/invite", () => R("app/api/game/kuis-tempur/invite/route.ts").POST(jsonReq("http://l/x", { opponentId: "m1" }))],
    ["GET /api/game/socket-token", () => R("app/api/game/socket-token/route.ts").GET()],
    ["POST /api/game/room", () => R("app/api/game/room/route.ts").POST(jsonReq("http://l/x", {}))],
    ["GET /api/player/leaderboard", () => R("app/api/player/leaderboard/route.ts").GET(new NextRequest("http://l/api/player/leaderboard"))],
    ["GET /api/arena/competition", () => R("app/api/arena/competition/route.ts").GET()],
    ["GET /api/siswa/league", () => R("app/api/siswa/league/route.ts").GET()],
  ];
  for (const [label, call] of cases) {
    currentUser = umum;
    dbCalls.length = 0;
    let status: number | string;
    try {
      status = (await call()).status;
    } catch (e) {
      status = `error: ${(e as Error).message}`;
    }
    assert(status === 403 && dbCalls.length === 0, `${label} → ${status} tanpa query DB`);
  }
  currentUser = umum;
  findUniqueResult = { ...umum, supabaseId: "sb-umum-1" };
  dbCalls.length = 0;
  const gj = await R("app/api/group/join/route.ts").POST(jsonReq("http://l/api/group/join", { accessCode: "ABC123" }));
  assert(gj.status === 403 && dbCalls.join(",") === "user.findUnique", `POST /api/group/join → ${gj.status}; hanya baca user (calls=${dbCalls.join(",")})`);
  assert(/role: \{ not: "UMUM" \}/.test(src("app/api/siswa/league/route.ts")), "peer liga murid mengecualikan UMUM");
  assert(/user: \{ role: "MURID"/.test(src("lib/gamification/leaderboard.ts")), "papan peringkat murid tetap memfilter role MURID");
  assert(/user: \{ role: "MURID" \}/.test(src("lib/gamification/podium-rewards.ts")), "podium/musim tetap memfilter role MURID");
  assert(/where: \{ userId, createdAt: \{ gte: awalHariWIB\(\) \} \}/.test(src("lib/award-xp.ts")), "kuota XP harian per pengguna (UMUM tidak memengaruhi murid)");

  // ═══ 8. NARA ═══
  console.log("\n8. NARA persona netral");
  const personas = R("src/ai/bc/personas.ts");
  assert(personas.getPersonaForUser({ role: "UMUM" }) === personas.NEUTRAL_PERSONA, "getPersonaForUser(UMUM) = NEUTRAL_PERSONA");
  assert(personas.getPersonaForUser({ role: "MURID" }) === personas.STUDENT_PERSONA, "getPersonaForUser(MURID) tidak berubah");
  const { getBcHints } = R("lib/ai-bc/context.ts");
  dbCalls.length = 0;
  const hints = await getBcHints({ id: "umum-1", role: "UMUM", isFounder: false });
  assert(Array.isArray(hints) && hints.length === 2 && hints.some((h: any) => h.label === "Arti kata"), "saran UMUM = saran umum (Arti kata …)");
  assert(dbCalls.length === 0, "saran UMUM tanpa query data murid/guru");
  const arenaAi = src("app/arena/ai/page.tsx");
  assert(/NEUTRAL_PERSONA\.title/.test(arenaAi) && /isUmum\(/.test(arenaAi), "/arena/ai memakai persona netral untuk UMUM");

  // ═══ 9. JUMPA ═══
  console.log("\n9. JUMPA");
  const perm = R("lib/jumpa/permissions.ts");
  assert(perm.effectiveRole({ role: "UMUM", isFounder: false, isJunior: false }) === null, "effectiveRole(UMUM) = null (belum ada ruang mandiri)");
  assert(perm.effectiveRole({ role: "GURU", isFounder: false, isJunior: false }) === "GURU" && perm.effectiveRole({ role: "MURID", isFounder: false, isJunior: false }) === "MURID", "effectiveRole GURU/MURID tidak berubah");
  for (const kind of ["KELAS", "GURU", "MURID"]) {
    const d = perm.canCreateRoom({ actor: { role: "UMUM", isFounder: false, isJunior: false }, kind, group: { ownedByActor: true, isActive: true, actorIsMember: true } });
    assert(d.ok === false, `UMUM tidak bisa membuat ruang ${kind}`);
  }
  // JUMPA siap: UMUM membuka beranda JUMPA asli (tanpa status pengembangan),
  // tombol kembali ke /umum. Izin ruang tetap default-deny di server (di atas).
  assert(/isUmum\(user\.role\) \? UMUM_HOME/.test(src("app/jumpa/page.tsx")) && !/ComingSoon/.test(src("app/jumpa/page.tsx")), "/jumpa untuk UMUM menampilkan beranda JUMPA (tanpa status pengembangan), kembali ke /umum");
  assert(/isUmum\(user\.role\)/.test(src("app/main-bersama/page.tsx")), "/main-bersama untuk UMUM menampilkan status pengembangan");
  const aku = code("app/umum/aku-sastrawan/page.tsx");
  assert(/ComingSoon/.test(aku) && !/\/murid\/katastra/.test(aku), "/umum/aku-sastrawan coming-soon, tanpa tautan ke /murid/katastra");
  assert(/Sedang dalam pengembangan/.test(src("components/umum/ComingSoon.tsx")), "ComingSoon menampilkan 'Sedang dalam pengembangan'");

  // ═══ 10. Toko Karya (pembelian karya) tidak diblokir peran ═══
  console.log("\n10. Toko Karya");
  const purchase = code("app/api/marketplace/purchase/route.ts");
  assert(!/\.role\b/.test(purchase), "/api/marketplace/purchase tidak memeriksa peran (UMUM bisa membeli karya)");

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Runner error:", e);
  process.exit(1);
});
