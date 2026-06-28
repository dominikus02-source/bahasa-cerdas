import { db } from "../lib/db";
import * as fs from "fs";
import * as path from "path";

const DRY_RUN = !process.argv.includes("--execute");

interface Candidate {
  table: string;
  id: string;
  title: string;
  reason: string;
}

const SEED_SLUGS_ARTIKEL = [
  "tips-meningkatkan-minat-baca-siswa-era-digital",
  "panduan-lengkap-ukbi-guru-bahasa-indonesia",
  "cara-efektif-mengajar-puisi-kelas-smp",
  "revolusi-ai-pembelajaran-bahasa-indonesia",
  "menyusun-rpp-berdiferensiasi-bahasa-indonesia",
  "mengenal-5-jenis-teks-kurikulum-bahasa-indonesia-smp",
  "strategi-meningkatkan-skor-menulis-siswa",
  "media-digital-pembelajaran-teks-drama",
  "panduan-penulisan-artikel-ilmiah-populer-siswa-sma",
  "mengajar-puisi-kelas-vii-kreatif",
  "panduan-rpp-kurikulum-merdeka-bahasa-indonesia",
  "strategi-menulis-teks-argumentasi-sma",
  "media-digital-pembelajaran-bahasa-indonesia-ai",
  "belajar-teks-negosiasi-bermain-peran",
  "tips-sukses-ukbi-persiapan-strategi",
];

const SEED_SLUGS_VIDEO: string[] = []; // videos don't have slugs, match by title + owner

const DEMO_EMAIL = "guru@demo.com";

