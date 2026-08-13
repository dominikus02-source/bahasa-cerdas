/**
 * test-tka-simulation-fix.ts — regresi TKA SIMULATION Internal Server Error
 * (Founder directive, Aug 13 2026).
 *
 * Root cause (sudah terbukti): commit 8eaad4b menambah premium gate ke
 * `app/api/kompetensi/[paketId]/route.ts` yang memanggil
 * `consumeUsageGuarded(tx, …)` → `consumeUsageTx` → `tx.premiumUsage.*`
 * DI DALAM `db.$transaction` pembuatan attempt baru. Tidak seperti
 * `getUsageRow`/`getEntitlement`/cache (semua fallback graceful),
 * `consumeUsageTx` TIDAK menangani P2021/P2022 — ketika tabel PremiumUsage
 * belum ada di PRODUCTION (migration manual 2026-08-11 belum dijalankan),
 * transaksi melempar P2021 → 500 "Internal server error" di SETIAP attempt
 * baru (TKA & UKBI). Replay sesi IN_PROGRESS tidak menyentuh premiumUsage
 * sehingga "kadang berhasil" saat sesi sudah ada.
 *
 * Fix: `consumeUsageTx` kini me-degrade secara graceful untuk P2021/P2022
 * (infra deterministik) dan mengembalikan `{ allowed: true, used: 0, … }`
 * — attempt tetap jalan; kuota tidak tercatat selama tabel belum ada.
 * Error lain tetap di-rethrow; P2002 race & limit enforcement tidak berubah.
 *
 * Bagian 1 — asersi statis kontrak alur TKA (start → attempt → soal → snapshot
 * → payload) tanpa DB.
 * Bagian 2 — asersi statis leakage (tidak ada correctAnswer/audioScript/
 * transcript/rubric di payload klien).
 * Bagian 3 — asersi statis infra degrade (P2021/P2022) di usage.ts.
 * Bagian 4 — unit test `consumeUsageTx` dengan mock transaction (tanpa DB):
 * degrade P2021/P2022, alur normal, race P2002, limit habis, error fatal
 * tetap di-rethrow.
 *
 * Jalankan: npm run test:tka-simulation-fix
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { consumeUsageTx } from "../lib/premium-economy/usage";
import type { Prisma } from "@prisma/client";

const root = process.cwd();
let passed = 0;
const failures: string[] = [];

function ok(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
  } else {
    failures.push(detail ? `${name} — ${detail}` : name);
  }
}

function okEq(name: string, actual: unknown, expected: unknown) {
  ok(name, JSON.stringify(actual) === JSON.stringify(expected), `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

async function throwsAsync(name: string, fn: () => Promise<unknown>, expectCode?: string) {
  try {
    await fn();
    ok(name, false, "tidak melempar");
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (expectCode) ok(name, code === expectCode, `code=${code}, expected ${expectCode}`);
    else ok(name, true);
  }
}

const read = (p: string) => readFileSync(join(root, p), "utf8");
const exists = (p: string) => existsSync(join(root, p));
const json = (p: string) => JSON.parse(read(p));

// ─────────────────────────────────────────────────────────────────────────────
// Bagian 1 — KONTRAK ALUR TKA (statis, tanpa DB)
// ─────────────────────────────────────────────────────────────────────────────

// 1.1 Resolver — semua track TKA ada, id paket resolvable non-legacy.
const resolver = read("lib/kompetensi/get-simulation-packages.ts");
for (const t of ["TKA_SD", "TKA_SMP", "TKA_SMA", "TKA_UTBK", "TKA_GURU"]) {
  ok(`resolver memuat type ${t}`, resolver.includes(`"${t}"`), "TKA_TYPES registry");
}
ok("resolver: getTKAPackages ada", resolver.includes("getTKAPackages"));
ok("resolver: isTKAType ada", resolver.includes("isTKAType"));

// 1.2 Entry murid → halaman kompetisi run.
const muridClient = read("app/(dashboard)/murid/simulasi/tka/client.tsx");
ok("murid TKA client menuju /kompetisi/{paketId}", /kompetisi\//.test(muridClient), "start TKA harus menuju run page");

// 1.3 Entry guru (monitor) memakai resolver, bukan paket hardcoded.
const guruPage = read("app/(dashboard)/guru/simulasi/tka/page.tsx");
ok("guru TKA page memakai resolver", guruPage.includes("getTKAPackages") || guruPage.includes("getSimulationPackages"));

// 1.4 Route run — gate + session dalam SATU transaksi; replay TANPA konsumsi.
const route = read("app/api/kompetensi/[paketId]/route.ts");
ok("route: $transaction membungkus attempt/replay", route.includes("db.$transaction"));
ok("route: resolvePlan dipanggil sebelum gate", route.includes("resolvePlan(dbUser.id)"));
ok("route: getFeatureLimit SIMULATION_MONTHLY_LIMIT", route.includes('getFeatureLimit(simPlan, "SIMULATION_MONTHLY_LIMIT")'));
const consumeCalls = route.split("consumeUsageGuarded").length - 1;
ok("route: consumeUsageGuarded 1 import + 2 call site (attempt baru + retry)", consumeCalls === 3, `ditemukan ${consumeCalls}`);
ok("route: skipDuplicates aman double-click", route.includes("skipDuplicates: true"));
ok("route: retry memakai updateMany predikat status (konsumsi sekali)", /reset\.count === 1[\s\S]{0,120}consumeUsageGuarded/.test(route), "retry harus consume di cabang reset.count===1");
const replayWindow = route.slice(route.indexOf("mode: \"replay\""), route.indexOf("mode: \"replay\"") + 200);
ok("route: replay tidak mengandung consumeUsage", !replayWindow.includes("consumeUsageGuarded"));
ok("route: FEATURE_LIMIT_REACHED 403 + upgradeAvailable", route.includes('code: "FEATURE_LIMIT_REACHED"') && route.includes("upgradeAvailable: true") && route.includes('feature: "SIMULATION"'));

// 1.5 Session / attempt / payload.
ok("route: expiresAt di payload", route.includes("expiresAt"));
ok("route: completed → 400 VALIDATION", route.includes("Tes sudah selesai"));

// 1.6 Question load — select TKA/UKBI bebas kunci jawaban (lit ear strait).
const tkaSelectLiteral = route.slice(route.indexOf("const TKA_SELECT = {"), route.indexOf("} as const", route.indexOf("const TKA_SELECT = {")));
const ukbiSelectLiteral = route.slice(route.indexOf("const UKBI_SELECT = {"), route.indexOf("} as const", route.indexOf("const UKBI_SELECT = {")));
for (const banned of ["correctAnswer", "answerKey", "jawaban", "audioScript", "transcript", "rubric"]) {
  ok(`TKA_SELECT tanpa ${banned}`, !tkaSelectLiteral.includes(banned));
  ok(`UKBI_SELECT tanpa ${banned}`, !ukbiSelectLiteral.includes(banned));
}

// 1.7 Soal kosong tidak pernah di-cache / tidak pernah sampai ke klien.
ok("route: empty pool → 404 'Tidak ada soal tersedia'", route.includes('err("Tidak ada soal tersedia", "NOT_FOUND", 404)'));
const cacheSetIdx = route.indexOf("await cache.set(poolKey, pool");
ok("route: cache pool hanya setelah filter", cacheSetIdx > -1, "pool harus di-cache (setelah soal non-kosong)");
const emptyGuardIdx = route.indexOf("pool.length > 0");
ok("route: pool berisi baru di-cache (guard sebelum cache.set)", emptyGuardIdx > -1 && emptyGuardIdx < cacheSetIdx, "guard pool.length>0 harus mendahului cache.set");

// 1.8 Snapshot — jawaban hanya server-side; replay memakai clientSections.
ok("route: snapshot menyimpan clientSections", route.includes("clientSections"));
ok("route: replay menyajikan clientSections", route.includes("storedSnapshot!.clientSections"));
ok("snapshot type: lib/types/snapshot.ts ada", exists("lib/types/snapshot.ts"));
const snapshotType = read("lib/types/snapshot.ts");
ok("snapshot type: field questions (server-side answers)", snapshotType.includes("questions: QuestionSnapshot[]"));
ok("snapshot type: QuestionSnapshot.correctAnswer (server-side)", /interface QuestionSnapshot[\s\S]{0,200}correctAnswer: string/.test(snapshotType));

// 1.9 Hasil — shape stabil, tanpa jawaban.
const hasil = read("app/api/kompetensi/[paketId]/hasil/route.ts");
ok("hasil route: 404 'Hasil tidak ditemukan'", hasil.includes('"Hasil tidak ditemukan"'));
ok("hasil route: return { result: {", hasil.includes("result: {"));
ok("hasil route: tanpa answerDetails/answers", !hasil.includes("answerDetails") && !hasil.includes("answers:"));

// 1.10 Submit — idempoten, tidak pernah membocorkan kunci jawaban.
const submit = read("app/api/kompetensi/[paketId]/submit/route.ts");
ok("submit route: ada", exists("app/api/kompetensi/[paketId]/submit/route.ts"));
ok("submit route: GET tanpa hasil → { result: null }", submit.includes("result: null"));
ok("submit route: tidak memakai premium (kuota hanya start)", !submit.includes("consumeUsage"));
ok("submit route: skor dihitung server-side (correctAnswer di server)", submit.includes("q.correctAnswer"));

// ─────────────────────────────────────────────────────────────────────────────
// Bagian 2 — KONTRAK BANK SOAL TKA (data files, tanpa DB)
// ─────────────────────────────────────────────────────────────────────────────
// Kontrak: SD 65 · SMP 65 · SMA 65 · UTBK 30 · Guru 30 — TIDAK BOLEH diubah.
function walkJson(dir: string): string[] {
  const full = join(root, dir);
  const out: string[] = [];
  for (const entry of readdirSync(full, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkJson(p));
    else if (entry.name.endsWith(".json")) out.push(p);
  }
  return out;
}
const tkaCounts: Record<string, number> = {};
for (const f of walkJson("data/question-bank/tka")) {
  const data = JSON.parse(read(f));
  const track = f.split("/")[3];
  const n = Array.isArray(data) ? data.length : (data.questions?.length ?? 0);
  tkaCounts[track] = (tkaCounts[track] ?? 0) + n;
}
ok("bank TKA SD = 65", tkaCounts.sd === 65, `got ${tkaCounts.sd}`);
ok("bank TKA SMP = 65", tkaCounts.smp === 65, `got ${tkaCounts.smp}`);
ok("bank TKA SMA = 65", tkaCounts.sma === 65, `got ${tkaCounts.sma}`);
ok("bank TKA UTBK = 30", tkaCounts.utbk === 30, `got ${tkaCounts.utbk}`);
ok("bank TKA GURU = 30", tkaCounts.guru === 30, `got ${tkaCounts.guru}`);

// Tiap soal: correctAnswer ∈ options.id, tanpa duplikat id.
let bankSoal = 0;
let bankInvalid = 0;
for (const f of walkJson("data/question-bank/tka")) {
  const data = JSON.parse(read(f));
  const questions = Array.isArray(data) ? data : data.questions ?? [];
  for (const q of questions) {
    bankSoal++;
    const ids = (q.options ?? []).map((o: { id?: string }) => o.id);
    const dup = new Set(ids).size !== ids.length;
    if (dup || !ids.includes(q.correctAnswer)) bankInvalid++;
  }
}
ok("bank TKA: semua correctAnswer valid + id opsi unik", bankInvalid === 0, `${bankInvalid} invalid dari ${bankSoal}`);

// ─────────────────────────────────────────────────────────────────────────────
// Bagian 3 — INFRA DEGRADE consumeUsageTx (statis)
// ─────────────────────────────────────────────────────────────────────────────
const usage = read("lib/premium-economy/usage.ts");
ok("usage.ts: isUsageInfraUnavailable ada", usage.includes("isUsageInfraUnavailable"));
ok("usage.ts: P2021 ditangani", usage.includes('"P2021"') || usage.includes("P2021"));
ok("usage.ts: P2022 ditangani", usage.includes("P2022"));
ok("usage.ts: wrapper consumeUsageTx + inner", usage.includes("consumeUsageTxInner"));
ok("usage.ts: P2002 race tetap ditangani", usage.includes("P2002"));
ok("usage.ts: updateMany atomic (used < limit) dipertahankan", /updateMany[\s\S]{0,300}used: \{ lt: limit \}/.test(usage), "increment bersyarat tidak boleh hilang");
ok("usage.ts: consumeUsageGuarded masih ada", usage.includes("consumeUsageGuarded"));
ok("usage.ts: FeatureLimitError masih ada", usage.includes("FeatureLimitError"));
ok("usage.ts: getUsageRow fallback { used: 0 } dipertahankan", usage.includes("used: 0, periodKey"));

// ─────────────────────────────────────────────────────────────────────────────
// Bagian 4 — UNIT consumeUsageTx (mock transaction, tanpa DB)
// ─────────────────────────────────────────────────────────────────────────────
type FakeMode = "normal" | "table-missing" | "column-missing" | "race-create" | "fatal";

const mkErr = (code: string) => Object.assign(new Error(code), { code });

function makeFakeTx(mode: FakeMode, limit: number, initial?: number): Prisma.TransactionClient {
  let store: { id: string; used: number } | null =
    initial === undefined ? null : { id: "row-1", used: initial };
  const raceRow = { id: "row-race", used: 1 };
  let finds = 0;
  const premiumUsage = {
    async findUnique() {
      finds++;
      if (mode === "table-missing") throw mkErr("P2021");
      if (mode === "fatal") throw mkErr("P2011");
      if (mode === "race-create") {
        // find #1 (sebelum create) → null; find #2/#3 (pesaing menang) → row.
        if (finds === 1) return null;
        return raceRow;
      }
      return store;
    },
    async create() {
      if (mode === "table-missing") throw mkErr("P2021");
      if (mode === "column-missing") throw mkErr("P2022");
      if (mode === "race-create") throw mkErr("P2002");
      if (mode === "fatal") throw mkErr("P2011");
      store = { id: "row-new", used: 1 };
      return { id: "row-new", used: 1 };
    },
    async updateMany({ where }: { where: { used: { lt: number } } }) {
      if (mode === "table-missing") throw mkErr("P2021");
      if (mode === "fatal") throw mkErr("P2011");
      const target = mode === "race-create" ? raceRow : store;
      const canInc = target !== null && target.used < where.used.lt;
      if (canInc) target.used += 1;
      return { count: canInc ? 1 : 0 };
    },
    async upsert() {
      if (mode === "table-missing") throw mkErr("P2021");
      if (mode === "fatal") throw mkErr("P2011");
      store = { id: store?.id ?? "row-up", used: (store?.used ?? 0) + 1 };
      return { id: store!.id, used: store!.used };
    },
  };
  return { premiumUsage } as unknown as Prisma.TransactionClient;
}

const SIM_OPTS = { plan: "FREE" as const, limit: 3 };
const date = new Date("2026-08-13T08:00:00+07:00");

// u1 — tabel PremiumUsage hilang (P2021) → graceful, attempt tetap jalan.
(async () => {
  const r = await consumeUsageTx(makeFakeTx("table-missing", 3), "u-1", "SIMULATION", SIM_OPTS, date);
  ok("unit: P2021 → allowed true (attempt lanjut)", r.allowed === true, JSON.stringify(r));
  ok("unit: P2021 → used 0", r.used === 0, JSON.stringify(r));
  ok("unit: P2021 → limit/plan dipertahankan", r.limit === 3 && r.plan === "FREE");
  ok("unit: P2021 → periodKey WIB bulanan", /^\d{4}-\d{2}$/.test(r.periodKey), r.periodKey);
})().catch((e) => failures.push("unit P2021: " + e.message));

// u2 — kolom PremiumUsage hilang (P2022 di create) → graceful.
(async () => {
  const r = await consumeUsageTx(makeFakeTx("column-missing", 3), "u-2", "SIMULATION", SIM_OPTS, date);
  ok("unit: P2022 → allowed true (attempt lanjut)", r.allowed === true, JSON.stringify(r));
  ok("unit: P2022 → used 0", r.used === 0);
})().catch((e) => failures.push("unit P2022: " + e.message));

// u3 — alur normal: baris belum ada → create used=1 → allowed.
(async () => {
  const r = await consumeUsageTx(makeFakeTx("normal", 3), "u-3", "SIMULATION", SIM_OPTS, date);
  ok("unit: normal create → allowed true", r.allowed === true, JSON.stringify(r));
  ok("unit: normal create → used 1", r.used === 1);
})().catch((e) => failures.push("unit normal: " + e.message));

// u4 — race P2002 (double-click): create gagal, increment pesaing → allowed.
(async () => {
  const r = await consumeUsageTx(makeFakeTx("race-create", 3), "u-4", "SIMULATION", SIM_OPTS, date);
  ok("unit: race P2002 → allowed true", r.allowed === true, JSON.stringify(r));
  ok("unit: race P2002 → used > 0", r.used > 0);
})().catch((e) => failures.push("unit race: " + e.message));

// u5 — limit habis (used=3, limit=3) → allowed false (FeatureLimitError di guarded).
(async () => {
  const r = await consumeUsageTx(makeFakeTx("normal", 3, 3), "u-5", "SIMULATION", SIM_OPTS, date);
  ok("unit: limit habis → allowed false", r.allowed === false, JSON.stringify(r));
})().catch((e) => failures.push("unit limit: " + e.message));

// u6 — limit Infinity → upsert, selalu allowed, tercatat.
(async () => {
  const r = await consumeUsageTx(makeFakeTx("normal", Infinity, 0), "u-6", "SIMULATION", { plan: "PRO" as const, limit: Infinity }, date);
  ok("unit: limit Infinity → allowed true", r.allowed === true, JSON.stringify(r));
  ok("unit: limit Infinity → used 1", r.used === 1);
})().catch((e) => failures.push("unit infinity: " + e.message));

// u7 — error fatal (P2011) → TIDAK disembunyikan, tetap rethrow.
(async () => {
  await throwsAsync("unit: P2011 tetap rethrow", () => consumeUsageTx(makeFakeTx("fatal", 3), "u-7", "SIMULATION", SIM_OPTS, date), "P2011");
})().catch((e) => failures.push("unit fatal: " + e.message));

// ─────────────────────────────────────────────────────────────────────────────
// Ringkasan — tunggu microtask unit test selesai.
// ─────────────────────────────────────────────────────────────────────────────
setTimeout(() => {
  const total = passed + failures.length;
  console.log(`\ntest-tka-simulation-fix: ${passed}/${total} lulus`);
  if (failures.length) {
    console.log("\nGAGAL:");
    for (const f of failures) console.log("  ✗ " + f);
    process.exit(1);
  }
  console.log("SEMUA LULUS ✅");
  process.exit(0);
}, 100);
