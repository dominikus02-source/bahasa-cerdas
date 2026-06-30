import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SEED_GURU_EMAIL = "guru@demo.com";
const DEMO_FILE_URL = "https://example.com/sample.pdf";

const args = process.argv.slice(2);
const isExecute = args.includes("--execute");

let dummyVideoCount = 0;
let dummyKaryaCount = 0;
let needsReviewCount = 0;
let skippedRealCount = 0;

async function main() {
  console.log("=".repeat(60));
  console.log(`  CLEANUP DUMMY PUBLIC CONTENT`);
  console.log(`  Mode: ${isExecute ? "🔴 EXECUTE" : "🟡 DRY-RUN"}`);
  if (!isExecute) console.log("  Gunakan --execute untuk menjalankan");
  console.log("=".repeat(60));

  if (isExecute) {
    console.log("\n⚠️  PERINGATAN: Script ini akan menyembunyikan konten dummy dari publik.");
    console.log("  Tidak ada data yang dihapus — hanya set isPublished = false.");
    console.log("  Tidak mengubah data User, Profile, Payment, Order.");
  }

  // ── 1. IDENTIFY SEED USER ──
  const seedGuru = await db.user.findUnique({ where: { email: SEED_GURU_EMAIL } });
  if (!seedGuru) {
    console.error(`\n❌ Seed user ${SEED_GURU_EMAIL} tidak ditemukan`);
    await db.$disconnect();
    process.exit(1);
  }
  console.log(`\n  Seed user: ${seedGuru.email} (${seedGuru.id})`);

  // ── 2. VIDEOS ──
  console.log("\n── VIDEO ──");
  const allVideos = await db.video.findMany({
    select: { id: true, title: true, videoUrl: true, creatorId: true, views: true, isPublished: true, thumbnailUrl: true },
  });

  const dummyVideos = allVideos.filter(v => {
    const isSeedCreator = v.creatorId === seedGuru.id;
    const isPlaceholderUrl = v.videoUrl?.includes("dQw4w9WgXcQ") || v.videoUrl?.includes("VIDEO_ID_");
    return isSeedCreator || isPlaceholderUrl;
  });

  const needsReviewVideos = allVideos.filter(v => {
    if (dummyVideos.find(d => d.id === v.id)) return false;
    return v.creatorId === seedGuru.id;
  });

  needsReviewCount += needsReviewVideos.length;

  for (const v of dummyVideos) {
    if (v.isPublished) {
      console.log(`  ${isExecute ? "🔴" : "🟡"} ${v.title} — currently PUBLISHED, will be hidden`);
      if (isExecute) {
        await db.video.update({ where: { id: v.id }, data: { isPublished: false } });
        dummyVideoCount++;
      } else {
        dummyVideoCount++;
      }
    } else {
      console.log(`  ✅ ${v.title} — already hidden (isPublished: false)`);
    }
  }

  for (const v of needsReviewVideos) {
    console.log(`  ⚠️  NEEDS REVIEW: ${v.title} (creator: seed user, but not matching dummy pattern)`);
  }

  if (dummyVideos.length === 0) {
    console.log("  ✅ Tidak ada video dummy yang perlu disembunyikan");
  }

  // ── 3. MARKETPLACE KARYA ──
  console.log("\n── TOKO KARYA ──");
  const allKarya = await db.karya.findMany({
    include: { _count: { select: { purchases: true } } },
  });

  const dummyKarya = allKarya.filter(k => {
    const isSeedSeller = k.sellerId === seedGuru.id;
    const isExampleUrl = k.fileUrl === DEMO_FILE_URL;
    const noFileKey = !k.fileKey;
    const noPurchases = k._count.purchases === 0;
    return (isSeedSeller || isExampleUrl) && noFileKey && noPurchases;
  });

  const needsReviewKarya = allKarya.filter(k => {
    if (dummyKarya.find(d => d.id === k.id)) return false;
    const isSeedSeller = k.sellerId === seedGuru.id;
    return isSeedSeller && !dummyKarya.find(d => d.id === k.id);
  });

  const realKarya = allKarya.filter(k => {
    if (dummyKarya.find(d => d.id === k.id)) return false;
    if (needsReviewKarya.find(n => n.id === k.id)) return false;
    return k.fileKey || k._count.purchases > 0;
  });

  needsReviewCount += needsReviewKarya.length;
  skippedRealCount += realKarya.length;

  for (const k of dummyKarya) {
    if (k.isPublished) {
      console.log(`  ${isExecute ? "🔴" : "🟡"} ${k.title} — currently PUBLISHED, will be hidden`);
      if (isExecute) {
        await db.karya.update({ where: { id: k.id }, data: { isPublished: false } });
        dummyKaryaCount++;
      } else {
        dummyKaryaCount++;
      }
    } else {
      console.log(`  ✅ ${k.title} — already hidden (isPublished: false)`);
    }
  }

  for (const k of needsReviewKarya) {
    console.log(`  ⚠️  NEEDS REVIEW: ${k.title} (seller: seed user, but has purchases or fileKey)`);
  }

  for (const k of realKarya) {
    console.log(`  ✅ SKIPPED (real): ${k.title} (${k._count.purchases} purchases, fileKey: ${k.fileKey ? "yes" : "no"})`);
  }

  if (dummyKarya.length === 0) {
    console.log("  ✅ Tidak ada karya dummy yang perlu disembunyikan");
  }

  // ── SUMMARY ──
  console.log("\n" + "=".repeat(60));
  console.log("  SUMMARY");
  console.log("=".repeat(60));
  console.log(`  Video dummy disembunyikan: ${dummyVideoCount}`);
  console.log(`  Karya dummy disembunyikan: ${dummyKaryaCount}`);
  console.log(`  Needs review: ${needsReviewCount}`);
  console.log(`  Real content skipped: ${skippedRealCount}`);
  console.log(`  Mode: ${isExecute ? "🔴 EXECUTED" : "🟡 DRY-RUN"}`);

  if (!isExecute) {
    console.log("\n  Jalankan dengan --execute untuk menerapkan.");
  }

  console.log("=".repeat(60));

  await db.$disconnect();
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});
