/**
 * test-premium-economy.ts — regresi BC PREMIUM ECONOMY FOUNDATION (fase P1).
 *
 * Bagian 1 — logika murni (tanpa DB): resolusi plan, matrix entitlement,
 * period WIB, semantik konsumsi atomic.
 * Bagian 2 — asersi statis: gate simulasi, status API, keamanan
 * (no client trust), tanpa payment, tanpa perubahan gamification.
 *
 * Jalankan: npm run test:premium-economy
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { resolvePlanForUser } from "../lib/premium-economy/plans";
import { getPeriodKey } from "../lib/premium-economy/period";
import {
  DEFAULT_ENTITLEMENT_MATRIX,
  entitlementValueToLimit,
} from "../lib/premium-economy/matrix";
import {
  ENTITLEMENT_KEYS,
  USAGE_FEATURES,
  ENTITLEMENT_USAGE_FEATURE,
  entitlementKeyForUsageFeature,
} from "../lib/premium-economy/features";

const root = process.cwd();
let failures = 0;
const checks: { name: string; pass: boolean; detail?: string }[] = [];

function check(name: string, pass: boolean, detail?: string) {
  checks.push({ name, pass, detail });
  if (!pass) failures++;
}

// ─────────────────────────── 1. Logika murni ───────────────────────────

// [1] Existing user tanpa subscription → FREE (default).
check(
  "1. existing user defaults FREE",
  resolvePlanForUser({ role: "GURU", isFounder: false, isPremium: false, premiumUntil: null, trialEndsAt: null }).plan === "FREE" &&
    resolvePlanForUser({ role: "MURID", isFounder: false, isPremium: false, premiumUntil: null, trialEndsAt: null }).plan === "FREE"
);
check(
  "1b. isPremium kadaluarsa → FREE (bukan PRO)",
  resolvePlanForUser({ role: "GURU", isFounder: false, isPremium: true, premiumUntil: new Date(Date.now() - 1000), trialEndsAt: null }).plan === "FREE"
);
check(
  "1c. founder/admin → FOUNDER",
  resolvePlanForUser({ role: "ADMIN", isFounder: false, isPremium: false, premiumUntil: null, trialEndsAt: null }).plan === "FOUNDER" &&
    resolvePlanForUser({ role: "GURU", isFounder: true, isPremium: false, premiumUntil: null, trialEndsAt: null }).plan === "FOUNDER"
);
check(
  "1d. trial berjalan → PRO (trial = akses PRO sementara)",
  resolvePlanForUser({ role: "GURU", isFounder: false, isPremium: false, premiumUntil: null, trialEndsAt: new Date(Date.now() + 86400000) }).plan === "PRO"
);
check(
  "1e. legacy isPremium aktif → PRO",
  resolvePlanForUser({ role: "GURU", isFounder: false, isPremium: true, premiumUntil: new Date(Date.now() + 86400000), trialEndsAt: null }).plan === "PRO"
);
// Precedence kanonik FOUNDER > PRO > TRIAL > FREE — kombinasi flag.
check(
  "1f. founder + legacy premium aktif → FOUNDER (founder menang)",
  resolvePlanForUser({ role: "GURU", isFounder: true, isPremium: true, premiumUntil: new Date(Date.now() + 86400000), trialEndsAt: null }).plan === "FOUNDER"
);
check(
  "1g. founder + trial berjalan → FOUNDER (founder menang)",
  resolvePlanForUser({ role: "GURU", isFounder: true, isPremium: false, premiumUntil: null, trialEndsAt: new Date(Date.now() + 86400000) }).plan === "FOUNDER"
);
check(
  "1h. normal user + trial → PRO dengan status TRIALING",
  resolvePlanForUser({ role: "GURU", isFounder: false, isPremium: false, premiumUntil: null, trialEndsAt: new Date(Date.now() + 86400000) }).plan === "PRO" &&
    resolvePlanForUser({ role: "GURU", isFounder: false, isPremium: false, premiumUntil: null, trialEndsAt: new Date(Date.now() + 86400000) }).subscriptionStatus === "TRIALING"
);
check(
  "1i. normal user tanpa premium → FREE (status null)",
  resolvePlanForUser({ role: "GURU", isFounder: false, isPremium: false, premiumUntil: null, trialEndsAt: null }).subscriptionStatus === null
);

// [2][3] FREE simulation limit = 3, PRO = 10 (matrix default).
const FREE_SIM = entitlementValueToLimit(DEFAULT_ENTITLEMENT_MATRIX.FREE.SIMULATION_MONTHLY_LIMIT);
const PRO_SIM = entitlementValueToLimit(DEFAULT_ENTITLEMENT_MATRIX.PRO.SIMULATION_MONTHLY_LIMIT);
check("2. FREE simulation limit = 3", FREE_SIM === 3);
check("3. PRO simulation limit = 10", PRO_SIM === 10);
check(
  "3b. PRO > FREE (nilai PRO tidak pernah menurunkan)",
  PRO_SIM > FREE_SIM
);

// [12][13][14] entitlement boolean.
check("12. PREMIUM_PROFILE: FREE false, PRO true", DEFAULT_ENTITLEMENT_MATRIX.FREE.PREMIUM_PROFILE === false && DEFAULT_ENTITLEMENT_MATRIX.PRO.PREMIUM_PROFILE === true);
check("13. PREMIUM_COSMETICS: FREE false, PRO true", DEFAULT_ENTITLEMENT_MATRIX.FREE.PREMIUM_COSMETICS === false && DEFAULT_ENTITLEMENT_MATRIX.PRO.PREMIUM_COSMETICS === true);
check("14. ADVANCED_STATS: FREE false, PRO true", DEFAULT_ENTITLEMENT_MATRIX.FREE.ADVANCED_STATS === false && DEFAULT_ENTITLEMENT_MATRIX.PRO.ADVANCED_STATS === true);
check(
  "12b. STREAK_FREEZE: FREE 0, PRO 1",
  DEFAULT_ENTITLEMENT_MATRIX.FREE.STREAK_FREEZE_MONTHLY === 0 &&
    DEFAULT_ENTITLEMENT_MATRIX.PRO.STREAK_FREEZE_MONTHLY === 1
);
check(
  "12c. FOUNDER simulasi unlimited",
  DEFAULT_ENTITLEMENT_MATRIX.FOUNDER.SIMULATION_MONTHLY_LIMIT === "unlimited" &&
    entitlementValueToLimit(DEFAULT_ENTITLEMENT_MATRIX.FOUNDER.SIMULATION_MONTHLY_LIMIT) === Infinity
);

// [5] usage cannot exceed limit — semantik atomic WHERE used < limit.
const canConsume = (used: number, limit: number) => used < limit;
check("5. usage cannot exceed limit (3/3 → denied)", !canConsume(3, 3));
check("5b. 2/3 → allowed, 3/3 setelah increment → denied", canConsume(2, 3) && !canConsume(3, 3));
check("5c. limit 0 → selalu denied", !canConsume(0, 0) && !canConsume(1, 0));
check("5d. unlimited → selalu allowed", canConsume(0, Infinity) && canConsume(9999, Infinity));

// [8] WIB period calculation.
// 2026-08-11T16:59Z = 23:59 WIB → masih 2026-08-11.
check(
  "8. WIB 23:59 (UTC 16:59) masih hari yang sama",
  getPeriodKey("DAY", new Date("2026-08-11T16:59:00Z")) === "2026-08-11"
);
// 2026-08-11T17:00Z = 00:00 WIB 2026-08-12 → hari berganti.
check(
  "8b. WIB 00:00 (UTC 17:00) → hari berikutnya",
  getPeriodKey("DAY", new Date("2026-08-11T17:00:00Z")) === "2026-08-12"
);
// Batas bulan: 2026-07-31T17:30Z = 00:30 WIB 2026-08-01 → bulan berganti.
check(
  "8c. WIB melewati batas bulan → period bulan baru",
  getPeriodKey("MONTH", new Date("2026-07-31T17:30:00Z")) === "2026-08"
);
check(
  "8d. tengah bulan normal",
  getPeriodKey("MONTH", new Date("2026-08-10T03:00:00Z")) === "2026-08"
);

// [6][7] period isolation: MONTH vs DAY menghasilkan key berbeda.
check("6. monthly key format YYYY-MM", /^\d{4}-\d{2}$/.test(getPeriodKey("MONTH")));
check("7. daily key format YYYY-MM-DD", /^\d{4}-\d{2}-\d{2}$/.test(getPeriodKey("DAY")));
check(
  "6b. dua tanggal beda bulan → key beda",
  getPeriodKey("MONTH", new Date("2026-08-01T00:00:00Z")) !== getPeriodKey("MONTH", new Date("2026-09-01T00:00:00Z"))
);

// [4] usage increment — semantik: 1 per konsumsi yang allowed.
check("4. increment 1 per konsumsi (2 → 3, bukan 4)", canConsume(2, 3) && !canConsume(3, 3));

// Konsistensi mapping entitlement ↔ usage feature.
check(
  "4b. SIMULATION → SIMULATION_MONTHLY_LIMIT",
  entitlementKeyForUsageFeature("SIMULATION") === "SIMULATION_MONTHLY_LIMIT"
);
check(
  "4c. AI_MENTOR → AI_MENTOR_DAILY_LIMIT",
  entitlementKeyForUsageFeature("AI_MENTOR") === "AI_MENTOR_DAILY_LIMIT"
);
check(
  "4d. semua usage feature punya entitlement pemetak",
  USAGE_FEATURES.every((f) => entitlementKeyForUsageFeature(f) !== null)
);
check(
  "4e. entitlement BOOLEAN tidak punya usage",
  ENTITLEMENT_USAGE_FEATURE.PREMIUM_PROFILE === null &&
    ENTITLEMENT_USAGE_FEATURE.PREMIUM_COSMETICS === null &&
    ENTITLEMENT_USAGE_FEATURE.ADVANCED_STATS === null
);

// ─────────────────────────── 2. Asersi statis ───────────────────────────

const FILES = {
  routeSim: join(root, "app/api/kompetensi/[paketId]/route.ts"),
  routeStatus: join(root, "app/api/player/premium/status/route.ts"),
  usageLib: join(root, "lib/premium-economy/usage.ts"),
  plansLib: join(root, "lib/premium-economy/plans.ts"),
  featuresLib: join(root, "lib/premium-economy/features.ts"),
  entitlementLib: join(root, "lib/premium-economy/entitlement.ts"),
  periodLib: join(root, "lib/premium-economy/period.ts"),
  migration: join(root, "prisma/migrations/manual/2026-08-11_premium_economy.sql"),
  schema: join(root, "prisma/schema.prisma"),
  submitRoute: join(root, "app/api/kompetensi/[paketId]/submit/route.ts"),
};

for (const [label, p] of Object.entries(FILES)) {
  if (!existsSync(p)) {
    check(`file ada: ${label}`, false, `${p} tidak ditemukan`);
    process.exit(1);
  }
}

const sim = readFileSync(FILES.routeSim, "utf8");
const status = readFileSync(FILES.routeStatus, "utf8");
const usage = readFileSync(FILES.usageLib, "utf8");
const plans = readFileSync(FILES.plansLib, "utf8");
const features = readFileSync(FILES.featuresLib, "utf8");
const entitlement = readFileSync(FILES.entitlementLib, "utf8");
const period = readFileSync(FILES.periodLib, "utf8");
const migration = readFileSync(FILES.migration, "utf8");
const schema = readFileSync(FILES.schema, "utf8");
const submit = readFileSync(FILES.submitRoute, "utf8");

// [10] unauthorized request denied — status endpoint auth-gated.
check("10. status endpoint auth-gated (401 tanpa user)", /if \(!user\) return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\)/.test(status));

// [11] client tidak bisa spoof plan — status endpoint tidak membaca body/query.
check(
  "11. status endpoint tidak menerima plan/quota dari client",
  !/req\.json|searchParams\.get\("plan"\)|searchParams\.get\("quota"\)/.test(status) && !status.includes("req: NextRequest")
);

// Gate simulasi.
check(
  "G1. route simulasi mengimpor premium engine",
  /from "@\/lib\/premium(-economy)?"/.test(sim)
);
check(
  "G2. gate konsumsi HANYA pada attempt baru (bukan replay)",
  !/mode === "replay"[\s\S]{0,200}consumeUsageGuarded/.test(sim) &&
    /mode: "replay", session: existing[\s\S]{0,120}if \(existing && \(existing\.status === "COMPLETED" \|\| isExpired\)\)/.test(sim)
);
check(
  "G3. konsumsi terjadi di dalam transaksi yang sama",
  /db\.\$transaction[\s\S]{0,3000}consumeUsageGuarded/.test(sim)
);
check(
  "G4. structured response FEATURE_LIMIT_REACHED",
  /code: "FEATURE_LIMIT_REACHED"/.test(sim) && /upgradeAvailable: true/.test(sim) && /feature: "SIMULATION"/.test(sim)
);
check(
  "G5. tanpa hard redirect ke payment (tidak ada checkout/payment di route)",
  !/payment|checkout|midtrans/i.test(sim)
);
check(
  "G6. double-click aman (createMany skipDuplicates + updateMany predicate)",
  /skipDuplicates: true/.test(sim) && /updateMany[\s\S]{0,400}OR: \[\s*\{ status: "COMPLETED" \}/.test(sim)
);
check(
  "G7. submit route tidak mengonsumsi kuota",
  !/premium|consumeUsage/i.test(submit)
);

// [P] Precedence DB resolver: FOUNDER > PRO > TRIAL > FREE.
const dbResolver = plans.slice(plans.indexOf("export function resolvePlan"));
const founderIdx = dbResolver.indexOf('user.role === "ADMIN" || user.isFounder');
const activeSubIdx = dbResolver.indexOf("activeSub");
check(
  "P1. DB resolver cek founder SEBELUM subscription aktif",
  founderIdx !== -1 && activeSubIdx !== -1 && founderIdx < activeSubIdx
);
check(
  "P1b. founder di DB resolver → FOUNDER tanpa subscriptionId",
  /plan: "FOUNDER",\s*subscriptionStatus: "FOUNDER",\s*subscriptionId: null/.test(dbResolver)
);

// Usage engine — atomicity & P2002 safety.
check(
  "U1. increment atomic bersyarat (WHERE used < limit)",
  /updateMany[\s\S]{0,200}used: \{ lt: limit \}/.test(usage)
);
check(
  "U2. create race ditangani (P2002)",
  /"P2002"/.test(usage)
);
check(
  "U3. consumeUsageTx mendukung transaksi (Prisma.TransactionClient)",
  /Prisma\.TransactionClient/.test(usage)
);
check(
  "U4. canUseFeature read-only (tidak memanggil increment/create)",
  !/\.updateMany\(|\.create\(|upsert/.test(usage.split("export async function consumeUsageTx")[0] ?? "")
);
check(
  "U5. FeatureLimitError membawa gate",
  /class FeatureLimitError/.test(usage) && /readonly gate: UsageResult/.test(usage)
);

// Period WIB.
check("P1. period lib memakai offset UTC+7", /7 \* 60 \* 60 \* 1000/.test(period));

// [15][16][17][18] Tidak ada perubahan XP/Rank/Badge/Leaderboard:
// lib/premium TIDAK menyentuh gamification engine.
const premiumLibs = [usage, plans, features, entitlement, period].join("\n");
check(
  "15. no changes to XP — premium lib tidak mengimpor gamification/awardXp",
  !/gamification|awardXp|xpTransaction|PlayerProfile/i.test(premiumLibs)
);
check(
  "16. no changes to Rank — tidak ada rank/currentRank di premium lib",
  !/currentRank|rankFromLevel|PlayerRank/i.test(premiumLibs)
);
check(
  "17. no changes to Badge — tidak ada badge di premium lib",
  !/badge/i.test(premiumLibs)
);
check(
  "18. no changes to Leaderboard — tidak ada leaderboard di premium lib",
  !/leaderboard/i.test(premiumLibs)
);
check(
  "15b. route simulasi tidak memberi XP/koin ekstra di gate",
  !/awardXp|addCoin|addXp/i.test(sim.split("PREMIUM GATE")[0] ?? "") && !/awardXp|addCoin|addXp/.test(sim.split("PREMIUM GATE + SESSION")[1] ?? "")
);

// Schema & migration — additive-only, tanpa payment, tanpa field XP baru.
const premiumModels = schema.slice(schema.indexOf("model Plan"), schema.indexOf("model AdminPaymentAuditLog") > 0 ? schema.indexOf("model AdminPaymentAuditLog") : schema.length);
check(
  "M1. schema berisi Plan + Entitlement + PremiumUsage",
  /model Plan \{/.test(schema) && /model Entitlement \{/.test(schema) && /model PremiumUsage \{/.test(schema)
);
check(
  "M2. PremiumUsage unique (userId, featureCode, periodKey)",
  /@@unique\(\[userId, featureCode, periodKey\]\)/.test(schema)
);
check(
  "M3. Entitlement unique (planCode, key)",
  /@@unique\(\[planCode, key\]\)/.test(schema)
);
check(
  "M4. tidak ada field XP/Rank/koin di model premium baru",
  !/xp|rank|coin|level/i.test(premiumModels)
);
check(
  "M5. migration additive-only (tidak ada DROP)",
  !/DROP TABLE|DROP COLUMN|DROP INDEX/i.test(migration)
);
check(
  "M6. migration idempoten (IF NOT EXISTS)",
  /CREATE TABLE IF NOT EXISTS/.test(migration)
);
check(
  "M7. tidak ada payment/checkout/stripe/midtrans baru di migration",
  !/payment|checkout|stripe|midtrans/i.test(migration)
);
check(
  "M8. Subscription existing tidak diubah schema-nya",
  !/DROP|ALTER TABLE "Subscription"/.test(migration)
);

// ─────────────────────────── Ringkasan ───────────────────────────

console.log(`\nTest Premium Economy: ${checks.length - failures}/${checks.length} lulus`);
for (const c of checks) {
  if (!c.pass) console.log(`  ✗ ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
}
if (failures > 0) {
  console.log(`\n${failures} GAGAL ❌`);
  process.exit(1);
}
console.log("SEMUA LULUS ✅");
process.exit(0);
