/**
 * Admin Premium Report — QA Tests
 *
 * Tests:
 * 1. API route exists and has correct structure (auth, params, response)
 * 2. Admin UI page exists with required components
 * 3. Sidebar has Premium Report nav item
 * 4. Query parameter validation patterns
 * 5. No answer leakage / no fabricated data
 * 6. Correct Prisma model usage (User.isPremium + User.premiumUntil, NOT transaction status)
 *
 * Run: npx tsx scripts/test-admin-premium-report.ts
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  ${GREEN}✓${RESET} ${label}`);
  } else {
    failed++;
    const msg = `✗ ${label}`;
    errors.push(msg);
    console.log(`  ${RED}${msg}${RESET}`);
  }
}

function readFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf-8");
}

function assertContains(filePath: string, pattern: string, label: string) {
  const content = readFile(filePath);
  assert(content.includes(pattern), label);
}

function assertNotContains(filePath: string, pattern: string, label: string) {
  const content = readFile(filePath);
  assert(!content.includes(pattern), label);
}

async function main() {
  console.log(`\n${YELLOW}=== Admin Premium Report — QA Tests ===${RESET}\n`);

  // ── 1. API Route Existence & Structure ──
  console.log(`\n${YELLOW}--- 1. API Route Structure ---${RESET}`);
  const apiPath = "app/api/admin/premium/report/route.ts";
  assert(existsSync(join(process.cwd(), apiPath)), `API route exists: ${apiPath}`);

  // Auth: must use isFounder check
  assertContains(apiPath, "admin.isFounder", "API uses isFounder for authorization");
  assertContains(apiPath, "Forbidden", "API returns 403 Forbidden for unauthorized");

  // Query params: audience, status, plan, search, from, to, page, pageSize
  assertContains(apiPath, "audience", "API supports audience filter");
  assertContains(apiPath, "status", "API supports status filter");
  assertContains(apiPath, "plan", "API supports plan filter");
  assertContains(apiPath, "search", "API supports search");
  assertContains(apiPath, "from", "API supports from date");
  assertContains(apiPath, "to", "API supports to date");
  assertContains(apiPath, "page", "API supports pagination");
  assertContains(apiPath, "pageSize", "API supports pageSize");

  // Valid enums
  assertContains(apiPath, "MURID_PREMIUM_MONTHLY", "API knows MURID_PREMIUM_MONTHLY plan");
  assertContains(apiPath, "MURID_PREMIUM_YEARLY", "API knows MURID_PREMIUM_YEARLY plan");
  assertContains(apiPath, "GURU_PRO_MONTHLY", "API knows GURU_PRO_MONTHLY plan");
  assertContains(apiPath, "GURU_PRO_YEARLY", "API knows GURU_PRO_YEARLY plan");
  assertContains(apiPath, "EXPIRING_SOON", "API supports EXPIRING_SOON status");

  // Response structure
  assertContains(apiPath, 'summary: {', "API returns summary");
  assertContains(apiPath, 'totalActive:', "API summary has totalActive");
  assertContains(apiPath, 'muridActive:', "API summary has muridActive");
  assertContains(apiPath, 'guruActive:', "API summary has guruActive");
  assertContains(apiPath, 'expiringSoon:', "API summary has expiringSoon");
  assertContains(apiPath, 'expired:', "API summary has expired");
  assertContains(apiPath, 'pagination: {', "API returns pagination");
  assertContains(apiPath, 'totalPages:', "API pagination has totalPages");
  assertContains(apiPath, 'lastTransaction:', "API returns lastTransaction per user");

  // ── 2. Premium Status Determination ──
  console.log(`\n${YELLOW}--- 2. Premium Status Logic ---${RESET}`);

  // Must use User.isPremium + User.premiumUntil for entitlement
  assertContains(apiPath, "user.isPremium && user.premiumUntil && user.premiumUntil > now", "Status ACTIVE uses isPremium + premiumUntil > now");
  assertContains(apiPath, "sevenDaysFromNow", "Status EXPIRING_SOON uses 7-day window");

  // Transaction data is for history only
  assertContains(apiPath, "transaksi", "API queries Transaksi for payment history");
  assertContains(apiPath, "MURID_PREMIUM", "API filters MURID_PREMIUM transactions");
  assertContains(apiPath, "PREMIUM_UPGRADE", "API filters PREMIUM_UPGRADE transactions");

  // ── 3. Admin UI Page ──
  console.log(`\n${YELLOW}--- 3. Admin UI Page ---${RESET}`);
  const uiPath = "app/(dashboard)/admin/premium/page.tsx";
  assert(existsSync(join(process.cwd(), uiPath)), `UI page exists: ${uiPath}`);

  assertContains(uiPath, '"use client"', "UI page is client component");
  assertContains(uiPath, "Premium Report", "UI page has title");
  assertContains(uiPath, "Premium Murid", "UI shows Premium Murid count");
  assertContains(uiPath, "Premium Guru", "UI shows Premium Guru count");
  assertContains(uiPath, "Segera Berakhir", "UI shows Expiring Soon count");
  assertContains(uiPath, "fetch(`/api/admin/premium/report", "UI fetches from correct API");

  // Filters
  assertContains(uiPath, "audience", "UI has audience filter");
  assertContains(uiPath, "statusFilter", "UI has status filter");
  assertContains(uiPath, "planFilter", "UI has plan filter");
  assertContains(uiPath, "search", "UI has search input");

  // Table columns
  assertContains(uiPath, "Nama", "UI table has Nama column");
  assertContains(uiPath, "Audience", "UI table has Audience column");
  assertContains(uiPath, "Paket", "UI table has Paket column");
  assertContains(uiPath, "Status", "UI table has Status column");
  assertContains(uiPath, "Berakhir", "UI table has Berakhir column");
  assertContains(uiPath, "Harga", "UI table has Harga column");
  assertContains(uiPath, "Pembayaran Terakhir", "UI table has Pembayaran Terakhir column");

  // Expiry label
  assertContains(uiPath, "hari lagi", "UI shows days until expiry");

  // No fabricated data
  assertNotContains(uiPath, "fake", "UI has no fake data");
  assertNotContains(uiPath, "dummy", "UI has no dummy data");
  assertNotContains(uiPath, "mock", "UI has no mock data");

  // ── 4. Sidebar Integration ──
  console.log(`\n${YELLOW}--- 4. Sidebar Integration ---${RESET}`);
  const sidebarPath = "components/admin/AdminSidebar.tsx";
  assert(existsSync(join(process.cwd(), sidebarPath)), `Sidebar exists: ${sidebarPath}`);
  assertContains(sidebarPath, "/admin/premium", "Sidebar links to /admin/premium");
  assertContains(sidebarPath, "Premium Report", "Sidebar has 'Premium Report' label");
  assertContains(sidebarPath, "Crown", "Sidebar imports Crown icon for Premium Report");

  // ── 5. No Leakage / No Fabricated Data ──
  console.log(`\n${YELLOW}--- 5. Security & Data Integrity ---${RESET}`);
  assertNotContains(apiPath, "correctAnswer", "API does not expose correctAnswer");
  assertNotContains(apiPath, "answerKey", "API does not expose answerKey");
  assertNotContains(apiPath, "jawaban", "API does not expose jawaban");
  assertNotContains(apiPath, "password", "API does not expose password");
  assertNotContains(apiPath, "service_role", "API does not expose service_role");

  // Admin-only: must check isFounder
  assertContains(apiPath, "!admin.isFounder", "API enforces isFounder-only access");

  // No billing logic changes
  assertNotContains(apiPath, "webhook", "API does not handle webhooks");
  assertNotContains(apiPath, "checkout", "API does not handle checkout");
  assertNotContains(apiPath, "createTransaction", "API does not call Midtrans createTransaction");

  // ── 6. Prisma Usage ──
  console.log(`\n${YELLOW}--- 6. Prisma Usage ---${RESET}`);
  assertContains(apiPath, "db.user.count", "API uses Prisma aggregate for summary (not in-memory)");
  assertContains(apiPath, "db.user.findMany", "API uses Prisma findMany for data");
  assertNotContains(apiPath, "findFirst", "API does not use findFirst for data");
  assertContains(apiPath, "Promise.all", "API parallelizes independent queries");

  // ── Summary ──
  console.log(`\n${YELLOW}=== Results ===${RESET}`);
  console.log(`  ${GREEN}Passed: ${passed}${RESET}`);
  console.log(`  ${RED}Failed: ${failed}${RESET}`);

  if (failed > 0) {
    console.log(`\n${RED}Errors:${RESET}`);
    for (const e of errors) {
      console.log(`  ${RED}${e}${RESET}`);
    }
    process.exit(1);
  } else {
    console.log(`\n${GREEN}All tests passed!${RESET}`);
    process.exit(0);
  }
}

main();
