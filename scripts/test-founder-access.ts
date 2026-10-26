/**
 * Akses founder — regression tests (tanpa DB; DB, Supabase & next/headers di-mock).
 *
 * PR1 (pengaman admin):
 *   1. Setiap route app/api/admin/** dibungkus withAdmin (tanpa export function langsung).
 *   2. withAdmin: 401 tanpa sesi, 403 non-founder, GET tidak dicatat,
 *      route uang/massal → 428 tanpa konfirmasi ketik, aksi tercatat dengan
 *      metadata tersaring (rahasia tidak tersimpan), bearer mesin lolos.
 *   3. Super founder: hanya dominikus.02@gmail.com (huruf kecil), wajib isFounder.
 *   4. make-founder / revoke-founder: founder biasa → 403.
 *   5. Komisi: founder GURU tetap layak; ADMIN/MURID/UMUM tidak.
 *   6. Founder tidak bisa memproses penarikan/pencairan milik sendiri.
 *
 * Usage: npx tsx scripts/test-founder-access.ts
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";
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

type MockUser = { id: string; email: string; role: string; isFounder: boolean; [k: string]: unknown };
let currentUser: MockUser | null = null;
let headerMap: Record<string, string> = {};
const auditRows: any[] = [];
const userUpdates: any[] = [];
let findFirstResult: any = null;
let ownerResult: any = null;

const dbMock: any = new Proxy(
  {},
  {
    get(_t, model: string) {
      return new Proxy(
        {},
        {
          get(_m, op: string) {
            return async (args: any) => {
              if (model === "adminAuditLog" && op === "create") {
                auditRows.push(args.data);
                return args.data;
              }
              if (model === "user" && op === "findFirst") return findFirstResult;
              if (model === "user" && op === "update") {
                userUpdates.push(args);
                return { id: args.where.id, email: "x@y.z", fullName: "X" };
              }
              if (["withdrawal", "teacherCommissionWithdrawal", "teacherPayout"].includes(model) && op === "findUnique") {
                return ownerResult;
              }
              throw new Error(`db not allowed: ${model}.${op}`);
            };
          },
        },
      );
    },
  },
);

const M = Module as any;
const ROOT = process.cwd();
const MOCKS: Record<string, unknown> = {
  [resolve(ROOT, "lib/db.ts")]: { db: dbMock, prisma: dbMock, default: dbMock },
  [resolve(ROOT, "lib/supabase/server.ts")]: { getUser: async () => currentUser },
};
const origLoad = M._load;
M._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === "next/headers") {
    return {
      headers: async () => new Headers(headerMap),
      cookies: async () => ({ get: () => undefined, set: () => undefined }),
    };
  }
  try {
    const file = M._resolveFilename(request, parent, isMain);
    if (file in MOCKS) return MOCKS[file];
  } catch {
    /* biarkan loader asli melapor */
  }
  return origLoad.apply(this, arguments as any);
};
const R = (p: string) => require(resolve(ROOT, p));

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name === "route.ts") out.push(p);
  }
  return out;
}

const FOUNDER: MockUser = { id: "f1", email: "srphysics04@gmail.com", role: "GURU", isFounder: true };
const SUPER: MockUser = { id: "s1", email: "Dominikus.02@gmail.com", role: "GURU", isFounder: true };
const GURU: MockUser = { id: "g1", email: "guru@contoh.com", role: "GURU", isFounder: false };

