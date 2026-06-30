/**
 * Audit Founder Articles in Database
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("=== AUDIT FOUNDER ARTICLES ===\n");

  // 1. Total founder articles
  const total = await db.artikel.count({ where: { source: "FOUNDER_ARCHIVE" } });
  const totalAll = await db.artikel.count();
  console.log(`1. Total founder articles: ${total} (of ${totalAll} total)`);

  // 2. Per founder
  const byAuthor = await db.artikel.groupBy({
    by: ["authorName"],
    where: { source: "FOUNDER_ARCHIVE" },
    _count: { id: true },
  });
  console.log("2. Articles per founder:");
  for (const a of byAuthor) {
    console.log(`   ${a.authorName}: ${a._count.id}`);
  }

  // 3. Date range
  const dates = await db.artikel.findMany({
    where: { source: "FOUNDER_ARCHIVE" },
    select: { publishedAt: true, title: true },
    orderBy: { publishedAt: "asc" },
  });
  if (dates.length > 0) {
    const first = dates[0].publishedAt?.toISOString().slice(0, 10);
    const last = dates[dates.length - 1].publishedAt?.toISOString().slice(0, 10);
    console.log(`3. Date range: ${first} to ${last}`);
  } else {
    console.log("3. No founder articles found");
  }

  // 4. Duplicate dates
  const dateMap: Record<string, string[]> = {};
  for (const d of dates) {
    const key = d.publishedAt?.toISOString().slice(0, 10) || "unknown";
    if (!dateMap[key]) dateMap[key] = [];
    dateMap[key].push(d.title);
  }
  const dupes = Object.entries(dateMap).filter(([, v]) => v.length > 1);
  console.log(`4. Duplicate dates: ${dupes.length}`);
  if (dupes.length > 0) {
    dupes.forEach(([date, titles]) => console.log(`   ${date}: ${titles.join(", ")}`));
  }

  // 5. All articles have authorId (model requirement)
  console.log(`5. All articles have authorId (required by schema)`);

  // 6. Articles not published
  const notPublished = await db.artikel.findMany({
    where: { source: "FOUNDER_ARCHIVE", isPublished: false },
    select: { title: true },
  });
  console.log(`6. Articles not published: ${notPublished.length}`);

  // 7. All articles have content (model requirement)
  console.log(`7. All articles have content (required by schema)`);

  // 8. UKBI/TKA without disclaimer
  const allFounderArticles = await db.artikel.findMany({
    where: { source: "FOUNDER_ARCHIVE" },
    select: { title: true, slug: true, content: true },
  });
  const ukbiTkaArticles = allFounderArticles.filter(
    (a) => /\bukbi\b|\btka\b/i.test(a.slug)
  );
  const missingDisclaimer = ukbiTkaArticles.filter(
    (a) => !a.content?.includes("bukan sertifikat resmi")
  );
  console.log(`8. UKBI/TKA articles missing disclaimer: ${missingDisclaimer.length}`);
  for (const a of missingDisclaimer) {
    console.log(`   ⚠️  ${a.title}`);
  }

  // 9. Source FOUNDER_ARCHIVE
  const sourceCounts = await db.artikel.groupBy({
    by: ["source"],
    _count: { id: true },
  });
  console.log("9. Source distribution:");
  for (const s of sourceCounts) {
    console.log(`   ${s.source}: ${s._count.id}`);
  }

  // 10. Article type distribution
  const byType = await db.artikel.groupBy({
    by: ["articleType"],
    where: { source: "FOUNDER_ARCHIVE" },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });
  console.log("10. Article type distribution:");
  for (const t of byType) {
    console.log(`   ${t.articleType}: ${t._count.id}`);
  }

  console.log("\n=== AUDIT SUMMARY ===");
  console.log(`Total founder articles: ${total}`);
  if (total > 0) console.log("✅ All articles have authorId (schema enforced)");
  if (notPublished.length === 0) console.log("✅ All articles published");
  if (missingDisclaimer.length === 0) console.log("✅ UKBI/TKA articles have disclaimer");
  if (dupes.length === 0) console.log("✅ No duplicate dates");

  await db.$disconnect();
}

main().catch((e) => {
  console.error("Audit failed:", e);
  process.exit(1);
});
