/**
 * Premium Umum — uji regresi & perilaku (tanpa DB nyata, tanpa Midtrans).
 *
 * DB, Supabase, Redis, Midtrans Snap & mesin komisi di-mock dengan DB
 * in-memory stateful (unik + rollback $transaction), jadi alur nyata
 * checkout → webhook → identitas → uji coba dijalankan apa adanya.
 *
 *   1. Paket: harga/durasi/tanpa kredit, tipe transaksi, webhook fallback
 *      TIDAK menebak UMUM dari nominal, halaman harga membaca plans.ts.
 *   2. Identitas: resolveIdentity / resolvePlan / hasUmumPremium / JUMPA tier.
 *   3. Checkout: matriks peran × paket × flag (lintas peran 403 tanpa DB),
 *      flag mati 403 sebelum DB, resume pesanan ≤15 menit, guru/murid tetap.
 *   4. Kupon: hanya kupon khusus UMUM untuk paket UMUM.
 *   5. Webhook UMUM: aktivasi, duplikat, nominal salah, metadata hilang /
 *      asing / peran salah → tinjau manual, tanpa kredit & komisi,
 *      bayar saat uji coba menambah sisa hari, menumpuk masa aktif.
 *   6. Uji coba: sekali per akun & per orang (bertahan hapus+daftar ulang,
 *      email Gmail dinormalisasi, id Google), batal, kedaluwarsa, sinyal IP
 *      lunak (tidak memblokir), flag mati, peran lain ditolak.
 *   7. Admin manual-activate untuk pembayaran UMUM yang ditinjau.
 *
 * Usage: npx tsx scripts/test-umum-premium.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import Module from "module";

let passed = 0;
let failed = 0;
function assert(condition: unknown, label: string) {
  if (condition) { passed++; console.log(`  ✅ ${label}`); } else { failed++; console.log(`  ❌ ${label}`); }
}
const src = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const DAY = 86_400_000;
const near = (a: Date | null | undefined, b: number, tol = 5_000) => !!a && Math.abs(new Date(a).getTime() - b) <= tol;

// ─── DB in-memory (stateful) ───────────────────────────────────────────────
type Row = Record<string, any>;
let tables: Record<string, Row[]> = {};
const opLog: string[] = [];
let seq = 0;
function resetDb() { tables = {}; opLog.length = 0; }
const T = (m: string) => (tables[m] ??= []);
const isObj = (v: unknown) => v !== null && typeof v === "object" && !(v instanceof Date) && !Array.isArray(v);
const eq = (a: any, b: any) => (a instanceof Date || b instanceof Date ? a != null && b != null && new Date(a).getTime() === new Date(b).getTime() : (a ?? null) === (b ?? null));
function cond(v: any, c: any): boolean {
  if (!isObj(c)) return eq(v, c);
  if ("path" in c) { // Json path filter (Prisma): { path: [k], equals }
    let cur = v; for (const k of c.path) cur = cur?.[k];
    return "equals" in c ? eq(cur, c.equals) : true;
  }
  return Object.entries(c).every(([op, x]: [string, any]) => {
    if (op === "not") return isObj(x) ? !cond(v, x) : !eq(v, x);
    if (op === "gt") return v != null && v > x;
    if (op === "gte") return v != null && v >= x;
    if (op === "lt") return v != null && v < x;
    if (op === "lte") return v != null && v <= x;
    if (op === "in") return x.some((y: any) => eq(v, y));
    if (op === "notIn") return !x.some((y: any) => eq(v, y));
    if (op === "startsWith") return typeof v === "string" && v.startsWith(x);
    if (op === "endsWith") return typeof v === "string" && v.endsWith(x);
    if (op === "equals") return eq(v, x);
    return true;
  });
}
function match(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([k, c]) => {
    if (k === "AND") return (c as Row[]).every((w) => match(row, w));
    if (k === "OR") return (c as Row[]).some((w) => match(row, w));
    if (k === "NOT") return !match(row, c);
    if (isObj(c) && !("path" in c) && Object.keys(c).some((x) => !["not", "gt", "gte", "lt", "lte", "in", "notIn", "startsWith", "endsWith", "equals"].includes(x))) {
      return match(row[k] ?? {}, c); // compound unique (userId_period_plan) / relation
    }
    return cond(row[k], c);
  });
}
const clone = <X,>(x: X): X => structuredClone(x);
function apply(row: Row, data: Row) {
  for (const [k, v] of Object.entries(data)) {
    if (isObj(v) && "increment" in (v as Row)) row[k] = (row[k] ?? 0) + (v as Row).increment;
    else row[k] = v;
  }
  row.updatedAt = new Date(Date.now() + ++seq); // monoton (kunci optimistik manual-activate)
}
const UNIQUE: Record<string, string[][]> = { trialClaim: [["kind", "emailHash"], ["kind", "googleSubHash"]], user: [["email"], ["supabaseId"]], transaksi: [["orderId"]] };
function checkUnique(model: string, row: Row, selfId?: string) {
  for (const keys of UNIQUE[model] ?? []) {
    if (keys.some((k) => row[k] == null)) continue;
    if (T(model).some((r) => r.id !== selfId && keys.every((k) => eq(r[k], row[k])))) {
      throw Object.assign(new Error(`Unique constraint failed on ${model}(${keys.join(",")})`), { code: "P2002" });
    }
  }
}
function withInclude(row: Row, include?: Row) {
  if (include?.user && row.userId) { const u = T("user").find((x) => x.id === row.userId); row.user = u ? clone(u) : null; }
  return row;
}
function modelApi(model: string) {
  const log = (op: string) => opLog.push(`${model}.${op}`);
  const sorted = (rows: Row[], orderBy?: Row) => {
    if (!orderBy) return rows;
    const [[k, dir]] = Object.entries(orderBy);
    return [...rows].sort((a, b) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0) * (dir === "desc" ? -1 : 1));
  };
  return {
    findUnique: async (a: Row) => { log("findUnique"); const r = T(model).find((x) => match(x, a.where)); return r ? withInclude(clone(r), a.include) : null; },
    findFirst: async (a: Row = {}) => { log("findFirst"); const r = sorted(T(model).filter((x) => match(x, a.where)), a.orderBy)[0]; return r ? clone(r) : null; },
    findMany: async (a: Row = {}) => { log("findMany"); return sorted(T(model).filter((x) => match(x, a.where)), a.orderBy).slice(0, a.take ?? Infinity).map(clone); },
    count: async (a: Row = {}) => { log("count"); return T(model).filter((x) => match(x, a.where)).length; },
    aggregate: async () => { log("aggregate"); return { _sum: { amount: 0 }, _count: 0 }; },
    groupBy: async () => { log("groupBy"); return []; },
    create: async (a: Row) => {
      log("create");
      const row: Row = { id: `${model}-${++seq}`, createdAt: new Date(), updatedAt: new Date(), ...clone(a.data) };
      checkUnique(model, row);
      T(model).push(row);
      return clone(row);
    },
    update: async (a: Row) => {
      log("update");
      const r = T(model).find((x) => match(x, a.where));
      if (!r) throw Object.assign(new Error(`${model} not found`), { code: "P2025" });
      const next = { ...r }; apply(next, a.data); checkUnique(model, next, r.id); Object.assign(r, next);
      return clone(r);
    },
    updateMany: async (a: Row) => { log("updateMany"); const rows = T(model).filter((x) => match(x, a.where)); rows.forEach((r) => apply(r, a.data)); return { count: rows.length }; },
    delete: async (a: Row) => { log("delete"); const i = T(model).findIndex((x) => match(x, a.where)); const [r] = T(model).splice(i, 1); return r; },
    upsert: async (a: Row) => { log("upsert"); const r = T(model).find((x) => match(x, a.where)); if (r) { apply(r, a.update); return clone(r); } const row = { id: `${model}-${++seq}`, createdAt: new Date(), ...clone(a.create) }; T(model).push(row); return clone(row); },
  };
}
const dbMock: any = new Proxy({}, {
  get(_t, model: string) {
    if (model === "$transaction") {
      return async (arg: any) => {
        opLog.push("$transaction");
        if (Array.isArray(arg)) return Promise.all(arg);
        const snapshot = clone(tables);
        try { return await arg(dbMock); } catch (e) { tables = snapshot; throw e; }
      };
    }
    if (model === "$queryRaw" || model === "$executeRaw") return async () => [];
    if (typeof model !== "string" || model === "then") return undefined;
    return modelApi(model);
  },
});

// ─── Mocks lain ───────────────────────────────────────────────────────────
let currentUser: Row | null = null;
const supabaseMock = {
  getUser: async () => currentUser,
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser ? { id: currentUser.supabaseId, identities: currentUser.googleSub ? [{ provider: "google", identity_data: { sub: currentUser.googleSub } }] : [] } : null } }) } }),
};
const cacheDel: string[] = [];
const redisMock = { get: async () => null, set: async () => undefined, del: async (k: string) => { cacheDel.push(k); }, getOrSet: async (_k: string, fn: () => Promise<unknown>) => fn() };
const snapCalls: Row[] = [];
const commissionCalls: string[] = [];
const ROOT = process.cwd();
const M = Module as any;
const origLoad = M._load;
let midtransReal: any = null;
const MOCKS: Record<string, () => unknown> = {
  [resolve(ROOT, "lib/db.ts")]: () => ({ db: dbMock, prisma: dbMock, default: dbMock }),
  [resolve(ROOT, "lib/supabase/server.ts")]: () => supabaseMock,
  [resolve(ROOT, "lib/redis.ts")]: () => ({ default: redisMock, cache: redisMock, __esModule: true }),
  [resolve(ROOT, "lib/commission/engine.ts")]: () => ({
    createCommissionFromTransaction: async (id: string) => { commissionCalls.push(`create:${id}`); return { created: false }; },
    reverseCommissionForTransaction: async (id: string) => { commissionCalls.push(`reverse:${id}`); },
  }),
  [resolve(ROOT, "lib/guru/risk/events.ts")]: () => ({ evaluateRapidPremiumSignal: async () => {}, evaluateRefundPatternSignal: async () => {}, evaluateDestinationChangeSignal: async () => {} }),
  [resolve(ROOT, "lib/payments/midtrans-server.ts")]: () => ({
    ...midtransReal,
    validateMidtransConfig: () => {},
    createMidtransSnapTransaction: async (p: Row) => { snapCalls.push(p); return { token: `snap-${snapCalls.length}`, redirectUrl: `https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-${snapCalls.length}` }; },
  }),
};
M._load = function (request: string, parent: unknown, isMain: boolean) {
  let file: string | null = null;
  try { file = M._resolveFilename(request, parent, isMain); } catch { /* biarkan loader asli */ }
  if (file && file in MOCKS) {
    if (file.endsWith("midtrans-server.ts") && !midtransReal) midtransReal = origLoad.apply(this, arguments as any);
    return MOCKS[file]();
  }
  return origLoad.apply(this, arguments as any);
};
const R = (p: string) => require(resolve(ROOT, p));

