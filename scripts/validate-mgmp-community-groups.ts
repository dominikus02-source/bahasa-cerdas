/**
 * Validate MGMP Community Groups JSON
 */
const groups = require("../data/community-groups/mgmp-groups.json");

const VALID_PROVINCES = [
  "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau",
  "Jambi", "Bengkulu", "Sumatera Selatan", "Kepulauan Bangka Belitung", "Lampung",
  "Banten", "DKI Jakarta", "Jawa Barat", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur",
  "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur",
  "Kalimantan Barat", "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara",
  "Sulawesi Utara", "Gorontalo", "Sulawesi Tengah", "Sulawesi Barat", "Sulawesi Selatan", "Sulawesi Tenggara",
  "Maluku", "Maluku Utara",
  "Papua", "Papua Barat", "Papua Tengah", "Papua Pegunungan", "Papua Selatan", "Papua Barat Daya",
];

function main() {
  console.log("=== VALIDATE MGMP COMMUNITY GROUPS ===\n");
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file exists
  if (!groups || !Array.isArray(groups)) {
    console.error("ERROR: File not found or invalid JSON");
    process.exit(1);
  }

  // Check minimum count
  if (groups.length < 50) {
    errors.push(`Total groups ${groups.length} is less than 50`);
  }

  const slugs = new Set<string>();
  const names = new Set<string>();
  const personalPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(\+62|08)\d{7,}|\b(no\.? )?(hp\.?|telp\.?|phone|handphone)\b|\b08[0-9 -]{7,}\b/i;

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const idx = i + 1;

    // Slug unique
    if (slugs.has(g.slug)) {
      errors.push(`[${idx}] Duplicate slug: ${g.slug}`);
    }
    slugs.add(g.slug);

    // Name unique
    if (names.has(g.name)) {
      errors.push(`[${idx}] Duplicate name: ${g.name}`);
    }
    names.add(g.name);

    // Name not empty
    if (!g.name || !g.name.trim()) {
      errors.push(`[${idx}] Empty name`);
    }

    // Description not empty
    if (!g.description || !g.description.trim()) {
      errors.push(`[${idx}] Empty description`);
    }

    // No fake official claim
    if (g.description && /resmi\s+pemerintah|official\s+government/i.test(g.description)) {
      if (!g.isVerified) {
        errors.push(`[${idx}] Claims 'resmi pemerintah' but isVerified is false: ${g.name}`);
      }
    }

    // Seeded groups must not be verified
    if (g.isVerified) {
      errors.push(`[${idx}] Seeded group must be isVerified false: ${g.name}`);
    }

    // All must be isPublic
    if (!g.isPublic) {
      errors.push(`[${idx}] Seeded group must be isPublic true: ${g.name}`);
    }

    // All must be APPROVED
    if (g.status !== "APPROVED") {
      errors.push(`[${idx}] Seeded group must be status APPROVED: ${g.name}`);
    }

    // Province validation
    if (g.province) {
      if (g.region === "Provinsi" && !VALID_PROVINCES.includes(g.province)) {
        errors.push(`[${idx}] Invalid province name: ${g.province}`);
      }
    }

    // No personal data
    if (g.description && personalPattern.test(g.description)) {
      errors.push(`[${idx}] Contains personal data (email/phone): ${g.name}`);
    }

    // Bahasa Indonesia check
    if (g.description) {
      const englishWords = ["welcome", "hello", "hi ", "practice session", "test your", "you can", "we provide", "learn more", "click here"];
      for (const w of englishWords) {
        if (g.description.toLowerCase().includes(w)) {
          warnings.push(`[${idx}] Possible English text in description: "${w}" in ${g.name}`);
        }
      }
    }
  }

  console.log(`Total groups: ${groups.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}\n`);

  if (errors.length > 0) {
    console.log("ERRORS:");
    errors.forEach((e) => console.log(`  ❌ ${e}`));
  }
  if (warnings.length > 0) {
    console.log("WARNINGS:");
    warnings.forEach((w) => console.log(`  ⚠️ ${w}`));
  }

  if (errors.length > 0) {
    console.log("\n❌ VALIDATION FAILED");
    process.exit(1);
  } else {
    console.log("✅ VALIDATION PASSED");
  }
}

main();
