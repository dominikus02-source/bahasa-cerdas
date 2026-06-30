/**
 * Validate Founder Articles JSON + DB
 */
const articles = require("../data/articles/founder-archive-2026-05-06.json");

const FOUNDER_MAP: Record<string, string> = {
  "hdsastra47@gmail.com": "Washadi",
  "alexsurya1968@gmail.com": "Alexander Suryanta",
  "dominikus.02@gmail.com": "Dominikus Wahyu",
};

function main() {
  console.log("=== VALIDATE FOUNDER ARTICLES ===\n");
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!articles || !Array.isArray(articles)) {
    console.error("ERROR: File not found or invalid JSON");
    process.exit(1);
  }

  // 1. Total 30
  if (articles.length !== 30) {
    errors.push(`Total articles ${articles.length}, expected 30`);
  }

  const slugs = new Set<string>();
  const dates = new Set<string>();
  const authorCounts: Record<string, number> = {};

  for (let i = 0; i < articles.length; i++) {
    const a = articles[i];
    const idx = i + 1;

    // 2. Slug unique
    if (slugs.has(a.slug)) {
      errors.push(`[${idx}] Duplicate slug: ${a.slug}`);
    }
    slugs.add(a.slug);

    // 3. publishedAt unique
    const dateKey = a.publishedAt?.slice(0, 10);
    if (dates.has(dateKey)) {
      errors.push(`[${idx}] Duplicate date: ${dateKey}`);
    }
    dates.add(dateKey);

    // 4. Author email valid
    if (!FOUNDER_MAP[a.authorEmail]) {
      errors.push(`[${idx}] Invalid author email: ${a.authorEmail}`);
    }
    authorCounts[a.authorEmail] = (authorCounts[a.authorEmail] || 0) + 1;

    // 5. Title not empty
    if (!a.title || !a.title.trim()) {
      errors.push(`[${idx}] Empty title`);
    }

    // 6. Excerpt not empty
    if (!a.excerpt || !a.excerpt.trim()) {
      errors.push(`[${idx}] Empty excerpt`);
    }

    // 7. Content min 700 chars
    if (!a.content || a.content.length < 700) {
      errors.push(`[${idx}] Content too short (${a.content?.length || 0} chars, min 700)`);
    }

    // 8. No placeholder
    const placeholders = ["lorem ipsum", "todo", "tbd", "coming soon", "placeholder", "belum diisi", "isi sendiri"];
    for (const p of placeholders) {
      if (a.content?.toLowerCase().includes(p)) {
        errors.push(`[${idx}] Contains placeholder "${p}": ${a.slug}`);
      }
    }

    // 9. UKBI/TKA articles have disclaimer
    const slugLower = a.slug.toLowerCase();
    const isUKBITKA = slugLower.includes("ukbi") || /\btka\b/.test(slugLower);
    if (isUKBITKA) {
      const hasDisclaimer = a.content?.includes("bukan sertifikat resmi");
      if (!hasDisclaimer) {
        errors.push(`[${idx}] UKBI/TKA article missing disclaimer: ${a.slug}`);
      }
    }

    // 10. No statistic claims without source
    const statsPattern = /\d+%|\d+\.\d+ (juta|ribu|orang|guru|siswa)/;
    if (statsPattern.test(a.content || "")) {
      warnings.push(`[${idx}] Possible unsourced statistic in: ${a.slug}`);
    }

    // 11. No official government claims
    if (a.content?.toLowerCase().includes("resmi pemerintah") && !a.content?.toLowerCase().includes("bukan")) {
      errors.push(`[${idx}] Claims 'resmi pemerintah' without disclaimer: ${a.slug}`);
    }

    // 12. Bahasa Indonesia check
    const englishWords = ["welcome", "hello", "you can", "we believe", "our mission", "click here", "learn more"];
    for (const w of englishWords) {
      if (a.content?.toLowerCase().includes(w)) {
        warnings.push(`[${idx}] Possible English text: "${w}" in ${a.slug}`);
      }
    }

    // 13. meta check - using excerpt as meta
    if (a.excerpt && a.excerpt.length > 250) {
      warnings.push(`[${idx}] Excerpt too long (${a.excerpt.length} chars): ${a.slug}`);
    }

    // 14. Status
    if (a.status !== "PUBLISHED") {
      errors.push(`[${idx}] Status must be PUBLISHED: ${a.slug}`);
    }

    // 15. Source
    if (a.source !== "FOUNDER_ARCHIVE") {
      errors.push(`[${idx}] Source must be FOUNDER_ARCHIVE: ${a.slug}`);
    }

    // 16. Tags exist
    if (!a.tags || !Array.isArray(a.tags) || a.tags.length === 0) {
      errors.push(`[${idx}] No tags: ${a.slug}`);
    }
  }

  // 17. Each founder has 10 articles
  for (const [email, name] of Object.entries(FOUNDER_MAP)) {
    const count = authorCounts[email] || 0;
    if (count !== 10) {
      errors.push(`${name} has ${count} articles, expected 10`);
    }
  }

  // 18. Date range
  const allDates = articles.map((a: any) => a.publishedAt?.slice(0, 10)).sort();
  if (allDates[0] !== "2026-05-24") {
    errors.push(`Earliest date is ${allDates[0]}, expected 2026-05-24`);
  }
  if (allDates[allDates.length - 1] !== "2026-06-30") {
    errors.push(`Latest date is ${allDates[allDates.length - 1]}, expected 2026-06-30`);
  }

  console.log(`Total articles: ${articles.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}\n`);

  if (errors.length > 0) {
    console.log("ERRORS:");
    errors.forEach((e) => console.log(`  ❌ ${e}`));
  }
  if (warnings.length > 0) {
    console.log("WARNINGS:");
    warnings.forEach((w) => console.log(`  ⚠️  ${w}`));
  }

  if (errors.length > 0) {
    console.log("\n❌ VALIDATION FAILED");
    process.exit(1);
  } else {
    console.log("✅ VALIDATION PASSED");
  }
}

main();
