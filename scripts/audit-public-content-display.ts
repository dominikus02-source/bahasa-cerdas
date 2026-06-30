import { PrismaClient } from "@prisma/client";
import fs from "fs";

const db = new PrismaClient();

const SEED_GURU_EMAIL = "guru@demo.com";
const DEMO_FILE_URL = "https://example.com/sample.pdf";

async function main() {
  console.log("=".repeat(60));
  console.log("  AUDIT PUBLIC CONTENT DISPLAY");
  console.log("=".repeat(60));

  // ── 1. ARTICLES ──
  console.log("\n── ARTIKEL ──");
  const totalArticles = await db.artikel.count();
  const publishedArticles = await db.artikel.count({ where: { isPublished: true } });
  const draftArticles = await db.artikel.count({ where: { isPublished: false } });
  const founderArticles = await db.artikel.count({ where: { source: "FOUNDER_ARCHIVE" } });

  const allPublished = await db.artikel.findMany({
    where: { isPublished: true },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true, title: true, slug: true, source: true,
      publishedAt: true, createdAt: true, authorId: true,
      excerpt: true, tags: true, coverImageUrl: true,
      author: { select: { email: true, fullName: true } },
    },
  });

  console.log(`  Total artikel: ${totalArticles}`);
  console.log(`  PUBLISHED: ${publishedArticles}`);
  console.log(`  DRAFT: ${draftArticles}`);
  console.log(`  FOUNDER_ARCHIVE: ${founderArticles}`);
  console.log(`  Tampil di /artikel (limit 12): ${Math.min(publishedArticles, 12)}`);
  console.log(`  Tersembunyi (tanpa pagination): ${Math.max(0, publishedArticles - 12)}`);

  // Founder articles status
  const founderPublished = allPublished.filter(a => a.source === "FOUNDER_ARCHIVE");
  const founderDraft = founderArticles - founderPublished.length;
  console.log(`\n  Founder articles PUBLISHED: ${founderPublished.length}/${founderArticles}`);
  if (founderDraft > 0) console.log(`  ⚠️  ${founderDraft} founder articles masih DRAFT`);

  // Check for email leak
  const emailsFound = allPublished.filter(a => a.author?.email);
  if (emailsFound.length > 0) {
    console.log(`\n  ⚠️  ${emailsFound.length} artikel expose email penulis di query select`);
    console.log(`     (perlu diperbaiki — email jangan dikirim ke client)`);
  } else {
    console.log(`\n  ✅ Tidak ada email penulis di query publik`);
  }

  // Articles without excerpt
  const noExcerpt = allPublished.filter(a => !a.excerpt);
  if (noExcerpt.length > 0) {
    console.log(`  ⚠️  ${noExcerpt.length} artikel tanpa excerpt`);
  }

  // ── 2. VIDEOS ──
  console.log("\n── VIDEO ──");
  const totalVideos = await db.video.count();
  const publishedVideos = await db.video.count({ where: { isPublished: true } });
  const allVideos = await db.video.findMany({
    where: { isPublished: true },
    select: {
      id: true, title: true, videoUrl: true, creatorId: true,
      views: true, duration: true, thumbnailUrl: true,
      creator: { select: { email: true, fullName: true } },
    },
  });

  const dummyVideos = allVideos.filter(v => {
    const isSeedCreator = v.creator?.email === SEED_GURU_EMAIL;
    const isPlaceholderUrl = v.videoUrl?.includes("dQw4w9WgXcQ") || v.videoUrl?.includes("VIDEO_ID_");
    const hasFakeViews = [340, 567, 780, 890, 1250, 2100].includes(v.views ?? -1);
    return isSeedCreator || isPlaceholderUrl || hasFakeViews;
  });

  const needsReviewVideos = allVideos.filter(v => {
    if (dummyVideos.find(d => d.id === v.id)) return false;
    const isSeedCreator = v.creator?.email === SEED_GURU_EMAIL;
    return isSeedCreator && !dummyVideos.find(d => d.id === v.id);
  });

  const realVideos = allVideos.filter(v => {
    if (dummyVideos.find(d => d.id === v.id)) return false;
    if (needsReviewVideos.find(n => n.id === v.id)) return false;
    return true;
  });

  console.log(`  Total video: ${totalVideos}`);
  console.log(`  PUBLISHED: ${publishedVideos}`);
  console.log(`  REAL: ${realVideos.length}`);
  console.log(`  DUMMY: ${dummyVideos.length}`);
  console.log(`  NEEDS_REVIEW: ${needsReviewVideos.length}`);

  if (dummyVideos.length > 0) {
    console.log(`\n  Daftar DUMMY:`);
    dummyVideos.forEach(v => {
      console.log(`    - ${v.title} (creator: ${v.creator?.email || "null"}, views: ${v.views})`);
    });
  }

  // ── 3. MARKETPLACE ──
  console.log("\n── TOKO KARYA ──");
  const totalKarya = await db.karya.count();
  const publishedKarya = await db.karya.count({ where: { isPublished: true } });
  const totalOrders = await db.pembelian.count();

  const allKarya = await db.karya.findMany({
    where: { isPublished: true },
    include: {
      seller: { select: { email: true, fullName: true } },
      _count: { select: { purchases: true } },
    },
  });

  const dummyKarya = allKarya.filter(k => {
    const isSeedSeller = k.seller?.email === SEED_GURU_EMAIL;
    const isExampleUrl = k.fileUrl === DEMO_FILE_URL;
    const noFileKey = !k.fileKey;
    const noPurchases = k._count.purchases === 0;
    return (isSeedSeller || isExampleUrl) && noFileKey && noPurchases;
  });

  const needsReviewKarya = allKarya.filter(k => {
    if (dummyKarya.find(d => d.id === k.id)) return false;
    const isSeedSeller = k.seller?.email === SEED_GURU_EMAIL;
    return isSeedSeller && !dummyKarya.find(d => d.id === k.id);
  });

  const realKarya = allKarya.filter(k => {
    if (dummyKarya.find(d => d.id === k.id)) return false;
    if (needsReviewKarya.find(n => n.id === k.id)) return false;
    return k.fileKey && k._count.purchases > 0;
  });

  console.log(`  Total karya: ${totalKarya}`);
  console.log(`  PUBLISHED: ${publishedKarya}`);
  console.log(`  REAL: ${realKarya.length}`);
  console.log(`  DUMMY: ${dummyKarya.length}`);
  console.log(`  NEEDS_REVIEW: ${needsReviewKarya.length}`);
  console.log(`  Total orders/purchases: ${totalOrders}`);

  if (dummyKarya.length > 0) {
    console.log(`\n  Daftar DUMMY:`);
    dummyKarya.forEach(k => {
      console.log(`    - ${k.title} (Rp ${k.price}, seller: ${k.seller?.email || "null"}, fileUrl: ${k.fileUrl?.slice(0, 40)})`);
    });
  }

  if (needsReviewKarya.length > 0) {
    console.log(`\n  ⚠️  NEEDS_REVIEW:`);
    needsReviewKarya.forEach(k => {
      console.log(`    - ${k.title} (seller: ${k.seller?.email || "null"})`);
    });
  }

  // ── 4. CHECKOUT / CART GUARD ──
  console.log("\n── CHECKOUT / CART GUARD ──");
  const purchaseRoute = fs.readFileSync("app/api/marketplace/purchase/route.ts", "utf-8");
  const guardsPublished = purchaseRoute.includes("!karya.isPublished");
  const guardsSelfBuy = purchaseRoute.includes("karya.sellerId === dbUser.id");
  const guardsFreeItems = purchaseRoute.includes("karya.price === 0");

  console.log(`  Purchase guard isPublished: ${guardsPublished ? "✅" : "❌"}`);
  console.log(`  Purchase guard self-buy: ${guardsSelfBuy ? "✅" : "❌"}`);
  console.log(`  Purchase guard free items: ${guardsFreeItems ? "✅" : "❌"}`);

  // Cart is localStorage only — no server-side guard needed
  console.log(`  Cart: localStorage only (no server-side API)`);

  // ── SUMMARY ──
  console.log("\n" + "=".repeat(60));
  console.log("  SUMMARY");
  console.log("=".repeat(60));
  console.log(`  Total artikel PUBLISHED: ${publishedArticles}`);
  console.log(`  Founder articles PUBLISHED: ${founderPublished.length}/${founderArticles}`);
  console.log(`  Tampil di /artikel (saat ini): ${Math.min(publishedArticles, 12)}`);
  console.log(`  Tersembunyi: ${Math.max(0, publishedArticles - 12)}`);
  console.log(`  Video DUMMY: ${dummyVideos.length}`);
  console.log(`  Karya DUMMY: ${dummyKarya.length}`);
  console.log(`  Purchase guards: ${guardsPublished && guardsSelfBuy ? "✅ OK" : "❌ Perlu perbaikan"}`);
  console.log("=".repeat(60));

  await db.$disconnect();
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});
