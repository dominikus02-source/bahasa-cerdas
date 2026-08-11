/**
 * seed-premium-plans.ts — seed Plan + Entitlement (BC Premium Economy).
 *
 * Idempotent (upsert-only), dry-run default. Jalankan `--execute` untuk apply
 * ke Supabase. Migration SQL dulu: prisma/migrations/manual/2026-08-11_premium_economy.sql
 *
 * angka AI = hasil audit: limit AI existing berbasis kredit bulanan, bukan
 * harian per fitur → AI_MENTOR/AI_PRACTICE unlimited (perilaku tidak berubah).
 */
import { PrismaClient } from "@prisma/client";
import { loadScriptEnv, requireDatabaseUrl } from "./_env";

loadScriptEnv();
const db = new PrismaClient({ datasources: { db: { url: requireDatabaseUrl() } } });

const EXECUTE = process.argv.includes("--execute");

const PLANS = [
  { code: "FREE", name: "Gratis", description: "Akses dasar BahasaCerdas tanpa biaya." },
  { code: "PRO", name: "BC PRO", description: "Akses penuh + kuota simulasi lebih besar (target harga bisnis Rp25.000/bulan — belum diproses payment layer)." },
  { code: "FOUNDER", name: "Founder", description: "Plan internal pendiri/admin — unlimited." },
] as const;

// key: EntitlementKey; value: { type, value? }
// BOOLEAN → value 0/1; LIMIT → value N; UNLIMITED → value null
const ENTITLEMENTS: Record<string, Record<string, { type: "BOOLEAN" | "LIMIT" | "UNLIMITED"; value?: number | null }>> = {
  FREE: {
    SIMULATION_MONTHLY_LIMIT: { type: "LIMIT", value: 3 },
    AI_MENTOR_DAILY_LIMIT: { type: "UNLIMITED", value: null },
    AI_PRACTICE_MONTHLY_LIMIT: { type: "UNLIMITED", value: null },
    PREMIUM_PROFILE: { type: "BOOLEAN", value: 0 },
    PREMIUM_COSMETICS: { type: "BOOLEAN", value: 0 },
    ADVANCED_STATS: { type: "BOOLEAN", value: 0 },
    STREAK_FREEZE_MONTHLY: { type: "LIMIT", value: 0 },
  },
  PRO: {
    SIMULATION_MONTHLY_LIMIT: { type: "LIMIT", value: 10 },
    AI_MENTOR_DAILY_LIMIT: { type: "UNLIMITED", value: null },
    AI_PRACTICE_MONTHLY_LIMIT: { type: "UNLIMITED", value: null },
    PREMIUM_PROFILE: { type: "BOOLEAN", value: 1 },
    PREMIUM_COSMETICS: { type: "BOOLEAN", value: 1 },
    ADVANCED_STATS: { type: "BOOLEAN", value: 1 },
    STREAK_FREEZE_MONTHLY: { type: "LIMIT", value: 1 },
  },
  FOUNDER: {
    SIMULATION_MONTHLY_LIMIT: { type: "UNLIMITED", value: null },
    AI_MENTOR_DAILY_LIMIT: { type: "UNLIMITED", value: null },
    AI_PRACTICE_MONTHLY_LIMIT: { type: "UNLIMITED", value: null },
    PREMIUM_PROFILE: { type: "BOOLEAN", value: 1 },
    PREMIUM_COSMETICS: { type: "BOOLEAN", value: 1 },
    ADVANCED_STATS: { type: "BOOLEAN", value: 1 },
    STREAK_FREEZE_MONTHLY: { type: "UNLIMITED", value: null },
  },
};

async function main() {
  console.log(`Seed BC Premium Economy (${EXECUTE ? "APPLY" : "DRY-RUN"})`);

  let planCount = 0;
  let entitlementCount = 0;

  for (const plan of PLANS) {
    if (EXECUTE) {
      await db.plan.upsert({
        where: { code: plan.code },
        create: { code: plan.code, name: plan.name, description: plan.description ?? null },
        update: { name: plan.name, description: plan.description ?? null },
      });
    }
    planCount++;
    const rows = ENTITLEMENTS[plan.code];
    for (const [key, cfg] of Object.entries(rows)) {
      if (EXECUTE) {
        await db.entitlement.upsert({
          where: { planCode_key: { planCode: plan.code, key } },
          create: { planCode: plan.code, key, type: cfg.type, value: cfg.value ?? null },
          update: { type: cfg.type, value: cfg.value ?? null },
        });
      }
      entitlementCount++;
    }
    console.log(`  plan ${plan.code}: ${Object.keys(rows).length} entitlement${EXECUTE ? " ✓" : " (dry)"}`);
  }

  console.log(`\nTotal: ${planCount} plan, ${entitlementCount} entitlement.`);
  if (!EXECUTE) {
    console.log("Jalankan dengan --execute untuk apply. Migration SQL dulu: prisma/migrations/manual/2026-08-11_premium_economy.sql");
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
