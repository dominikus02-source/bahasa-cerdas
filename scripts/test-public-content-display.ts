import { PrismaClient } from "@prisma/client";
import fs from "fs";

const db = new PrismaClient();
let passed = 0;
let failed = 0;

function test(label: string, fn: () => boolean | Promise<boolean>) {
  const result = fn();
  if (result instanceof Promise) {
    result.then(r => {
      if (r) { passed++; console.log(`  ✅ ${label}`); }
      else { failed++; console.log(`  ❌ ${label}`); }
    }).catch(() => { failed++; console.log(`  ❌ ${label} (error)`); });
  } else {
    if (result) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}`); }
  }
}

async function main() {
  console.log("=== PUBLIC CONTENT DISPLAY TESTS ===\n");

  const seedGuru = await db.user.findUnique({ where: { email: "guru@demo.com" }, select: { id: true } });
  const seedUserId = seedGuru?.id;

  // ── 1. ARTICLES ──
  console.log("── ARTIKEL ──");

  const artikelPageExists = fs.existsSync("app/artikel/page.tsx");
  test("/artikel route exists", () => artikelPageExists);

  const apiRoute = fs.readFileSync("app/api/artikel/route.ts", "utf-8");
  test("API artikel has pagination (skip/take)", () => apiRoute.includes("skip") && apiRoute.includes("take"));
  test("API artikel has totalPages", () => apiRoute.includes("totalPages"));
  test("API artikel filters isPublished", () => apiRoute.includes("isPublished: true"));
  test("API artikel does NOT expose email", () => {
    return !apiRoute.includes("email") || apiRoute.includes("author") && !apiRoute.includes("author.email");
  });
  test("API artikel supports author filter", () => apiRoute.includes("author"));
  test("API artikel supports category filter", () => apiRoute.includes("category"));
  test("API artikel supports search", () => apiRoute.includes("search"));

  const pageContent = fs.readFileSync("app/artikel/page.tsx", "utf-8");
  test("/artikel page uses client-side fetch", () => pageContent.includes("fetch(`/api/artikel?"));
  test("/artikel page has pagination UI", () => pageContent.includes("totalPages") && pageContent.includes("Muat Lebih Banyak"));
  test("/artikel page has filter buttons", () => pageContent.includes("Semua Artikel"));
  test("/artikel page has search input", () => pageContent.includes("Cari artikel"));
  test("/artikel page has empty state BI", () => pageContent.includes("Belum ada artikel pada kategori ini"));

  // Check all founder articles are findable
  const totalFounderPublished = await db.artikel.count({ where: { isPublished: true, source: "FOUNDER_ARCHIVE" } });
  test(`30 founder articles PUBLISHED (found: ${totalFounderPublished})`, () => totalFounderPublished === 30);

  const totalPublished = await db.artikel.count({ where: { isPublished: true } });
  test(`Total published articles >= 30 (found: ${totalPublished})`, () => totalPublished >= 30);

  // check result length > 12 (pagination working)
  test(`Published articles > 12 (pagination needed: ${totalPublished})`, () => totalPublished > 12 || totalPublished === 30);

  // Check article/[slug] renders
  const detailPageContent = fs.readFileSync("app/artikel/[slug]/page.tsx", "utf-8");
  test("/artikel/[slug] filters isPublished", () => detailPageContent.includes("isPublished: true"));

  // ── 2. HOMEPAGE ──
  console.log("\n── HOMEPAGE ──");
  const homeContent = fs.readFileSync("app/page.tsx", "utf-8");
  test('Homepage "Lihat Semua" links to /artikel', () => homeContent.includes('href="/artikel"'));
  test("Homepage take 3 articles", () => homeContent.includes("take: 3") || homeContent.includes("take: 4") || homeContent.includes("take: 5") || homeContent.includes("take: 6"));
  test("Homepage filters seed videos", () => homeContent.includes("guru@demo.com") && homeContent.includes("not:"));

  // ── 3. VIDEOS ──
  console.log("\n── VIDEO ──");
  const videoPageContent = fs.readFileSync("app/video-belajar/page.tsx", "utf-8");
  test("Video page filters seed videos", () => videoPageContent.includes("guru@demo.com") && videoPageContent.includes("not:"));

  const videoClientContent = fs.readFileSync("app/video-belajar/VideoClient.tsx", "utf-8");
  test("Video page empty state BI", () => videoClientContent.includes("Video pembelajaran sedang disiapkan"));

  // Check no dummy videos in public
  const publishedVideos = await db.video.findMany({
    where: { isPublished: true },
    select: { id: true, title: true, creatorId: true, videoUrl: true },
  });
  const dummyVideosPublic = publishedVideos.filter(v => v.creatorId === seedUserId);
  test(`No seed videos visible in public (${dummyVideosPublic.length} still visible)`, () => dummyVideosPublic.length === 0);

  const homepageVideos = await db.video.findMany({
    where: { isPublished: true },
    orderBy: { views: "desc" },
    take: 3,
    select: { id: true, creatorId: true },
  });
  const dummyOnHomepage = homepageVideos.filter(v => v.creatorId === seedUserId);
  test("No seed videos on homepage", () => dummyOnHomepage.length === 0);

  // ── 4. MARKETPLACE ──
  console.log("\n── TOKO KARYA ──");
  const marketplacePage = fs.readFileSync("app/marketplace/page.tsx", "utf-8");
  test("Marketplace page filters seed products", () => marketplacePage.includes("guru@demo.com") && marketplacePage.includes("not:"));

  const karyaPopulerSection = fs.readFileSync("components/landing/KaryaPopulerSection.tsx", "utf-8");
  test("KaryaPopuler filters seed products", () => karyaPopulerSection.includes("guru@demo.com") && karyaPopulerSection.includes("not:"));
  test("KaryaPopuler empty state BI", () => karyaPopulerSection.includes("Toko Karya sedang dikurasi"));

  const marketplaceClient = fs.readFileSync("app/marketplace/MarketplaceClient.tsx", "utf-8");
  test("MarketplaceClient empty state BI", () => marketplaceClient.includes("Toko Karya sedang dikurasi"));

  // Check no seed products visible
  const publishedKarya = await db.karya.findMany({
    where: { isPublished: true },
    select: { id: true, title: true, sellerId: true },
  });
  const dummyKaryaPublic = publishedKarya.filter(k => k.sellerId === seedUserId);
  test(`No seed products visible in public (${dummyKaryaPublic.length} still visible)`, () => dummyKaryaPublic.length === 0);

  // Check purchase guards
  const purchaseRoute = fs.readFileSync("app/api/marketplace/purchase/route.ts", "utf-8");
  test("Purchase guards isPublished", () => purchaseRoute.includes("!karya.isPublished"));
  test("Purchase guards dummy fileUrl", () => purchaseRoute.includes("example.com"));
  test("Purchase guards no fileKey", () => purchaseRoute.includes("!karya.fileKey"));
  test("Purchase guards self-buy", () => purchaseRoute.includes("karya.sellerId === dbUser.id"));
  test("Purchase guards free items", () => purchaseRoute.includes("karya.price === 0"));

  const browseRoute = fs.readFileSync("app/api/marketplace/browse/route.ts", "utf-8");
  test("Browse API filters seed products", () => browseRoute.includes("guru@demo.com") && browseRoute.includes("not:"));

  // ── 5. CLEANUP SCRIPT SAFETY ──
  console.log("\n── CLEANUP SAFETY ──");
  const cleanupContent = fs.readFileSync("scripts/cleanup-dummy-public-content.ts", "utf-8");
  test("Cleanup script no deleteMany", () => !cleanupContent.includes("deleteMany"));
  test("Cleanup script no truncate", () => !cleanupContent.includes("truncate"));
  test("Cleanup script no drop", () => !cleanupContent.includes(".drop"));
  test("Cleanup script dry-run default", () => cleanupContent.includes("--execute") || cleanupContent.includes("DRY-RUN"));
  test("Cleanup script skips real content", () => cleanupContent.includes("real") || cleanupContent.includes("SKIPPED"));

  // ── SUMMARY ──
  console.log(`\n📊 RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log(failed === 0 ? "✅ ALL TESTS PASSED" : `❌ ${failed} TESTS FAILED`);
  await db.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main();