// Tidak pernah memakai kunci Midtrans sungguhan di uji ini.
delete process.env.MIDTRANS_SERVER_KEY;
delete process.env.ENABLE_UMUM_PREMIUM;
const flag = (on: boolean) => { if (on) process.env.ENABLE_UMUM_PREMIUM = "true"; else delete process.env.ENABLE_UMUM_PREMIUM; };

function addUser(u: Row): Row {
  const row: Row = {
    id: u.id, supabaseId: `sb-${u.id}`, email: `${u.id}@contoh.id`, fullName: `User ${u.id}`, role: "UMUM", isFounder: false,
    isPremium: false, premiumPlan: "FREE", premiumUntil: null, trialStartedAt: null, trialEndsAt: null, trialPlan: null, trialCreditsTotal: null,
    createdAt: new Date(), updatedAt: new Date(), ...u,
  };
  T("user").push(row);
  return row;
}
const getRow = (model: string, id: string) => T(model).find((r) => r.id === id || r.orderId === id)!;

async function main() {
  const plans = R("lib/billing/plans.ts");
  const { resolveIdentity, UMUM_TRIAL_PLAN } = R("lib/account/identity.ts");
  const { hasUmumPremium, umumPremiumState } = R("lib/umum/premium.ts");
  const { tierForPlan } = R("lib/jumpa/entitlement.ts");
  const trial = R("lib/umum/trial.ts");
  const kupon = R("lib/billing/kupon.ts");
  const { NextRequest } = require("next/server");

  // ═══ 1. Paket ═══
  console.log("\n1. Paket Premium Umum");
  const mo = plans.getPlan("UMUM_PREMIUM_MONTHLY");
  const yr = plans.getPlan("UMUM_PREMIUM_YEARLY");
  assert(mo?.price === 79000 && mo.durationDays === 30 && mo.aiCreditsMonthly === 0 && mo.targetRole === "UMUM", "UMUM_PREMIUM_MONTHLY = Rp79.000 / 30 hari / 0 kredit / UMUM");
  assert(yr?.price === 849000 && yr.durationDays === 365 && yr.aiCreditsMonthly === 0 && yr.targetRole === "UMUM", "UMUM_PREMIUM_YEARLY = Rp849.000 / 365 hari / 0 kredit / UMUM");
  assert(plans.getUmumPlans().map((p: Row) => p.planId).sort().join() === "UMUM_PREMIUM_MONTHLY,UMUM_PREMIUM_YEARLY", "getUmumPlans hanya 2 paket UMUM");
  assert(plans.isUmumPlanId("UMUM_PREMIUM_MONTHLY") && !plans.isUmumPlanId("GURU_PRO_MONTHLY") && !plans.isUmumPlanId("UMUM_PREMIUM_X") && !plans.isUmumPlanId(undefined), "isUmumPlanId: allowlist persis");
  assert(plans.transactionTypeForPlan(mo) === "UMUM_PREMIUM" && plans.transactionTypeForPlan(plans.getPlan("GURU_PRO_MONTHLY")) === "PREMIUM_UPGRADE" && plans.transactionTypeForPlan(plans.getPlan("MURID_PREMIUM_MONTHLY")) === "MURID_PREMIUM", "tipe transaksi: UMUM_PREMIUM / PREMIUM_UPGRADE / MURID_PREMIUM (guru/murid tetap)");
  assert(plans.transactionTypeForPlan({ ...mo, targetRole: "INVESTOR" }) === null, "targetRole asing → null (checkout menolak)");
  assert(plans.getPlan("GURU_PRO_MONTHLY").price === 49000 && plans.getPlan("GURU_PRO_YEARLY").price === 399000 && plans.getPlan("MURID_PREMIUM_MONTHLY").price === 19000 && plans.getPlan("MURID_PREMIUM_YEARLY").price === 180000, "harga guru/murid tidak berubah");
  const notif = src("lib/payments/midtrans-notification.ts");
  const fallback = notif.slice(notif.indexOf("function getPlanFromAmount"), notif.indexOf("}", notif.indexOf("MURID_PREMIUM_MONTHLY\" };")) + 1);
  assert(fallback.length > 0 && !/79000|849000|79_000|849_000|UMUM/.test(fallback), "fallback nominal webhook tidak mengenal UMUM (tidak ditebak dari nominal)");
  const page = src("app/umum/premium/page.tsx");
  assert(/getUmumPlans\(\)/.test(page) && !/79\.?000|849\.?000/.test(src("components/umum/UmumPremiumClient.tsx")), "halaman /umum/premium membaca harga dari plans.ts (tidak hardcode)");
  assert(/Tidak ada perpanjangan atau tagihan otomatis/.test(src("components/umum/UmumPremiumClient.tsx")) && /berhenti kapan saja/.test(src("components/umum/UmumPremiumClient.tsx")), "halaman menyatakan sekali bayar, tanpa tagihan otomatis, berhenti kapan saja");
  assert(/Coba gratis 1 bulan/.test(src("components/umum/UmumPremiumClient.tsx")) && /UmumTrialOffer/.test(src("app/umum/page.tsx")), "tawaran 'Coba gratis 1 bulan' di /umum/premium & tawaran lunak di /umum");
  assert(!/fetch\(/.test(src("components/umum/UmumTrialOffer.tsx")), "tawaran di /umum hanya tautan (tidak mengklaim otomatis)");

  // ═══ 2. Identitas ═══
  console.log("\n2. Identitas & hak");
  const fut = new Date(Date.now() + 10 * DAY), past = new Date(Date.now() - DAY);
  const paidU = { role: "UMUM", isFounder: false, isPremium: true, premiumPlan: "PRO", premiumUntil: fut };
  const trialU = { role: "UMUM", isFounder: false, isPremium: false, premiumPlan: "FREE", trialPlan: UMUM_TRIAL_PLAN, trialEndsAt: fut };
  let r = resolveIdentity(paidU);
  assert(r.plan === "UMUM_PREMIUM" && r.subscriptionStatus === "ACTIVE" && r.badgeKind === "umum" && r.isPremium, "UMUM bayar → UMUM_PREMIUM/ACTIVE, lencana umum");
  r = resolveIdentity(trialU);
  assert(r.plan === "UMUM_PREMIUM" && r.subscriptionStatus === "TRIALING" && r.isPremium === false, "UMUM uji coba → UMUM_PREMIUM/TRIALING (isPremium tetap false)");
  assert(resolveIdentity({ ...trialU, trialEndsAt: past }).plan === "FREE", "uji coba kedaluwarsa → FREE");
  assert(resolveIdentity({ ...paidU, premiumUntil: past }).plan === "FREE", "bayar kedaluwarsa → FREE");
  assert(resolveIdentity({ ...trialU, trialPlan: "PRO" }).plan === "FREE", "UMUM dengan trial guru (trialPlan lain) → FREE");
  assert(resolveIdentity({ ...trialU, role: "GURU" }).plan === "PRO" && resolveIdentity({ role: "GURU", isPremium: true, premiumPlan: "PRO", premiumUntil: fut }).plan === "PRO", "GURU tetap PRO (bayar/trial) — tidak berubah");
  assert(resolveIdentity({ role: "MURID", isPremium: true, premiumPlan: "PRO", premiumUntil: fut }).plan === "MURID_PREMIUM", "MURID tetap MURID_PREMIUM");
  assert(resolveIdentity({ role: "MURID", trialPlan: UMUM_TRIAL_PLAN, trialEndsAt: fut }).plan === "FREE", "MURID dengan trialPlan UMUM → FREE (tidak bocor)");
  assert(hasUmumPremium(paidU) && hasUmumPremium(trialU) && !hasUmumPremium({ ...trialU, trialEndsAt: past }) && !hasUmumPremium(null), "hasUmumPremium: bayar/uji coba aktif saja");
  assert(hasUmumPremium({ role: "GURU", isFounder: true }) && umumPremiumState({ role: "ADMIN" }).source === "staff", "founder/ADMIN = staf (boleh)");
  assert(!hasUmumPremium({ role: "GURU", isPremium: true, premiumPlan: "PRO", premiumUntil: fut }), "guru Pro bukan Premium Umum");
  assert(tierForPlan("UMUM_PREMIUM") === "PREMIUM" && tierForPlan("PRO") === "PREMIUM" && tierForPlan("MURID_PREMIUM") === "FREE" && tierForPlan("FREE") === "FREE", "JUMPA: UMUM_PREMIUM → tier PREMIUM (guru premium); MURID/FREE tetap");
  const { resolvePlanForUser } = R("lib/premium-economy/plans.ts");
  assert(resolvePlanForUser(paidU).plan === "UMUM_PREMIUM" && resolvePlanForUser(trialU).plan === "UMUM_PREMIUM", "resolvePlanForUser mengenali UMUM_PREMIUM");
  const { PLAN_MATRIX, getPlanLimits } = (() => { try { return R("lib/premium-economy/matrix.ts"); } catch { return {} as Row; } })();
  const lim = getPlanLimits?.("UMUM_PREMIUM") ?? PLAN_MATRIX?.UMUM_PREMIUM;
  assert(!lim || (lim.aiCreditsMonthly ?? 0) === 0, "matriks ekonomi: UMUM_PREMIUM tanpa kredit AI");

  // ═══ 3. Checkout ═══
  console.log("\n3. Checkout (matriks peran × paket × flag)");
  const checkout = R("app/api/billing/checkout/route.ts");
  const post = async (u: Row, planId: string, couponCode?: string) => {
    currentUser = { ...u };
    await new Promise((r) => setTimeout(r, 3)); // orderId berbasis milidetik
    const res = await checkout.POST(new NextRequest("http://localhost/api/billing/checkout", { method: "POST", body: JSON.stringify({ planId, couponCode }), headers: { "content-type": "application/json" } }));
    return { status: res.status as number, body: await res.json().catch(() => ({})) };
  };
  const roleUser = (role: string, extra: Row = {}) => ({ id: `u-${role.toLowerCase()}`, supabaseId: `sb-${role}`, email: `${role}@contoh.id`, fullName: role, role, isFounder: false, ...extra });
  const allPlans = ["GURU_PRO_MONTHLY", "GURU_PRO_YEARLY", "MURID_PREMIUM_MONTHLY", "MURID_PREMIUM_YEARLY", "UMUM_PREMIUM_MONTHLY", "UMUM_PREMIUM_YEARLY"];
  const owner: Record<string, string> = { GURU_PRO_MONTHLY: "GURU", GURU_PRO_YEARLY: "GURU", MURID_PREMIUM_MONTHLY: "MURID", MURID_PREMIUM_YEARLY: "MURID", UMUM_PREMIUM_MONTHLY: "UMUM", UMUM_PREMIUM_YEARLY: "UMUM" };
  for (const on of [false, true]) {
    flag(on);
    for (const role of ["GURU", "MURID", "UMUM", "INVESTOR"]) {
      for (const planId of allPlans) {
        resetDb(); snapCalls.length = 0;
        const res = await post(roleUser(role), planId);
        const allowed = owner[planId] === role && (owner[planId] !== "UMUM" || on);
        if (allowed) {
          const tx = T("transaksi")[0];
          assert(res.status === 200 && res.body.token && snapCalls.length === 1 && tx?.type === plans.transactionTypeForPlan(plans.getPlan(planId)) && tx.amount === plans.getPlan(planId).price && tx.metadata.planId === planId,
            `flag ${on ? "ON " : "OFF"} ${role} × ${planId} → 200, Snap 1×, Transaksi ${tx?.type} Rp${tx?.amount}`);
        } else {
          assert(res.status === 403 && res.body.error === "CHECKOUT_FORBIDDEN_ROLE" && opLog.length === 0 && snapCalls.length === 0,
            `flag ${on ? "ON " : "OFF"} ${role} × ${planId} → 403 tanpa DB/Snap`);
        }
      }
    }
  }
  flag(false);
  resetDb(); snapCalls.length = 0;
  let res = await post(roleUser("GURU", { isFounder: true }), "UMUM_PREMIUM_MONTHLY");
  assert(res.status === 403 && opLog.length === 0, "flag OFF: founder pun 403 untuk paket UMUM (sebelum bypass, tanpa DB)");
  flag(true);
  resetDb();
  addUser(roleUser("GURU", { isFounder: true }));
  res = await post(roleUser("GURU", { isFounder: true }), "GURU_PRO_MONTHLY");
  assert(res.status === 200 && res.body.bypass === true, "founder bypass guru tetap (regresi)");

  console.log("\n3b. Resume pesanan UMUM ≤ 15 menit");
  resetDb(); snapCalls.length = 0;
  const umumBuyer = roleUser("UMUM");
  const first = await post(umumBuyer, "UMUM_PREMIUM_MONTHLY");
  const again = await post(umumBuyer, "UMUM_PREMIUM_MONTHLY");
  assert(first.status === 200 && again.body.resumed === true && again.body.orderId === first.body.orderId && again.body.token === first.body.token && snapCalls.length === 1 && T("transaksi").length === 1, "klik ulang → pesanan yang sama dilanjutkan (Snap tidak dipanggil lagi)");
  const other = await post(umumBuyer, "UMUM_PREMIUM_YEARLY");
  assert(other.status === 200 && !other.body.resumed && other.body.orderId !== first.body.orderId && snapCalls.length === 2, "paket berbeda → pesanan baru");
  T("transaksi").forEach((t) => { t.createdAt = new Date(Date.now() - 16 * 60_000); });
  const late = await post(umumBuyer, "UMUM_PREMIUM_MONTHLY");
  assert(late.status === 200 && !late.body.resumed && snapCalls.length === 3, "> 15 menit → pesanan baru (yang lama REPLACED)");
  assert(T("transaksi").filter((t) => t.status === "REPLACED").length === 2, "pesanan lama ditandai REPLACED (alur lama tetap)");
  resetDb(); snapCalls.length = 0;
  const g1 = await post(roleUser("GURU"), "GURU_PRO_MONTHLY");
  const g2 = await post(roleUser("GURU"), "GURU_PRO_MONTHLY");
  assert(g1.status === 200 && g2.status === 200 && !g2.body.resumed && snapCalls.length === 2, "guru: tanpa resume (perilaku lama)");

  // ═══ 4. Kupon ═══
  console.log("\n4. Kupon: hanya kupon khusus UMUM");
  const K = (kode: string, x: Row) => T("kupon").push({ id: `k-${kode}`, kode, aktif: true, hargaFixed: null, diskonPersen: 10, hargaMinimal: null, planId: null, untukRole: "*", jumlahTerpakai: 0, batasPemakaian: null, mulaiBerlaku: null, berakhirPada: null, ...x });
  resetDb();
  K("SEMUA", {}); K("GURUAJA", { untukRole: "GURU" }); K("UMUM10", { untukRole: "UMUM" }); K("UMUMTHN", { untukRole: "*", planId: "UMUM_PREMIUM_YEARLY" }); K("MURIDAJA", { untukRole: "MURID" });
  const kv = async (kode: string, role: string, planId: string) => {
    try { const v = await kupon.validasiKupon(kode, { role }, { planId, price: plans.getPlan(planId).price }); return v.hargaDiskon as number; } catch (e) { return (e as Error).message; }
  };
  assert(typeof (await kv("UMUM10", "UMUM", "UMUM_PREMIUM_MONTHLY")) === "number", "kupon untukRole UMUM → berlaku untuk paket UMUM");
  assert(typeof (await kv("UMUMTHN", "UMUM", "UMUM_PREMIUM_YEARLY")) === "number", "kupon terkunci UMUM_PREMIUM_YEARLY → berlaku");
  assert(/Premium Umum/.test(String(await kv("SEMUA", "UMUM", "UMUM_PREMIUM_MONTHLY"))), "kupon '*' → ditolak untuk Premium Umum");
  assert(/Premium Umum/.test(String(await kv("GURUAJA", "UMUM", "UMUM_PREMIUM_MONTHLY"))) && typeof (await kv("MURIDAJA", "UMUM", "UMUM_PREMIUM_MONTHLY")) === "string", "kupon guru/murid → ditolak untuk paket UMUM");
  assert(typeof (await kv("UMUM10", "GURU", "GURU_PRO_MONTHLY")) === "string" && typeof (await kv("UMUM10", "MURID", "MURID_PREMIUM_MONTHLY")) === "string", "kupon UMUM → tidak berlaku untuk guru/murid");
  assert(typeof (await kv("SEMUA", "GURU", "GURU_PRO_MONTHLY")) === "number" && typeof (await kv("GURUAJA", "GURU", "GURU_PRO_MONTHLY")) === "number", "kupon guru & '*' untuk guru tetap berlaku (regresi)");
  snapCalls.length = 0;
  res = await post(umumBuyer, "UMUM_PREMIUM_MONTHLY", "SEMUA");
  assert(res.status === 400 && res.body.error === "CHECKOUT_INVALID_COUPON" && snapCalls.length === 0 && T("transaksi").length === 0, "checkout UMUM + kupon '*' → 400, tanpa Transaksi/Snap");
  res = await post(umumBuyer, "UMUM_PREMIUM_MONTHLY", "UMUM10");
  const kt = T("transaksi")[0];
  assert(res.status === 200 && kt.amount === 71100 && kt.metadata.kuponKode === "UMUM10" && snapCalls[0]?.amount === 71100, "checkout UMUM + kupon UMUM10 → Rp71.100 ditagih");

  // ═══ 5. Webhook ═══
  console.log("\n5. Webhook Midtrans — UMUM_PREMIUM");
  const { processVerifiedMidtransNotification: hook } = R("lib/payments/midtrans-notification.ts");
  let n = 0;
  const order = (userId: string, amount: number, metadata: Row | null, type = "UMUM_PREMIUM") => {
    const orderId = `BC-T-${++n}`;
    T("transaksi").push({ id: `tx-${n}`, orderId, userId, type, amount, status: "PENDING", reference: metadata?.planId ?? null, metadata, createdAt: new Date(), updatedAt: new Date() });
    return orderId;
  };
  const settle = (orderId: string, amount: number) => hook({ order_id: orderId, transaction_status: "settlement", gross_amount: `${amount}.00`, transaction_id: `mid-${orderId}`, payment_type: "qris" });
  const sideEffects = () => opLog.filter((o) => o.startsWith("aiCreditLedger") || o.startsWith("teacherCommission") || o.startsWith("commission")).length + commissionCalls.length;

  resetDb(); commissionCalls.length = 0; cacheDel.length = 0;
  flag(false); // webhook mengabaikan flag
  let u = addUser({ id: "w1" });
  let oid = order("w1", 79000, { planId: "UMUM_PREMIUM_MONTHLY", durationDays: 30, aiCreditsMonthly: 0 });
  let out = await settle(oid, 79000);
  u = getRow("user", "w1");
  assert(out.httpStatus === 200 && u.isPremium && near(u.premiumUntil, Date.now() + 30 * DAY) && resolveIdentity(u).plan === "UMUM_PREMIUM", "lunas → Premium Umum 30 hari (flag mati diabaikan webhook)");
  assert(getRow("transaksi", oid).status === "SUCCESS" && sideEffects() === 0, "tanpa ledger kredit AI & tanpa komisi");
  assert(cacheDel.includes("user:me:id:sb-w1") && cacheDel.includes("user:me:v2:id:sb-w1"), "cache /api/user/me dibersihkan (v1 & v2)");
  const until1 = u.premiumUntil, notifs1 = T("notifikasi").length;
  out = await settle(oid, 79000);
  u = getRow("user", "w1");
  assert(out.httpStatus === 200 && eq(u.premiumUntil, until1) && T("notifikasi").length === notifs1, "notifikasi duplikat → idempoten (tidak menambah hari/notifikasi)");
  await hook({ order_id: oid, transaction_status: "expire", gross_amount: "79000.00" });
  assert(getRow("transaksi", oid).status === "SUCCESS", "event susulan expire tidak menurunkan SUCCESS");
  oid = order("w1", 849000, { planId: "UMUM_PREMIUM_YEARLY" });
  await settle(oid, 849000);
  assert(near(getRow("user", "w1").premiumUntil, new Date(until1).getTime() + 365 * DAY), "bayar saat aktif → masa aktif ditumpuk (+365)");

  resetDb(); commissionCalls.length = 0;
  addUser({ id: "w2" });
  oid = order("w2", 79000, { planId: "UMUM_PREMIUM_MONTHLY" });
  out = await settle(oid, 1000);
  assert(out.httpStatus === 400 && getRow("transaksi", oid).status === "PENDING" && !getRow("user", "w2").isPremium, "nominal salah → 400, tetap PENDING, tidak aktif");
  out = await settle(oid, 849000);
  assert(out.httpStatus === 400 && !getRow("user", "w2").isPremium, "nominal paket lain → 400 (tidak naik ke tahunan)");

  for (const [label, meta] of [["metadata null", null], ["metadata tanpa planId", { durationDays: 30 }], ["planId guru pada transaksi UMUM", { planId: "GURU_PRO_MONTHLY", durationDays: 30 }], ["planId asing", { planId: "UMUM_PREMIUM_LIFETIME" }]] as Array<[string, Row | null]>) {
    resetDb();
    addUser({ id: "w3" });
    oid = order("w3", 79000, meta);
    out = await settle(oid, 79000);
    const t = getRow("transaksi", oid);
    assert(out.httpStatus === 200 && t.status === "SUCCESS" && t.metadata?.needsManualReview === true && !getRow("user", "w3").isPremium && resolveIdentity(getRow("user", "w3")).plan === "FREE",
      `${label} (Rp79.000) → SUCCESS + needsManualReview, TIDAK diaktifkan dari nominal`);
  }
  resetDb();
  addUser({ id: "w4", role: "GURU" });
  oid = order("w4", 79000, { planId: "UMUM_PREMIUM_MONTHLY" });
  await settle(oid, 79000);
  assert(getRow("transaksi", oid).metadata.manualReviewReason === "role_mismatch" && !getRow("user", "w4").isPremium, "akun bukan UMUM → tinjau manual (tidak memberi Pro guru)");

  resetDb();
  addUser({ id: "w5", trialStartedAt: new Date(Date.now() - 20 * DAY), trialPlan: UMUM_TRIAL_PLAN, trialEndsAt: new Date(Date.now() + 10 * DAY) });
  oid = order("w5", 79000, { planId: "UMUM_PREMIUM_MONTHLY" });
  await settle(oid, 79000);
  u = getRow("user", "w5");
  assert(near(u.premiumUntil, Date.now() + 40 * DAY) && near(u.trialEndsAt, Date.now()) && resolveIdentity(u).subscriptionStatus === "ACTIVE", "bayar saat uji coba (sisa 10 hari) → 30 + 10 = 40 hari; uji coba ditutup");
  oid = order("w5", 79000, { planId: "UMUM_PREMIUM_MONTHLY" });
  const before = new Date(u.premiumUntil).getTime();
  await settle(oid, 79000);
  assert(near(getRow("user", "w5").premiumUntil, before + 30 * DAY), "sisa uji coba tidak dihitung dua kali");

  resetDb(); commissionCalls.length = 0;
  addUser({ id: "m1", role: "MURID" });
  oid = order("m1", 19000, { planId: "MURID_PREMIUM_MONTHLY", durationDays: 30, aiCreditsMonthly: 0 }, "MURID_PREMIUM");
  await settle(oid, 19000);
  assert(getRow("user", "m1").isPremium && commissionCalls.length === 1, "regresi: MURID_PREMIUM tetap aktif + komisi dievaluasi 1×");
  addUser({ id: "g1", role: "GURU" });
  oid = order("g1", 49000, { planId: "GURU_PRO_MONTHLY", durationDays: 30, aiCreditsMonthly: 500 }, "PREMIUM_UPGRADE");
  opLog.length = 0;
  await settle(oid, 49000);
  assert(getRow("user", "g1").isPremium && opLog.some((o) => o.startsWith("aiCreditLedger")) && commissionCalls.length === 1, "regresi: PREMIUM_UPGRADE tetap aktif + sinkron ledger kredit, tanpa komisi");
  addUser({ id: "g2", role: "GURU" });
  oid = order("g2", 49000, null, "PREMIUM_UPGRADE");
  await settle(oid, 49000);
  assert(getRow("user", "g2").isPremium, "regresi: guru tanpa metadata masih memakai fallback nominal (perilaku lama)");

  // ═══ 6. Uji coba ═══
  console.log("\n6. Uji coba 1 bulan");
  resetDb();
  addUser({ id: "t1", email: "Budi.Santoso+umum@gmail.com" });
  flag(false);
  let c = await trial.claimUmumTrial({ userId: "t1" }, dbMock);
  assert(!c.ok && c.code === "TRIAL_DISABLED" && T("trialClaim").length === 0, "flag mati → TRIAL_DISABLED");
  flag(true);
  c = await trial.claimUmumTrial({ userId: "t1", googleSub: "g-123", ip: "203.0.113.7" }, dbMock);
  u = getRow("user", "t1");
  assert(c.ok && near(c.trialEndsAt, Date.now() + 30 * DAY) && u.trialPlan === UMUM_TRIAL_PLAN && u.trialCreditsTotal === null && u.isPremium === false, "klaim → 30 hari, trialPlan UMUM, tanpa kredit, isPremium tetap false");
  assert(hasUmumPremium(u) && resolveIdentity(u).subscriptionStatus === "TRIALING", "hak premium aktif selama uji coba");
  const claimRow = T("trialClaim")[0];
  assert(claimRow && !JSON.stringify(claimRow).includes("budi") && !JSON.stringify(claimRow).includes("203.0.113") && !JSON.stringify(claimRow).includes("g-123"), "TrialClaim hanya menyimpan hash (tanpa email/IP/id Google mentah)");
  c = await trial.claimUmumTrial({ userId: "t1" }, dbMock);
  assert(!c.ok && c.code === "TRIAL_ALREADY_USED", "klaim kedua akun sama → TRIAL_ALREADY_USED");
  // Hapus akun lalu daftar ulang (email Gmail variasi titik/+tag, id baru).
  T("user").splice(T("user").findIndex((x) => x.id === "t1"), 1);
  addUser({ id: "t1b", email: "budisantoso@googlemail.com" });
  c = await trial.claimUmumTrial({ userId: "t1b" }, dbMock);
  assert(!c.ok && c.code === "TRIAL_ALREADY_USED" && getRow("user", "t1b").trialStartedAt === null && T("trialClaim").length === 1, "hapus akun + daftar ulang (email dinormalisasi) → ditolak, akun baru tidak tersentuh (rollback)");
  addUser({ id: "t1c", email: "akun-lain@contoh.id" });
  c = await trial.claimUmumTrial({ userId: "t1c", googleSub: "g-123" }, dbMock);
  assert(!c.ok && c.code === "TRIAL_ALREADY_USED", "email lain, id Google sama → ditolak");
  addUser({ id: "t1d", email: "bukan-google@contoh.id" });
  c = await trial.claimUmumTrial({ userId: "t1d", googleSub: null }, dbMock);
  assert(c.ok, "akun email/sandi (tanpa Google) tetap bisa klaim (tidak khusus Google)");
  for (const [role, extra] of [["GURU", {}], ["MURID", {}], ["ADMIN", {}], ["UMUM", { isFounder: true }]] as Array<[string, Row]>) {
    const id = `t-${role}-${extra.isFounder ? "f" : "x"}`;
    addUser({ id, role, ...extra });
    c = await trial.claimUmumTrial({ userId: id }, dbMock);
    assert(!c.ok && c.code === "TRIAL_FORBIDDEN_ROLE", `${role}${extra.isFounder ? " founder" : ""} → TRIAL_FORBIDDEN_ROLE`);
  }
  addUser({ id: "t-paid", isPremium: true, premiumPlan: "PRO", premiumUntil: new Date(Date.now() + 5 * DAY) });
  c = await trial.claimUmumTrial({ userId: "t-paid" }, dbMock);
  assert(!c.ok && c.code === "ALREADY_PREMIUM", "sudah bayar → ALREADY_PREMIUM");
  // Batal
  let cancel = await trial.cancelUmumTrial("t1d", dbMock);
  u = getRow("user", "t1d");
  assert(cancel.ok && !hasUmumPremium(u) && resolveIdentity(u).plan === "FREE" && u.isPremium === false, "batal → kembali Gratis, tanpa tagihan/konversi");
  cancel = await trial.cancelUmumTrial("t1d", dbMock);
  assert(!cancel.ok && cancel.code === "NO_ACTIVE_TRIAL", "batal kedua → NO_ACTIVE_TRIAL");
  c = await trial.claimUmumTrial({ userId: "t1d" }, dbMock);
  assert(!c.ok && c.code === "TRIAL_ALREADY_USED", "setelah batal tidak bisa klaim ulang");
  const v = trial.umumTrialView(u);
  assert(v.used && !v.eligible && !v.active && !v.paid, "tampilan: sudah dipakai, tidak aktif → tawarkan paket berbayar");
  // Kedaluwarsa
  addUser({ id: "t-exp", email: "exp@contoh.id" });
  c = await trial.claimUmumTrial({ userId: "t-exp" }, dbMock, new Date(Date.now() - 31 * DAY));
  u = getRow("user", "t-exp");
  assert(c.ok && !hasUmumPremium(u) && resolveIdentity(u).plan === "FREE" && u.isPremium === false && u.premiumPlan === "FREE", "uji coba lewat 30 hari → Gratis (tidak berubah jadi berbayar)");
  // Sinyal IP lunak
  for (let i = 0; i < 4; i++) addUser({ id: `ip-${i}`, email: `ip${i}@contoh.id` });
  const ipRes = [] as Row[];
  for (let i = 0; i < 4; i++) ipRes.push(await trial.claimUmumTrial({ userId: `ip-${i}`, ip: `198.51.100.${10 + i}` }, dbMock));
  assert(ipRes.every((x) => x.ok) && ipRes[3].flagged === true && ipRes[0].flagged === false, "IP /24 sama berulang → ditandai (flagged), TIDAK diblokir");
  // Rute API (peran & cache)
  const route = R("app/api/umum/trial/route.ts");
  addUser({ id: "api1", email: "api1@gmail.com" });
  currentUser = { ...getRow("user", "api1"), googleSub: "g-api1" };
  cacheDel.length = 0;
  const apiRes = await route.POST(new NextRequest("http://localhost/api/umum/trial", { method: "POST", headers: { "x-forwarded-for": "192.0.2.1" } }));
  const apiBody = await apiRes.json();
  assert(apiRes.status === 200 && apiBody.ok && cacheDel.includes("user:me:id:sb-api1") && cacheDel.includes("user:me:v2:id:sb-api1"), "POST /api/umum/trial → 200 + cache profil dibersihkan");
  assert(T("trialClaim").some((t) => t.userId === "api1" && t.googleSubHash), "id Google dari identitas Supabase ikut dicatat (hash)");
  currentUser = { ...getRow("user", "t-GURU-x") };
  const apiGuru = await route.POST(new NextRequest("http://localhost/api/umum/trial", { method: "POST" }));
  assert(apiGuru.status === 403, "POST /api/umum/trial oleh GURU → 403");
  currentUser = null;
  assert((await route.POST(new NextRequest("http://localhost/api/umum/trial", { method: "POST" }))).status === 401, "tanpa login → 401");

  // ═══ 7. Admin manual-activate ═══
  console.log("\n7. Admin: aktivasi manual pembayaran UMUM yang ditinjau");
  resetDb();
  addUser({ id: "adm", role: "ADMIN", isFounder: true });
  addUser({ id: "mr", trialStartedAt: new Date(), trialPlan: UMUM_TRIAL_PLAN, trialEndsAt: new Date(Date.now() + 5 * DAY) });
  oid = order("mr", 79000, null);
  await settle(oid, 79000);
  const txId = getRow("transaksi", oid).id;
  const manual = R("app/api/admin/payments/manual-activate/route.ts");
  const adminPost = async (body: Row) => {
    currentUser = { ...getRow("user", "adm") };
    const rr = await manual.POST(new NextRequest("http://localhost/api/admin/payments/manual-activate", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));
    return { status: rr.status as number, body: await rr.json().catch(() => ({})) };
  };
  let ar = await adminPost({ transactionId: txId, reason: "Metadata hilang, cek mutasi bank", planId: "GURU_PRO_YEARLY" });
  assert(ar.status === 400 && /Pilih paket Premium Umum/.test(ar.body.error) && !getRow("user", "mr").isPremium, "manual-activate: planId guru untuk transaksi UMUM ditolak");
  ar = await adminPost({ transactionId: txId, reason: "Metadata hilang, cek mutasi bank", planId: "UMUM_PREMIUM_MONTHLY" });
  u = getRow("user", "mr");
  assert(ar.status === 200 && u.isPremium && near(u.premiumUntil, Date.now() + 35 * DAY) && getRow("transaksi", oid).metadata.needsManualReview === false, "manual-activate UMUM → aktif 30 hari + sisa uji coba 5 hari");
  ar = await adminPost({ transactionId: txId, reason: "Metadata hilang, cek mutasi bank", planId: "UMUM_PREMIUM_MONTHLY" });
  assert(ar.status === 400 && /sudah diaktifkan manual/.test(ar.body.error) && near(getRow("user", "mr").premiumUntil, Date.now() + 35 * DAY), "manual-activate kedua → ditolak (tidak dobel)");
  assert(!opLog.some((o) => o.startsWith("aiCreditLedger")), "manual-activate UMUM tanpa ledger kredit");

  console.log(`\nHasil: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
