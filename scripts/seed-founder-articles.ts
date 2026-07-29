/**
 * Seed Founder Articles
 *
 * Dry-run default. Execute with --execute.
 * Maps articles to founder user accounts by email.
 * Upsert-only by slug. No delete/truncate/drop.
 */

import { config } from "dotenv";
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

interface ArticleItem {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string[];
  authorEmail: string;
  authorName: string;
  authorRole: string;
  articleType: string;
  status: string;
  publishedAt: string;
  source: string;
  featured: boolean;
  coverImageUrl: string;
  coverImageAlt: string;
  coverImageCredit: string;
  coverImageSourceUrl: string;
  coverImageLicense: string;
  coverImageProvider: string;
}

const FOUNDER_EMAILS = [
  "hdsastra47@gmail.com",
  "alexsurya1968@gmail.com",
  "dominikus.02@gmail.com",
];

async function main() {
  const isExecute = process.argv.includes("--execute");
  const articlesV1: ArticleItem[] = require("../data/articles/founder-archive-2026-05-06.json");
  const articlesV2: ArticleItem[] = require("../data/articles/founder-archive-v2-2026-07.json");
  const articles = [...articlesV1, ...articlesV2];

  console.log("=== SEED FOUNDER ARTICLES ===\n");
  console.log(`Mode: ${isExecute ? "EXECUTE" : "DRY-RUN"}`);
  console.log(`Source articles: ${articles.length}\n`);

  // Find founder users
  const founderUsers = await db.user.findMany({
    where: { email: { in: FOUNDER_EMAILS } },
    select: { id: true, email: true, fullName: true },
  });

  const founderMap: Record<string, string> = {};
  for (const u of founderUsers) {
    founderMap[u.email] = u.id;
  }

  console.log("Founder accounts found:");
  for (const email of FOUNDER_EMAILS) {
    if (founderMap[email]) {
      console.log(`  ✅ ${email} → ID: ${founderMap[email].slice(0, 8)}...`);
    } else {
      console.log(`  ❌ ${email} → NOT FOUND`);
    }
  }

  const missingFounders = FOUNDER_EMAILS.filter((e) => !founderMap[e]);
  if (missingFounders.length > 0) {
    console.log(`\n⚠️  Missing founder accounts: ${missingFounders.join(", ")}`);
    console.log("Seed cannot proceed without ALL founder accounts.");
    console.log("Please ensure these users exist in the database first.");
    await db.$disconnect();
    process.exit(1);
  }
  console.log("");

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  let needsReview: string[] = [];

  for (const a of articles) {
    const authorId = founderMap[a.authorEmail];
    if (!authorId) {
      skipped++;
      needsReview.push(`${a.slug} — author not found: ${a.authorEmail}`);
      continue;
    }

    const existing = await db.artikel.findUnique({ where: { slug: a.slug } });

    if (existing) {
      // Skip if existing article was not created by FOUNDER_ARCHIVE source (unless --force)
      if (existing.source !== "FOUNDER_ARCHIVE" && !process.argv.includes("--force")) {
        skipped++;
        needsReview.push(`${a.slug} — existing article is not FOUNDER_ARCHIVE, skipping`);
        continue;
      }

      // Check if content is the same
      const same =
        existing.title === a.title &&
        existing.content === a.content &&
        existing.excerpt === a.excerpt &&
        existing.articleType === a.articleType &&
        existing.isPublished === (a.status === "PUBLISHED") &&
        existing.source === a.source &&
        existing.coverImage === a.coverImageUrl &&
        existing.coverImageAlt === a.coverImageAlt &&
        existing.coverImageCredit === a.coverImageCredit &&
        existing.coverImageSourceUrl === a.coverImageSourceUrl &&
        existing.coverImageLicense === a.coverImageLicense &&
        existing.coverImageProvider === a.coverImageProvider;

      if (same) {
        unchanged++;
        continue;
      }

      if (isExecute) {
        await db.artikel.update({
          where: { id: existing.id },
          data: {
            title: a.title,
            content: a.content,
            excerpt: a.excerpt,
            tags: a.tags,
            articleType: a.articleType,
            isPublished: a.status === "PUBLISHED",
            publishedAt: new Date(a.publishedAt),
            source: a.source,
            featured: a.featured,
            authorName: a.authorName,
            authorRole: a.authorRole,
            authorId,
            coverImage: a.coverImageUrl,
            coverImageUrl: a.coverImageUrl,
            coverImageAlt: a.coverImageAlt,
            coverImageCredit: a.coverImageCredit,
            coverImageSourceUrl: a.coverImageSourceUrl,
            coverImageLicense: a.coverImageLicense,
            coverImageProvider: a.coverImageProvider,
          },
        });
        updated++;
      } else {
        updated++;
      }
    } else {
      if (isExecute) {
        await db.artikel.create({
          data: {
            title: a.title,
            slug: a.slug,
            content: a.content,
            excerpt: a.excerpt,
            tags: a.tags,
            articleType: a.articleType,
            isPublished: a.status === "PUBLISHED",
            publishedAt: new Date(a.publishedAt),
            source: a.source,
            featured: a.featured,
            authorName: a.authorName,
            authorRole: a.authorRole,
            authorId,
            coverImage: a.coverImageUrl,
            coverImageUrl: a.coverImageUrl,
            coverImageAlt: a.coverImageAlt,
            coverImageCredit: a.coverImageCredit,
            coverImageSourceUrl: a.coverImageSourceUrl,
            coverImageLicense: a.coverImageLicense,
            coverImageProvider: a.coverImageProvider,
          },
        });
        inserted++;
      } else {
        inserted++;
      }
    }
  }

  console.log("=== SUMMARY ===");
  console.log(`  Total source:          ${articles.length}`);
  console.log(`  Inserted:              ${inserted}`);
  console.log(`  Updated:               ${updated}`);
  console.log(`  Unchanged:             ${unchanged}`);
  console.log(`  Skipped:               ${skipped}`);
  console.log(`  Needs review:          ${needsReview.length}`);
  if (needsReview.length > 0) {
    console.log("\n  Needs review details:");
    for (const r of needsReview) {
      console.log(`    - ${r}`);
    }
  }
  console.log(`\n  ${isExecute ? "Database seeded successfully." : "Dry-run complete. Use --execute to apply."}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