function jsonReq(url: string, method: string, body?: unknown) {
  return new Request(`https://www.bahasacerdas.com${url}`, {
    method,
    headers: { "content-type": "application/json", ...headerMap },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function main() {
  // ═══ 1. Semua route admin dibungkus ═══
  console.log("\n1. Semua route admin dibungkus withAdmin");
  const routes = walk(resolve(ROOT, "app/api/admin"));
  const unwrapped = routes.filter((f) => /^export (async )?function (GET|POST|PUT|PATCH|DELETE)\(/m.test(readFileSync(f, "utf8")));
  const missing = routes.filter((f) => {
    const s = readFileSync(f, "utf8");
    const exported = s.match(/^export const (GET|POST|PUT|PATCH|DELETE) = /gm) || [];
    const wrapped = s.match(/^export const (GET|POST|PUT|PATCH|DELETE) = withAdmin\(/gm) || [];
    return exported.length === 0 || exported.length !== wrapped.length;
  });
  assert(routes.length >= 60, `ditemukan ${routes.length} route admin`);
  assert(unwrapped.length === 0, `tidak ada export function langsung (${unwrapped.join(", ") || "-"})`);
  assert(missing.length === 0, `semua export lewat withAdmin (${missing.join(", ") || "-"})`);

  // ═══ 2. withAdmin ═══
  console.log("\n2. withAdmin");
  const { withAdmin } = R("lib/admin/guard.ts");
  const { requiresTypedConfirm } = R("lib/admin/confirm.ts");
  const ok = withAdmin(async () => Response.json({ ok: true }), { route: "/api/admin/x", method: "POST" });

  currentUser = null;
  assert((await ok(jsonReq("/api/admin/x", "POST", {}))).status === 401, "tanpa sesi → 401");
  currentUser = GURU;
  assert((await ok(jsonReq("/api/admin/x", "POST", {}))).status === 403, "guru non-founder → 403");
  currentUser = { ...GURU, role: "ADMIN" };
  assert((await ok(jsonReq("/api/admin/x", "POST", {}))).status === 200, "role ADMIN → 200");

  currentUser = FOUNDER;
  auditRows.length = 0;
  const get = withAdmin(async () => Response.json({ ok: true }), { route: "/api/admin/x", method: "GET" });
  assert((await get(jsonReq("/api/admin/x", "GET"))).status === 200, "founder GET → 200");
  assert(auditRows.length === 0, "GET tidak dicatat");

  const noArg = withAdmin(async () => Response.json({ ok: true }), { route: "/api/admin/seed", method: "POST" });
  await noArg();
  assert(auditRows.length === 1 && auditRows[0].path === "/api/admin/seed" && auditRows[0].method === "POST", "handler tanpa Request tetap dicatat (route/method dari opsi)");

  auditRows.length = 0;
  const wd = withAdmin(async () => Response.json({ ok: true }), { route: "/api/admin/withdrawals/[id]", method: "PATCH" });
  headerMap = {};
  const r428 = await wd(jsonReq("/api/admin/withdrawals/w1", "PATCH", { status: "APPROVED" }), { params: Promise.resolve({ id: "w1" }) });
  const b428 = await r428.json();
  assert(r428.status === 428 && b428.code === "CONFIRM_REQUIRED", "penarikan tanpa konfirmasi → 428 CONFIRM_REQUIRED");
  assert(auditRows.length === 0, "428 tidak menjalankan handler");
  headerMap = { "x-admin-confirm": "KONFIRMASI", "user-agent": "tes", "x-forwarded-for": "1.2.3.4, 5.6.7.8" };
  const r200 = await wd(
    jsonReq("/api/admin/withdrawals/w1", "PATCH", { status: "APPROVED", userId: "u9", accountNumber: "123456", token: "rahasia", notes: "ok" }),
    { params: Promise.resolve({ id: "w1" }) },
  );
  assert(r200.status === 200, "dengan konfirmasi → 200");
  const row = auditRows[0];
  assert(row && row.actorId === "f1" && row.status === 200 && row.method === "PATCH", "aksi tercatat (pelaku, metode, status)");
  assert(row?.path === "/api/admin/withdrawals/w1" && row?.targetUserId === "u9" && row?.ip === "1.2.3.4", "path, target & ip tercatat");
  const meta = JSON.stringify(row?.metadata || {});
  assert(!meta.includes("rahasia") && !meta.includes("123456"), "token & nomor rekening TIDAK tersimpan");
  assert(meta.includes('"APPROVED"') && meta.includes('"w1"') && meta.includes("_redactedKeys"), "status, id & daftar kunci tersaring tersimpan");

  const boom = withAdmin(async () => { throw new Error("x"); }, { route: "/api/admin/y", method: "DELETE" });
  auditRows.length = 0;
  let threw = false;
  try { await boom(jsonReq("/api/admin/y", "DELETE")); } catch { threw = true; }
  assert(threw && auditRows[0]?.status === 500, "handler error → dicatat 500 lalu dilempar ulang");

  process.env.TEST_BEARER = "tok-123";
  const bearer = withAdmin(async () => Response.json({ ok: true }), { route: "/api/admin/agent/health", method: "GET", bearerEnv: "TEST_BEARER" });
  currentUser = null;
  headerMap = { authorization: "Bearer tok-123" };
  assert((await bearer(jsonReq("/api/admin/agent/health", "GET"))).status === 200, "bearer mesin yang benar → lolos");
  headerMap = { authorization: "Bearer salah" };
  assert((await bearer(jsonReq("/api/admin/agent/health", "GET"))).status === 401, "bearer salah → 401");
  headerMap = {};

  for (const [m, p, want] of [
    ["PATCH", "/api/admin/withdrawals/abc", true],
    ["PATCH", "/api/admin/teacher-commissions/withdrawals/abc", true],
    ["POST", "/api/admin/teacher-commissions/payouts/abc/retry", true],
    ["POST", "/api/admin/teacher-commissions/payout-control", true],
    ["POST", "/api/admin/payments/manual-activate", true],
    ["PATCH", "/api/admin/users", true],
    ["POST", "/api/admin/make-founder", true],
    ["POST", "/api/admin/revoke-founder", true],
    ["POST", "/api/admin/artikel", false],
    ["GET", "/api/admin/withdrawals/abc", false],
  ] as const) {
    assert(requiresTypedConfirm(m, p) === want, `konfirmasi ${m} ${p} = ${want}`);
  }

  // ═══ 3. Super founder ═══
  console.log("\n3. Super founder");
  const { isSuperFounder, SUPER_FOUNDER_EMAILS } = R("lib/auth/super-founder.ts");
  assert(SUPER_FOUNDER_EMAILS.length === 1 && SUPER_FOUNDER_EMAILS[0] === "dominikus.02@gmail.com", "hanya CEO");
  assert(isSuperFounder(SUPER) === true, "CEO (huruf besar/kecil) → super");
  assert(isSuperFounder({ ...SUPER, isFounder: false }) === false, "CEO tanpa isFounder → bukan super");
  assert(isSuperFounder(FOUNDER) === false, "founder lain → bukan super");
  assert(!SUPER_FOUNDER_EMAILS.includes("hdsastra47@gmail.com"), "Washadi tidak ada di daftar");

  // ═══ 4. make/revoke founder ═══
  console.log("\n4. make-founder / revoke-founder");
  const make = R("app/api/admin/make-founder/route.ts");
  const revoke = R("app/api/admin/revoke-founder/route.ts");
  headerMap = { "x-admin-confirm": "KONFIRMASI" };
  currentUser = FOUNDER;
  assert((await make.POST(jsonReq("/api/admin/make-founder", "POST", { email: "a@b.c" }))).status === 403, "founder biasa tidak bisa menambah founder");
  assert((await revoke.POST(jsonReq("/api/admin/revoke-founder", "POST", { email: "a@b.c" }))).status === 403, "founder biasa tidak bisa mencabut founder");
  currentUser = SUPER;
  findFirstResult = { id: "t1", isFounder: false };
  userUpdates.length = 0;
  const mk = await make.POST(jsonReq("/api/admin/make-founder", "POST", { email: " A@B.C " }));
  assert(mk.status === 200 && userUpdates[0]?.data?.isFounder === true, "super founder menambah founder");
  assert((await revoke.POST(jsonReq("/api/admin/revoke-founder", "POST", { email: "dominikus.02@gmail.com" }))).status === 400, "super founder tidak bisa dicabut");
  findFirstResult = { id: "t1", isFounder: true };
  userUpdates.length = 0;
  const rv = await revoke.POST(jsonReq("/api/admin/revoke-founder", "POST", { email: "a@b.c" }));
  assert(rv.status === 200 && userUpdates[0]?.data?.isFounder === false, "super founder mencabut founder");
  headerMap = {};
  assert((await make.POST(jsonReq("/api/admin/make-founder", "POST", { email: "a@b.c" }))).status === 428, "tanpa konfirmasi ketik → 428");

  // ═══ 5. Komisi ═══
  console.log("\n5. Komisi founder");
  const { isEligibleForCommission } = R("lib/commission/config.ts");
  assert(isEligibleForCommission("GURU", true) === true, "founder GURU tetap dapat komisi");
  assert(isEligibleForCommission("GURU", false) === true, "guru biasa dapat komisi");
  assert(isEligibleForCommission("ADMIN", false) === false, "ADMIN tidak");
  assert(isEligibleForCommission("MURID", false) === false, "MURID tidak");
  assert(isEligibleForCommission("UMUM", false) === false, "UMUM tidak");

  // ═══ 6. Aksi uang atas milik sendiri ═══
  console.log("\n6. Tidak bisa menyetujui uang sendiri");
  const { rejectSelfMoneyAction } = R("lib/admin/self-action.ts");
  assert(rejectSelfMoneyAction("f1", "f1")?.status === 403, "milik sendiri → 403");
  assert(rejectSelfMoneyAction("f1", "g1") === null, "milik guru lain → boleh");
  for (const f of [
    "app/api/admin/withdrawals/[id]/route.ts",
    "app/api/admin/teacher-commissions/withdrawals/[id]/route.ts",
    "app/api/admin/teacher-commissions/payouts/[id]/retry/route.ts",
  ]) {
    assert(readFileSync(resolve(ROOT, f), "utf8").includes("rejectSelfMoneyAction("), `${f} memblokir aksi atas milik sendiri`);
  }

  console.log(`\n${passed} lulus, ${failed} gagal`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
