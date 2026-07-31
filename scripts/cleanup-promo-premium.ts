/**
 * Cleanup Promo Premium (Phase PRO PLAN, July 31, 2026)
 *
 * Menghapus status PRO yang diberikan promo "2 bulan" lama di /api/user/me (sudah
 * dihapus dari kode). Semua user GURU yang isPremium=true TANPA transaksi
 * PREMIUM_UPGRADE berstatus SUCCESS di-reset ke Guru Free (isPremium=false,
 * premiumPlan="FREE", premiumUntil=null).
 *
 * Setelah reset, user akan otomatis mendapat Guru Pro Trial 30 hari pada login
 * berikutnya (via startGuruTrialIfEligible di /guru/layout) dan setelah habis
 * harus membeli Pro dengan kupon.
 *
 * Dry-run by default. Gunakan --execute untuk menerapkan.
 *
 * Run: npx tsx scripts/cleanup-promo-premium.ts
 *      npx tsx scripts/cleanup-promo-premium.ts --execute
 */

import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: ".env.local" });

function cleanUrl(v: string | undefined): string | undefined {
  if (!v) return undefined;
  return v.trim().replace(/^["']|["']$/g, "");
}

const DATABASE_URL = cleanUrl(process.env.DATABASE_URL) ?? cleanUrl(process.env.DIRECT_URL);

if (!DATABASE_URL || !/^postgres(ql)?:\/\//.test(DATABASE_URL)) {
  console.error(
    "DATABASE_URL di .env.local tidak valid. Pastikan nilainya diawali postgresql:// dan tidak ada spasi di awal.\n" +
      "Contoh: DATABASE_URL=postgresql://postgres.xxx:password@host:6543/postgres"
  );
  process.exit(1);
}

process.env.DATABASE_URL = DATABASE_URL;

const db = new PrismaClient();
const isExecute = process.argv.includes("--execute");

async function main() {
  const now = new Date();

  // User GURU yang saat ini "premium" (bukan founder) dengan premiumUntil di masa depan
  const gurus = await db.user.findMany({
    where: {
      role: "GURU",
      isFounder: false,
      isPremium: true,
      premiumUntil: { gt: now },
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      premiumPlan: true,
      premiumUntil: true,
      trialStartedAt: true,
      transaksi: {
        where: { type: "PREMIUM_UPGRADE", status: "SUCCESS" },
        select: { id: true },
        take: 1,
      },
    },
  });

  const promoOnly = gurus.filter((g) => g.transaksi.length === 0);
  const paid = gurus.filter((g) => g.transaksi.length > 0);

  console.log("=== CLEANUP PROMO PREMIUM ===");
  console.log(`Guru premium aktif total     : ${gurus.length}`);
  console.log(`  - punya riwayat bayar      : ${paid.length} (DILEWATKAN, aman)`);
  console.log(`  - murni dari promo         : ${promoOnly.length} (TARGET reset)`);
  console.log("");

  for (const u of promoOnly.slice(0, 20)) {
    console.log(
      `  - ${u.email} (${u.fullName || "-"}) plan=${u.premiumPlan} sampai=${u.premiumUntil?.toISOString().slice(0, 10)} trial=${u.trialStartedAt ? "ya" : "belum"}`
    );
  }
  if (promoOnly.length > 20) {
    console.log(`  ... dan ${promoOnly.length - 20} lainnya`);
  }

  if (promoOnly.length === 0) {
    console.log("\nTidak ada user yang perlu di-reset. Selesai.");
    await db.$disconnect();
    process.exit(0);
  }

  if (!isExecute) {
    console.log(`\nDRY-RUN — tidak ada perubahan. Jalankan dengan --execute untuk reset ${promoOnly.length} user.`);
    await db.$disconnect();
    process.exit(0);
  }

  const ids = promoOnly.map((u) => u.id);
  const result = await db.user.updateMany({
    where: { id: { in: ids } },
    data: {
      isPremium: false,
      premiumPlan: "FREE",
      premiumUntil: null,
    },
  });

  console.log(`\nReset selesai: ${result.count} user dikembalikan ke Guru Free.`);
  console.log("User ini akan otomatis mendapat Guru Pro Trial 30 hari di login berikutnya.");

  await db.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error("Error:", e);
  await db.$disconnect();
  process.exit(1);
});
