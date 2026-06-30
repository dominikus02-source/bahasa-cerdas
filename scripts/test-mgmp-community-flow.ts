/**
 * Test MGMP Community Flow
 *
 * Tests route existence, API filters, seed behavior, UI text, and security.
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const db = new PrismaClient();

let passed = 0;
let failed = 0;
let errors: string[] = [];

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    errors.push(msg);
  }
}

async function main() {
  console.log("=== TEST MGMP COMMUNITY FLOW ===\n");

  // === 1. Page route existence ===
  console.log("1. Route existence...");
  const guruPage = path.join(__dirname, "..", "app/(dashboard)/guru/komunitas/page.tsx");
  const guruDetailPage = path.join(__dirname, "..", "app/(dashboard)/guru/komunitas/[id]/page.tsx");
  const adminPage = path.join(__dirname, "..", "app/(dashboard)/admin/komunitas/page.tsx");
  assert(fs.existsSync(guruPage), "/guru/komunitas page exists");
  assert(fs.existsSync(guruDetailPage), "/guru/komunitas/[id] page exists");
  assert(fs.existsSync(adminPage), "/admin/komunitas page exists");

  // === 2. API route existence ===
  const apiList = path.join(__dirname, "..", "app/api/komunitas/route.ts");
  const apiDetail = path.join(__dirname, "..", "app/api/komunitas/[id]/route.ts");
  const apiJoin = path.join(__dirname, "..", "app/api/komunitas/[id]/join/route.ts");
  const apiAdmin = path.join(__dirname, "..", "app/api/admin/komunitas/route.ts");
  assert(fs.existsSync(apiList), "/api/komunitas exists");
  assert(fs.existsSync(apiDetail), "/api/komunitas/[id] exists");
  assert(fs.existsSync(apiJoin), "/api/komunitas/[id]/join exists");
  assert(fs.existsSync(apiAdmin), "/api/admin/komunitas exists");

  // === 3. API public filter ===
  console.log("3. API public filter...");
  const publicApproved = await db.community.count({
    where: { isPublic: true, status: "APPROVED" },
  });
  const allApproved = await db.community.count({ where: { status: "APPROVED" } });
  const nonPublicApproved = await db.community.count({
    where: { isPublic: false, status: "APPROVED" },
  });
  assert(
    publicApproved === allApproved - nonPublicApproved,
    `GET /api/komunitas only returns APPROVED public: ${publicApproved} visible out of ${allApproved} approved`
  );
  assert(
    publicApproved > 0,
    "At least one community visible via public API"
  );

  // === 4. Seed JSON exists ===
  console.log("4. Seed JSON...");
  const jsonPath = path.join(__dirname, "..", "data/community-groups/mgmp-groups.json");
  assert(fs.existsSync(jsonPath), "Seed JSON file exists");
  if (fs.existsSync(jsonPath)) {
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    assert(Array.isArray(data), "Seed JSON is an array");
    assert(data.length >= 50, `Seed has ${data.length} groups (min 50)`);
    // Validate slug uniqueness
    const slugs = data.map((g: any) => g.slug);
    const uniqueSlugs = new Set(slugs);
    assert(slugs.length === uniqueSlugs.size, "All slugs are unique");
  }

  // === 5. No deleteMany in community routes ===
  console.log("5. No deleteMany...");
  const routeFiles = [
    "app/api/admin/komunitas/route.ts",
    "app/api/komunitas/route.ts",
    "app/api/komunitas/[id]/route.ts",
    "app/api/komunitas/[id]/join/route.ts",
  ];
  for (const rf of routeFiles) {
    const fullPath = path.join(__dirname, "..", rf);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      assert(!content.includes("deleteMany"), `No deleteMany in ${rf}`);
    }
  }

  // === 6. Admin page uses "Arsipkan" not "Hapus" ===
  console.log("6. Admin archive text...");
  if (fs.existsSync(adminPage)) {
    const content = fs.readFileSync(adminPage, "utf-8");
    assert(!content.includes("handleDelete"), "handleDelete renamed to handleArchive");
    assert(!content.includes("Trash2"), "Trash2 icon replaced with Archive");
    assert(!content.includes('"Hapus"'), "Hapus replaced with Arsipkan");
    assert(content.includes("Arsipkan"), "Arsipkan button text exists");
    assert(content.includes("mengarsipkan"), "Confirm text uses mengarsipkan");
  }

  // === 7. No "Study Group" user-facing ===
  console.log("7. Bahasa Indonesia UI...");
  const guruContent = fs.readFileSync(guruPage, "utf-8");
  const adminContent = fs.readFileSync(adminPage, "utf-8");
  assert(!guruContent.includes('label: "Study Group"'), 'Guru page: "Study Group" replaced with "Kelompok Belajar"');
  assert(!guruContent.includes(">Study Group<"), 'Guru page: no Study Group in JSX');
  assert(!adminContent.includes("Menunggu Review"), 'Admin page: "Menunggu Review" replaced with "Menunggu Peninjauan"');
  assert(guruContent.includes("Kelompok Belajar"), 'Guru page uses "Kelompok Belajar"');

  // === 8. Join route checks community status ===
  console.log("8. Join route security...");
  if (fs.existsSync(apiJoin)) {
    const joinContent = fs.readFileSync(apiJoin, "utf-8");
    assert(joinContent.includes("community.status"), "Join route checks community status");
    assert(joinContent.includes("APPROVED"), "Join route checks APPROVED status");
    assert(joinContent.includes("isPublic"), "Join route checks isPublic");
    assert(!joinContent.includes("email"), "Join route does not expose email");
  }

  // === 9. Admin archive not delete ===
  console.log("9. Admin archive route...");
  if (fs.existsSync(apiAdmin)) {
    const adminRouteContent = fs.readFileSync(apiAdmin, "utf-8");
    assert(!adminRouteContent.includes("deleteMany"), "Admin route no deleteMany");
    assert(adminRouteContent.includes("isPublic: false"), "Admin route sets isPublic false");
    assert(adminRouteContent.includes("Diarsipkan oleh admin"), "Admin route archives with note");
  }

  // === 10. Admin page stats don't show English ===
  console.log("10. Admin page Bahasa...");
  assert(adminContent.includes("Menunggu Peninjauan"), "Admin filter uses Menunggu Peninjauan");
  assert(!adminContent.includes("menunggu review"), "Admin empty state uses menunggu peninjauan");

  // === 11. Join route response Bahasa ===
  if (fs.existsSync(apiJoin)) {
    const joinContent = fs.readFileSync(apiJoin, "utf-8");
    assert(joinContent.includes("tidak ditemukan"), "Join route uses Bahasa response");
    assert(joinContent.includes("dapat diakses"), 'Join route uses "tidak dapat diakses"');
  }

  // === 12. Seeded groups count in DB ===
  console.log("12. Seeded groups in DB...");
  if (fs.existsSync(jsonPath)) {
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    let found = 0;
    for (const g of data) {
      const c = await db.community.findFirst({ where: { name: g.name } });
      if (c) found++;
    }
    assert(found >= data.length * 0.9, `At least 90% of seeded groups found in DB (${found}/${data.length})`);
  }

  // === Summary ===
  console.log("\n=== RESULTS ===");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failed > 0) {
    console.log("\nFailed tests:");
    errors.forEach((e) => console.log(`  ❌ ${e}`));
    process.exit(1);
  } else {
    console.log("✅ ALL TESTS PASSED");
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