async function main() {
  console.log(`\n🧹 DELETE DUMMY CONTENT — ${DRY_RUN ? "DRY RUN (no data deleted)" : "⚠️ EXECUTE MODE"}`);
  console.log("=".repeat(60));

  // Verify backup exists
  const backupsDir = path.join(process.cwd(), "backups", "current");
  if (!fs.existsSync(backupsDir) || fs.readdirSync(backupsDir).length === 0) {
    console.error("❌ No backup found! Run 'npm run backup:current' first.");
    process.exit(1);
  }
  const latestBackup = fs.readdirSync(backupsDir).sort().pop()!;
  console.log(`   Latest backup: ${path.join(backupsDir, latestBackup)}`);

  const demoUser = await db.user.findFirst({ where: { email: DEMO_EMAIL } });
  if (!demoUser) {
    console.error("❌ Demo user not found. Cannot determine seed content owner.");
    process.exit(1);
  }
  console.log(`   Demo user: ${demoUser.email} (${demoUser.id})\n`);

  const candidates: Candidate[] = [];

  // ── Artikel ────────────────────────────────────────
  console.log("📰 ARTIKEL CANDIDATES");
  const allArtikel = await db.artikel.findMany({
    orderBy: { createdAt: "desc" },
  });
  for (const a of allArtikel) {
    const owner = await db.user.findUnique({ where: { id: a.authorId } });
    const reasons: string[] = [];

    if (owner?.email === DEMO_EMAIL) {
      reasons.push(`author is demo user (${DEMO_EMAIL})`);
    }
    if (SEED_SLUGS_ARTIKEL.includes(a.slug)) {
      reasons.push(`slug matches seed homepage-content.json`);
    }
    if (owner?.fullName?.includes("Redaksi") || owner?.fullName?.includes("BahasaCerdas") || owner?.fullName?.includes("Tim")) {
      reasons.push(`author name suggests editorial team`);
    }

    if (reasons.length > 0) {
      candidates.push({ table: "Artikel", id: a.id, title: a.title, reason: reasons.join("; ") });
      console.log(`   [${a.createdAt.toISOString().slice(0, 10)}] ${a.title}`);
      console.log(`      → ${reasons.join("; ")}`);
    }
  }

  // ── Video ──────────────────────────────────────────
  console.log("\n🎬 VIDEO CANDIDATES");
  const allVideo = await db.video.findMany({
    orderBy: { createdAt: "desc" },
  });
  for (const v of allVideo) {
    const reasons: string[] = [];
    const owner = v.creatorId ? await db.user.findUnique({ where: { id: v.creatorId } }) : null;

    if (owner?.email === DEMO_EMAIL) {
      reasons.push(`creator is demo user (${DEMO_EMAIL})`);
    }
    if (owner?.fullName?.includes("Redaksi") || owner?.fullName?.includes("BahasaCerdas") || owner?.fullName?.includes("Tim")) {
      reasons.push(`creator name suggests editorial team`);
    }

    if (reasons.length > 0) {
      candidates.push({ table: "Video", id: v.id, title: v.title, reason: reasons.join("; ") });
      console.log(`   [${v.createdAt.toISOString().slice(0, 10)}] ${v.title}`);
      console.log(`      → ${reasons.join("; ")}`);
    }
  }

  // ── Karya (Marketplace) ────────────────────────────
  console.log("\n🏪 KARYA CANDIDATES");
  const allKarya = await db.karya.findMany({
    orderBy: { createdAt: "desc" },
  });
  for (const k of allKarya) {
    const reasons: string[] = [];
    const seller = await db.user.findUnique({ where: { id: k.sellerId } });

    if (seller?.email === DEMO_EMAIL) {
      reasons.push(`seller is demo user (${DEMO_EMAIL})`);
    }
    if (seller?.fullName?.includes("Redaksi") || seller?.fullName?.includes("BahasaCerdas") || seller?.fullName?.includes("Tim")) {
      reasons.push(`seller name suggests editorial team`);
    }

    if (reasons.length > 0) {
      candidates.push({ table: "Karya", id: k.id, title: k.title, reason: reasons.join("; ") });
      console.log(`   [${k.createdAt.toISOString().slice(0, 10)}] ${k.title} | Rp${k.price}`);
      console.log(`      → ${reasons.join("; ")}`);
    }
  }

  // ── DailyQuest ─────────────────────────────────────
  console.log("\n📋 DAILYQUEST CANDIDATES");
  const allQuest = await db.dailyQuest.findMany();
  if (allQuest.length > 0) {
    for (const q of allQuest) {
      candidates.push({ table: "DailyQuest", id: q.id, title: q.title || `Quest ${q.id}`, reason: "seed/demo daily quest" });
      console.log(`   ${q.title || q.id} (userId: ${q.userId})`);
      console.log(`      → seed/demo daily quest`);
    }
  } else {
    console.log("   (none)");
  }

  // ── Summary ────────────────────────────────────────
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 CANDIDATE SUMMARY`);
  console.log(`   Total candidates: ${candidates.length}`);

  const byTable: Record<string, number> = {};
  for (const c of candidates) {
    byTable[c.table] = (byTable[c.table] || 0) + 1;
  }
  for (const [table, count] of Object.entries(byTable)) {
    console.log(`   ${table}: ${count}`);
  }

  if (DRY_RUN) {
    console.log(`\n⚠️  DRY RUN — No data was deleted.`);
    console.log(`   To execute deletion, run: npm run delete:dummy-content`);
    console.log(`   (script requires --execute flag)\n`);
    await db.$disconnect();
    process.exit(0);
  }

  // ── Execute Deletion ───────────────────────────────
  console.log(`\n⚠️  EXECUTING DELETION...`);

  for (const c of candidates) {
    try {
      switch (c.table) {
        case "Artikel":
          await db.artikel.delete({ where: { id: c.id } });
          break;
        case "Video":
          await db.video.delete({ where: { id: c.id } });
          break;
        case "Karya":
          await db.karya.delete({ where: { id: c.id } });
          break;
        case "DailyQuest":
          await db.dailyQuest.delete({ where: { id: c.id } });
          break;
      }
      console.log(`   ✅ Deleted ${c.table}: "${c.title}"`);
    } catch (err: any) {
      console.error(`   ❌ Failed to delete ${c.table}: "${c.title}" — ${err.message}`);
    }
  }

  // ── Final Verification ─────────────────────────────
  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 VERIFICATION AFTER DELETE");

  const remainingArtikel = await db.artikel.count();
  const remainingVideo = await db.video.count();
  const remainingKarya = await db.karya.count();
  const remainingUser = await db.user.count();
  const remainingProfile = await db.profile.count();
  const remainingUKBI = await db.uKBIQuestion.count();
  const remainingTKA = await db.tKAQuestion.count();
  const remainingPaket = await db.paketKompetensi.count();
  const remainingLearningLevel = await db.learningLevel.count();
  const remainingLearningUnit = await db.learningUnit.count();

  console.log(`   Artikel: ${remainingArtikel} (was ${allArtikel.length})`);
  console.log(`   Video: ${remainingVideo} (was ${allVideo.length})`);
  console.log(`   Karya: ${remainingKarya} (was ${allKarya.length})`);
  console.log(`   User: ${remainingUser} (PRESERVED ✅)`);
  console.log(`   Profile: ${remainingProfile} (PRESERVED ✅)`);
  console.log(`   UKBIQuestion: ${remainingUKBI} (PRESERVED ✅)`);
  console.log(`   TKAQuestion: ${remainingTKA} (PRESERVED ✅)`);
  console.log(`   PaketKompetensi: ${remainingPaket} (PRESERVED ✅)`);
  console.log(`   LearningLevel: ${remainingLearningLevel} (PRESERVED ✅)`);
  console.log(`   LearningUnit: ${remainingLearningUnit} (PRESERVED ✅)`);
  console.log(`\n✅ Done. Backup available at: ${path.join(backupsDir, latestBackup)}`);

  await db.$disconnect();
}

main().catch((e) => {
  console.error("❌ Script failed:", e.message);
  process.exit(1);
});
