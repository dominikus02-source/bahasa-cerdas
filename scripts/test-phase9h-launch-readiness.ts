/**
 * Phase 9H — Soft Launch Readiness Tests
 *
 * Run: npx tsx scripts/test-phase9h-launch-readiness.ts
 */

import * as fs from "fs";
import * as path from "path";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) { console.log(`  ✅ ${label}`); passed++; }
  else { console.error(`  ❌ ${label}`); failed++; }
}

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf-8");
}

// ─── Test 1: No outdated "14 hari" trial copy ────────────────────────
console.log("\n📋 Test 1: No outdated '14 hari' trial copy");
{
  const files = [
    "app/page.tsx", "components/landing/HeroSection.tsx",
    "components/landing/FAQSection.tsx", "components/landing/FinalCTA.tsx",
    "app/fitur/page.tsx", "app/tentang/page.tsx",
  ];
  let badCount = 0;
  files.forEach((f) => {
    try {
      const content = readFile(f);
      if (content.includes("14 hari") || content.includes("14-hari")) {
        console.error(`    ❌ "${f}" still has '14 hari'`);
        badCount++;
      }
    } catch {}
  });
  assert(badCount === 0, `No '14 hari' in ${files.length} landing/promo files`);
}

// ─── Test 2: No "unlimited AI" copy for Guru Pro ─────────────────────
console.log("\n📋 Test 2: No 'unlimited AI' copy for Guru Pro");
{
  const files = [
    "components/dashboard/GuruSidebar.tsx",
    "components/shared/upgrade-modal.tsx",
  ];
  let badCount = 0;
  files.forEach((f) => {
    try {
      const content = readFile(f);
      if (content.includes("AI unlimited") || content.includes("unlimited AI")) {
        console.error(`    ❌ "${f}" still has 'unlimited AI'`);
        badCount++;
      }
    } catch {}
  });
  assert(badCount === 0, "No 'unlimited AI' in sidebars/modals");
}

// ─── Test 3: Pricing copy includes correct amounts ───────────────────
console.log("\n📋 Test 3: Pricing copy includes Rp 49.000 and Rp 399.000");
{
  const berlangganan = readFile("app/(dashboard)/guru/berlangganan/page.tsx");
  assert(berlangganan.includes("49.000") || berlangganan.includes("49000"), "Rp 49.000 monthly price present");
  assert(berlangganan.includes("399.000") || berlangganan.includes("399000"), "Rp 399.000 yearly price present");
}

// ─── Test 4: Payment terms mention one-time/manual renewal ───────────
console.log("\n📋 Test 4: Payment terms mention one-time/manual renewal");
{
  const berlangganan = readFile("app/(dashboard)/guru/berlangganan/page.tsx");
  assert(berlangganan.includes("sekali bayar") || berlangganan.includes("diperpanjang otomatis"), "One-time payment mentioned");
  assert(berlangganan.includes("Ketentuan Pembayaran"), "Payment terms section exists");
}

// ─── Test 5: Payment support page exists ─────────────────────────────
console.log("\n📋 Test 5: Payment support page /guru/bantuan/pembayaran exists");
{
  try {
    const support = readFile("app/(dashboard)/guru/bantuan/pembayaran/page.tsx");
    assert(support.includes("Bantuan Pembayaran"), "Support page title exists");
    assert(support.includes("Order ID"), "Mentions Order ID");
    assert(support.includes("Screenshot"), "Mentions screenshot");
  } catch {
    console.error("    ❌ Support page not found");
    failed++;
  }
}

// ─── Test 6: Payment health API exists and requires founder ──────────
console.log("\n📋 Test 6: Payment health API exists and requires founder");
{
  try {
    const health = readFile("app/api/admin/payments/health/route.ts");
    assert(health.includes("isFounder"), "Founder check present");
    assert(!health.includes("MIDTRANS_SERVER_KEY"), "No server key exposed");
  } catch {
    console.error("    ❌ Health API not found");
    failed++;
  }
}

// ─── Test 7: Health API detects SUCCESS payment without premium ──────
console.log("\n📋 Test 7: Health API detects SUCCESS payment without premium");
{
  try {
    const health = readFile("app/api/admin/payments/health/route.ts");
    assert(health.includes("paymentWithoutPremium"), "paymentWithoutPremium metric");
    assert(health.includes("isPremium") && health.includes("premiumUntil"), "Checks user.isPremium and premiumUntil");
  } catch { failed++; }
}

// ─── Test 8: Health API detects active premium without ledger ────────
console.log("\n📋 Test 8: Health API detects active premium without ledger");
{
  try {
    const health = readFile("app/api/admin/payments/health/route.ts");
    assert(health.includes("premiumWithoutLedger"), "premiumWithoutLedger metric");
    assert(health.includes("creditsTotal") && health.includes("GURU_PRO"), "Checks GURU_PRO ledger");
  } catch { failed++; }
}

// ─── Test 9: Health API detects old pending transactions ─────────────
console.log("\n📋 Test 9: Health API detects old pending transactions");
{
  try {
    const health = readFile("app/api/admin/payments/health/route.ts");
    assert(health.includes("pendingOlder30Min") || health.includes("thirtyMin"), "Older than 30min pending detection");
  } catch { failed++; }
}

// ─── Test 10: Admin health card on payments page ─────────────────────
console.log("\n📋 Test 10: Admin health card on payments page");
{
  try {
    const payments = readFile("app/(dashboard)/admin/payments/page.tsx");
    assert(payments.includes("Payment Health") || payments.includes("health"), "Health card exists");
    assert(payments.includes("/api/admin/payments/health"), "Calls health API");
  } catch {}
}

// ─── Test 11: Berlangganan has Ketentuan Pembayaran ──────────────────
console.log("\n📋 Test 11: Berlangganan has Ketentuan Pembayaran section");
{
  const page = readFile("app/(dashboard)/guru/berlangganan/page.tsx");
  assert(page.includes("Ketentuan Pembayaran"), "Payment terms section");
  assert(page.includes("30 hari") && page.includes("365 hari"), "Duration values present");
}

// ─── Test 12: Copy not claim recurring/automatic subscription ────────
console.log("\n📋 Test 12: Copy does not claim recurring/automatic subscription");
{
  const berlangganan = readFile("app/(dashboard)/guru/berlangganan/page.tsx");
  assert(berlangganan.includes("tidak diperpanjang otomatis"), "Explicitly says NOT auto-renewal");
  assert(!berlangganan.includes("langganan otomatis"), "No automatic subscription claim");
}

// ─── Test 13: FAQSection price updated ───────────────────────────────
console.log("\n📋 Test 13: FAQSection price updated to Rp 49.000");
{
  const faq = readFile("components/landing/FAQSection.tsx");
  assert(!faq.includes("Rp 50.000"), "No outdated Rp 50.000 price");
  assert(faq.includes("Rp 49.000"), "Correct Rp 49.000 price");
}

// ─── Summary ─────────────────────────────────────────────────────────
console.log("\n" + "=".repeat(50));
console.log(`📊 Phase 9H Launch Readiness Tests`);
console.log(`   Passed: ${passed}`);
console.log(`   Failed: ${failed}`);
console.log("=".repeat(50));

process.exit(failed > 0 ? 1 : 0);
