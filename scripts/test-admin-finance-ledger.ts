/**
 * Admin Finance hub + Buku Kas ledger — QA tests
 *
 * Covers validation, totals, XLSX export shape, auth/confirm policy,
 * persistence (no localStorage), additive migration/RLS, and nav.
 *
 * Run: npx tsx scripts/test-admin-finance-ledger.ts
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { inflateRawSync } from "zlib";
import { computeLedgerTotals, parseRupiahAmount, validateLedgerInput, normalizeLedgerInput } from "../lib/finance/ledger";
import { isValidIsoDate, jakartaDateISO, startOfJakartaMonth } from "../lib/finance/dates";
import { buildLedgerWorkbook, isZipXlsx } from "../lib/finance/xlsx";
import { financeTabFromLocation, isFinanceHubPath } from "../lib/finance/nav";
import { requiresTypedConfirm } from "../lib/admin/confirm";

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

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf-8");
}

function unzipNamesAndText(buf: Buffer): { names: string[]; text: string } {
  const names: string[] = [];
  const parts: string[] = [];
  let offset = 0;
  while (offset + 4 <= buf.length && buf.readUInt32LE(offset) === 0x04034b50) {
    const method = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const name = buf.subarray(offset + 30, offset + 30 + nameLen).toString("utf8");
    names.push(name);
    const start = offset + 30 + nameLen + extraLen;
    const comp = buf.subarray(start, start + compSize);
    const data = method === 0 ? comp : inflateRawSync(comp);
    parts.push(data.toString("utf8"));
    offset = start + compSize;
  }
  return { names, text: parts.join("\n") };
}

async function main() {
  console.log(`\n${YELLOW}=== Admin Finance Hub + Buku Kas ===${RESET}\n`);

  console.log(`${YELLOW}--- 1. Validation & totals ---${RESET}`);
  const today = jakartaDateISO();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(today), "jakartaDateISO returns YYYY-MM-DD");
  assert(isValidIsoDate("2026-11-10"), "valid calendar date accepted");
  assert(!isValidIsoDate("2026-13-01"), "invalid month rejected");
  assert(!isValidIsoDate("2026-02-30"), "invalid day rejected");
  assert(!isValidIsoDate("10/11/2026"), "non-ISO date rejected");
  const month = startOfJakartaMonth("2026-11-10");
  assert(month.from === "2026-11-01" && month.to === "2026-11-30", "November range is 01–30");

  const bad = validateLedgerInput(
    { entryDate: "nope", type: "IN", amount: -5, description: "  ", category: "x".repeat(81) },
    { isValidIsoDate },
  );
  assert(bad.some((e) => e.field === "entryDate"), "rejects bad date");
  assert(bad.some((e) => e.field === "type"), "rejects bad type");
  assert(bad.some((e) => e.field === "amount"), "rejects non-positive amount");
  assert(bad.some((e) => e.field === "description"), "rejects empty description");
  assert(bad.some((e) => e.field === "category"), "rejects oversized category");
  assert(parseRupiahAmount("Rp 1.500.000") === 1500000, "parses dotted rupiah string");
  assert(parseRupiahAmount(0) === 0, "parses zero");
  const ok = validateLedgerInput(
    { entryDate: "2026-11-10", type: "PEMASUKAN", amount: "250000", description: "Setoran", category: "Premium" },
    { isValidIsoDate },
  );
  assert(ok.length === 0, "accepts a valid entry");
  const norm = normalizeLedgerInput({
    entryDate: "2026-11-10", type: "PEMASUKAN", amount: "250000", description: "  Setoran  ", category: " Premium ",
  });
  assert(norm.amount === 250000 && norm.description === "Setoran" && norm.category === "Premium", "normalizes amount and trim");

  const totals = computeLedgerTotals([
    { type: "PEMASUKAN", amount: 100000 },
    { type: "PEMASUKAN", amount: 50000n },
    { type: "PENGELUARAN", amount: 20000 },
  ]);
  assert(totals.pemasukan === 150000, "sums pemasukan");
  assert(totals.pengeluaran === 20000, "sums pengeluaran");
  assert(totals.saldo === 130000, "saldo is pemasukan minus pengeluaran");

  console.log(`\n${YELLOW}--- 2. XLSX export ---${RESET}`);
  const xlsx = buildLedgerWorkbook({
    from: "2026-11-01",
    to: "2026-11-30",
    totals: { pemasukan: 150000, pengeluaran: 20000, saldo: 130000 },
    entries: [{
      entryDate: "2026-11-10",
      type: "PEMASUKAN",
      amount: 150000,
      description: "Setoran <uji> & cek",
      category: "Premium",
      createdByEmail: "founder@bahasacerdas.test",
      updatedByEmail: null,
      createdAt: "2026-11-10T15:42:00.000Z",
    }],
  });
  assert(isZipXlsx(xlsx), "workbook is a real zip/xlsx (PK header + workbook.xml)");
  const unzipped = unzipNamesAndText(xlsx);
  assert(unzipped.names.includes("xl/worksheets/sheet1.xml"), "contains entries sheet");
  assert(unzipped.names.includes("xl/worksheets/sheet2.xml"), "contains summary sheet");
  assert(unzipped.text.includes("Entri") && unzipped.text.includes("Ringkasan"), "sheet names Entri + Ringkasan");
  assert(unzipped.text.includes("Pemasukan") && unzipped.text.includes("150000"), "entries include type and amount");
  assert(unzipped.text.includes("Setoran &lt;uji&gt; &amp; cek"), "description is XML-escaped");
  assert(unzipped.text.includes("Total pemasukan") && unzipped.text.includes("130000"), "summary includes saldo");

  console.log(`\n${YELLOW}--- 3. Auth, confirm, no localStorage ---${RESET}`);
  const listSrc = read("app/api/admin/finance/ledger/route.ts");
  const idSrc = read("app/api/admin/finance/ledger/[id]/route.ts");
  const exportSrc = read("app/api/admin/finance/ledger/export/route.ts");
  assert(listSrc.includes("withAdmin") && idSrc.includes("withAdmin") && exportSrc.includes("withAdmin"), "all ledger routes use withAdmin");
  assert(listSrc.includes("getUser") && idSrc.includes("getUser"), "mutations re-check session user");
  assert(requiresTypedConfirm("POST", "/api/admin/finance/ledger"), "POST ledger requires typed confirm");
  assert(requiresTypedConfirm("PATCH", "/api/admin/finance/ledger/abc123"), "PATCH ledger requires typed confirm");
  assert(requiresTypedConfirm("DELETE", "/api/admin/finance/ledger/abc123"), "DELETE ledger requires typed confirm");
  assert(!requiresTypedConfirm("GET", "/api/admin/finance/ledger"), "GET list does not require typed confirm");
  assert(!requiresTypedConfirm("GET", "/api/admin/finance/ledger/export"), "GET export does not require typed confirm");
  const confirmSrc = read("lib/admin/confirm.ts");
  assert(confirmSrc.includes("finance\\/ledger") || confirmSrc.includes("/api/admin/finance/ledger"), "confirm rules list ledger paths");

  const uiFiles = [
    "components/admin/finance/LedgerBook.tsx",
    "components/admin/finance/FinanceHub.tsx",
    "lib/finance/ledger.ts",
    "app/api/admin/finance/ledger/route.ts",
  ];
  for (const f of uiFiles) {
    assert(!read(f).includes("localStorage"), `${f} does not use localStorage`);
  }
  assert(listSrc.includes("db.financeLedgerEntry") && idSrc.includes("db.financeLedgerEntry"), "API persists via Prisma table");
  assert(listSrc.includes("createdByEmail") && idSrc.includes("updatedByEmail"), "API records actor emails");

  console.log(`\n${YELLOW}--- 4. Migration & schema ---${RESET}`);
  const migPath = "prisma/migrations/20261110160000_finance_ledger_entries/migration.sql";
  assert(existsSync(join(process.cwd(), migPath)), "additive migration folder exists");
  const sql = read(migPath);
  assert(sql.includes('CREATE TABLE "FinanceLedgerEntry"'), "creates FinanceLedgerEntry");
  assert(sql.includes('"amount" BIGINT'), "amount is bigint rupiah");
  assert(sql.includes("ENABLE ROW LEVEL SECURITY"), "enables RLS");
  assert(!sql.includes("FORCE ROW LEVEL SECURITY"), "does not FORCE RLS (Prisma owner must retain access)");
  assert(sql.includes("CREATE TYPE") || sql.includes("FinanceLedgerType"), "adds FinanceLedgerType enum");
  assert(!/DROP TABLE/i.test(sql), "migration is additive (no DROP TABLE)");
  const schema = read("prisma/schema.prisma");
  assert(schema.includes("model FinanceLedgerEntry") && schema.includes("amount          BigInt"), "Prisma model uses BigInt amount");
  assert(schema.includes("FinanceLedgerCreatedBy") && schema.includes("onDelete: SetNull"), "user FKs are optional SET NULL");

  console.log(`\n${YELLOW}--- 5. Hub, nav, fixtures ---${RESET}`);
  assert(existsSync(join(process.cwd(), "app/(dashboard)/admin/keuangan/page.tsx")), " /admin/keuangan page exists");
  assert(existsSync(join(process.cwd(), "app/(dashboard)/admin/keuangan/buku-kas/page.tsx")), " /admin/keuangan/buku-kas page exists");
  const hub = read("components/admin/finance/FinanceHub.tsx");
  for (const label of ["Ringkasan", "Pembayaran", "Premium", "Penarikan", "Payout Guru", "Buku Kas"]) {
    assert(hub.includes(label) || read("lib/finance/nav.ts").includes(label), `hub tab: ${label}`);
  }
  assert(read("app/(dashboard)/admin/payments/page.tsx").includes('initialTab="pembayaran"'), "old /admin/payments renders hub tab");
  assert(read("app/(dashboard)/admin/premium/page.tsx").includes('initialTab="premium"'), "old /admin/premium renders hub tab");
  assert(read("app/(dashboard)/admin/withdrawals/page.tsx").includes('initialTab="penarikan"'), "old /admin/withdrawals renders hub tab");
  assert(read("app/(dashboard)/admin/teacher-payouts/page.tsx").includes('initialTab="payout"'), "old /admin/teacher-payouts renders hub tab");
  assert(isFinanceHubPath("/admin/premium") && isFinanceHubPath("/admin/keuangan/buku-kas"), "finance hub path helper covers old + new URLs");
  assert(!isFinanceHubPath("/admin/teacher-risk"), "teacher-risk stays outside the hub path set");
  assert(financeTabFromLocation("/admin/payments") === "pembayaran", "payments path maps to pembayaran tab");
  assert(financeTabFromLocation("/admin/keuangan", "buku-kas") === "buku-kas", "query tab=buku-kas is honored");

  const mobile = read("components/admin/AdminMobileNav.tsx");
  assert(mobile.includes('label: "Finance"') && mobile.includes('href: "/admin/keuangan"'), "bottom nav Bayaran became Finance");
  assert(!mobile.includes('label: "Bayaran"'), "Bayaran label removed from mobile nav");
  const sidebar = read("components/admin/AdminSidebar.tsx");
  assert(sidebar.includes('href: "/admin/keuangan"') && sidebar.includes("Buku Kas"), "sidebar has Keuangan + Buku Kas");
  assert(sidebar.includes("/admin/premium") && sidebar.includes("/admin/payments"), "sidebar keeps old finance links");

  const fixtures = read("app/qa-fixture/client-pages.tsx");
  assert(fixtures.includes('"/admin/keuangan"') && fixtures.includes('"/admin/keuangan/buku-kas"'), "overflow fixtures include new routes");
  const ci = read(".github/workflows/ci.yml");
  assert(ci.includes("/admin/keuangan") && ci.includes("/admin/keuangan/buku-kas"), "CI audit routes include new finance paths");
  const ledgerUi = read("components/admin/finance/LedgerBook.tsx");
  assert(ledgerUi.includes("Unduh Excel") && ledgerUi.includes("Total pemasukan") && ledgerUi.includes("Keterangan"), "ledger UI has form, totals, export");
  assert(ledgerUi.includes("useTypedConfirm") && ledgerUi.includes("adminConfirmHeaders"), "edit/delete/create use typed confirm");

  console.log(`\n${YELLOW}HASIL: ${passed} passed, ${failed} failed${RESET}`);
  if (failed) {
    for (const e of errors) console.log(`  ${RED}${e}${RESET}`);
    process.exit(1);
  }
  console.log("✅ Finance hub + ledger tests passed\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
