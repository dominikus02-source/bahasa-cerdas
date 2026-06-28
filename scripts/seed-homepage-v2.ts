/**
 * Seed script v2 for BahasaCerdas homepage content (Artikel, Video, Karya).
 *
 * Features:
 * - Deterministic (reads from prisma/seed-data/homepage-content.json)
 * - Dry-run mode: `npx tsx scripts/seed-homepage-v2.ts --dry-run`
 * - Validation: slug uniqueness, title/excerpt/date/category validation
 * - Repeatable: upserts by slug (Artikel), title (Video/Karya)
 * - Safe for local/dev. Production: dry-run only unless confirmed.
 *
 * Usage:
 *   npx tsx scripts/seed-homepage-v2.ts            # seeds local/dev DB
 *   npx tsx scripts/seed-homepage-v2.ts --dry-run  # validate without writing
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const db = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

// Single editorial user for all seed content
// This is the BahasaCerdas demo guru account — used solely as content author
const EDITOR_USER_EMAIL = "guru@demo.com";

interface ArtikelSeed {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  tags: string[];
  readCount: number;
  publishedAt: string;
}

interface VideoSeed {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  duration: number;
  source: string;
  category: string;
  grade: string | null;
  tags: string[];
  views: number;
  publishedAt: string;
}

interface KaryaSeed {
  title: string;
  description: string;
  type: string;
  grade: string | null;
  subject: string | null;
  price: number;
  downloads: number;
  fileUrl: string;
  fileType: string;
  publishedAt: string;
}

interface SeedData {
  meta: { version: string; totalItems: number };
  artikel: ArtikelSeed[];
  video: VideoSeed[];
  karya: KaryaSeed[];
}

const VALID_VIDEO_CATEGORIES = [
  "PEMBELAJARAN", "GRAMMATIKA", "SASTRA", "WRITING",
  "SPEAKING", "READING", "MEDIA", "UKBI_PREP", "LAINNYA",
];

const VALID_KARYA_TYPES = [
  "RPP", "MODUL", "PPT", "SOAL", "VIDEO", "EBOOK", "ADMINISTRASI", "LAINNYA",
];

const VALID_FILE_TYPES = ["PDF", "DOCX", "PPTX", "XLSX", "MP4", "ZIP"];

function loadSeedData(): SeedData {
  const filePath = path.join(__dirname, "..", "prisma", "seed-data", "homepage-content.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function validateArtikel(items: ArtikelSeed[]): string[] {
  const errors: string[] = [];
  const slugs = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const a = items[i];
    const idx = `artikel[${i}]`;

    if (!a.title?.trim()) errors.push(`${idx}: title is required`);
    if (!a.slug?.trim()) errors.push(`${idx}: slug is required`);
    else if (slugs.has(a.slug)) errors.push(`${idx}: duplicate slug "${a.slug}"`);
    else slugs.add(a.slug);
    if (!a.excerpt?.trim()) errors.push(`${idx}: excerpt is required`);
    if (!a.content?.trim()) errors.push(`${idx}: content is required`);
    if (!a.publishedAt || isNaN(Date.parse(a.publishedAt))) {
      errors.push(`${idx}: invalid publishedAt "${a.publishedAt}"`);
    }
    if (!Array.isArray(a.tags)) errors.push(`${idx}: tags must be an array`);
    if (typeof a.readCount !== "number" || a.readCount < 0) {
      errors.push(`${idx}: readCount must be a non-negative number`);
    }
  }

  return errors;
}

function validateVideo(items: VideoSeed[]): string[] {
  const errors: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const v = items[i];
    const idx = `video[${i}]`;

    if (!v.title?.trim()) errors.push(`${idx}: title is required`);
    if (!v.description?.trim()) errors.push(`${idx}: description is required`);
    if (!v.videoUrl?.trim()) errors.push(`${idx}: videoUrl is required`);
    if (!VALID_VIDEO_CATEGORIES.includes(v.category)) {
      errors.push(`${idx}: invalid category "${v.category}"`);
    }
    if (typeof v.duration !== "number" || v.duration <= 0) {
      errors.push(`${idx}: duration must be a positive number`);
    }
    if (!["YOUTUBE", "VIMEO", "UPLOAD"].includes(v.source)) {
      errors.push(`${idx}: invalid source "${v.source}"`);
    }
    if (!v.publishedAt || isNaN(Date.parse(v.publishedAt))) {
      errors.push(`${idx}: invalid publishedAt`);
    }
    if (typeof v.views !== "number" || v.views < 0) {
      errors.push(`${idx}: views must be a non-negative number`);
    }
  }

  return errors;
}

function validateKarya(items: KaryaSeed[]): string[] {
  const errors: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const k = items[i];
    const idx = `karya[${i}]`;

    if (!k.title?.trim()) errors.push(`${idx}: title is required`);
    if (!k.description?.trim()) errors.push(`${idx}: description is required`);
    if (!VALID_KARYA_TYPES.includes(k.type)) {
      errors.push(`${idx}: invalid type "${k.type}"`);
    }
    if (typeof k.price !== "number" || k.price < 0) {
      errors.push(`${idx}: price must be a non-negative number`);
    }
    if (typeof k.downloads !== "number" || k.downloads < 0) {
      errors.push(`${idx}: downloads must be a non-negative number`);
    }
    if (!k.fileUrl?.trim()) errors.push(`${idx}: fileUrl is required`);
    if (k.fileType && !VALID_FILE_TYPES.includes(k.fileType)) {
      errors.push(`${idx}: invalid fileType "${k.fileType}" — should be one of ${VALID_FILE_TYPES.join(", ")}`);
    }
    if (!k.publishedAt || isNaN(Date.parse(k.publishedAt))) {
      errors.push(`${idx}: invalid publishedAt`);
    }
  }

  return errors;
}

async function findEditorUser() {
  const user = await db.user.findFirst({ where: { email: EDITOR_USER_EMAIL } });
  if (!user) throw new Error(`Editor user not found: ${EDITOR_USER_EMAIL}. Run user seed first.`);
  return user;
}

async function seedArtikel(items: ArtikelSeed[], editorId: string) {
  let created = 0;
  let updated = 0;

  for (const a of items) {
    const existing = await db.artikel.findUnique({ where: { slug: a.slug } });

    if (existing) {
      if (!DRY_RUN) {
        await db.artikel.update({
          where: { slug: a.slug },
          data: {
            title: a.title,
            excerpt: a.excerpt,
            content: a.content,
            coverImage: a.coverImage,
            tags: a.tags,
            readCount: a.readCount,
            createdAt: new Date(a.publishedAt),
            isPublished: true,
            authorId: editorId,
          },
        });
      }
      updated++;
    } else {
      if (!DRY_RUN) {
        await db.artikel.create({
          data: {
            title: a.title,
            slug: a.slug,
            excerpt: a.excerpt,
            content: a.content,
            coverImage: a.coverImage,
            tags: a.tags,
            readCount: a.readCount,
            createdAt: new Date(a.publishedAt),
            isPublished: true,
            authorId: editorId,
          },
        });
      }
      created++;
    }
  }

  return { created, updated };
}

async function seedVideo(items: VideoSeed[], editorId: string) {
  let created = 0;
  let updated = 0;

  // Use title as dedup key (no unique slug on Video)
  for (const v of items) {
    const existing = await db.video.findFirst({ where: { title: v.title } });

    if (existing) {
      if (!DRY_RUN) {
        await db.video.update({
          where: { id: existing.id },
          data: {
            description: v.description,
            videoUrl: v.videoUrl,
            thumbnailUrl: v.thumbnailUrl,
            duration: v.duration,
            source: v.source as any,
            category: v.category as any,
            grade: v.grade,
            tags: v.tags,
            views: v.views,
            createdAt: new Date(v.publishedAt),
            isPublished: true,
            creatorId: editorId,
          },
        });
      }
      updated++;
    } else {
      if (!DRY_RUN) {
        await db.video.create({
          data: {
            title: v.title,
            description: v.description,
            videoUrl: v.videoUrl,
            thumbnailUrl: v.thumbnailUrl,
            duration: v.duration,
            source: v.source as any,
            category: v.category as any,
            grade: v.grade,
            tags: v.tags,
            views: v.views,
            createdAt: new Date(v.publishedAt),
            isPublished: true,
            creatorId: editorId,
          },
        });
      }
      created++;
    }
  }

  return { created, updated };
}

async function seedKarya(items: KaryaSeed[], editorId: string) {
  let created = 0;
  let updated = 0;

  for (const k of items) {
    const existing = await db.karya.findFirst({ where: { title: k.title, sellerId: editorId } });

    if (existing) {
      if (!DRY_RUN) {
        await db.karya.update({
          where: { id: existing.id },
          data: {
            description: k.description,
            type: k.type as any,
            grade: k.grade,
            subject: k.subject,
            price: k.price,
            downloads: k.downloads,
            fileUrl: k.fileUrl,
            fileType: k.fileType as any,
            createdAt: new Date(k.publishedAt),
            isPublished: true,
          },
        });
      }
      updated++;
    } else {
      if (!DRY_RUN) {
        await db.karya.create({
          data: {
            title: k.title,
            description: k.description,
            type: k.type as any,
            grade: k.grade,
            subject: k.subject,
            price: k.price,
            downloads: k.downloads,
            fileUrl: k.fileUrl,
            fileType: k.fileType as any,
            createdAt: new Date(k.publishedAt),
            isPublished: true,
            sellerId: editorId,
          },
        });
      }
      created++;
    }
  }

  return { created, updated };
}

async function main() {
  console.log("╔════════════════════════════════════════════╗");
  console.log("║  BahasaCerdas Homepage Seed v2            ║");
  console.log(DRY_RUN
    ? "║  MODE: DRY-RUN (no writes)                    ║"
    : "║  MODE: LIVE (will write to DB)                ║");
  console.log("╚════════════════════════════════════════════╝\n");

  // Load
  const data = loadSeedData();
  console.log(`Loaded seed data v${data.meta.version} — ${data.meta.totalItems} total items\n`);

  // Validate
  const errs: string[] = [
    ...validateArtikel(data.artikel),
    ...validateVideo(data.video),
    ...validateKarya(data.karya),
  ];

  if (errs.length > 0) {
    console.error("❌ Validation errors:");
    for (const e of errs) console.error(`   ${e}`);
    process.exit(1);
  }
  console.log("✓ Validation passed\n");

  // Find editor user
  let editor = null;
  try {
    editor = await findEditorUser();
    console.log(`✓ Editor user: ${editor.email} (${editor.fullName})\n`);
  } catch (e: any) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }

  // Count existing
  const existingCounts = !DRY_RUN ? {
    artikel: await db.artikel.count(),
    video: await db.video.count(),
    karya: await db.karya.count(),
  } : { artikel: 0, video: 0, karya: 0 };

  if (!DRY_RUN) {
    console.log(`Existing DB: ${existingCounts.artikel} artikel, ${existingCounts.video} video, ${existingCounts.karya} karya\n`);
  }

  // Seed Artikel
  console.log("📄 Artikel:");
  const aResult = await seedArtikel(data.artikel, editor.id);
  console.log(`   ${aResult.created} created, ${aResult.updated} updated${DRY_RUN ? " (simulated)" : ""}`);

  // Seed Video
  console.log("\n🎬 Video:");
  const vResult = await seedVideo(data.video, editor.id);
  console.log(`   ${vResult.created} created, ${vResult.updated} updated${DRY_RUN ? " (simulated)" : ""}`);

  // Seed Karya
  console.log("\n🏪 Karya:");
  const kResult = await seedKarya(data.karya, editor.id);
  console.log(`   ${kResult.created} created, ${kResult.updated} updated${DRY_RUN ? " (simulated)" : ""}`);

  // Summary
  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║  SUMMARY                                  ║");
  console.log("╠════════════════════════════════════════════╣");
  console.log(`║  Artikel : ${data.artikel.length.toString().padStart(2)} items  (${aResult.created} new, ${aResult.updated} updated)  ║`);
  console.log(`║  Video   : ${data.video.length.toString().padStart(2)} items  (${vResult.created} new, ${vResult.updated} updated)  ║`);
  console.log(`║  Karya   : ${data.karya.length.toString().padStart(2)} items  (${kResult.created} new, ${kResult.updated} updated)  ║`);
  console.log(`║  Total   : ${(data.artikel.length + data.video.length + data.karya.length).toString().padStart(2)} items                        ║`);
  console.log("╚════════════════════════════════════════════╝");

  if (DRY_RUN) {
    console.log("\n⚠  Dry-run complete. No data was written.");
    console.log("   Run without --dry-run to seed the database.");
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error("\n❌ Seed failed:", e);
  db.$disconnect();
  process.exit(1);
});
