import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { db } from "../lib/db";

interface BackupManifestEntry {
  table: string;
  rowCount: number;
  checksumSha256: string;
  exportFilePath: string;
  exportedAt: string;
}

interface BackupManifest {
  exportedAt: string;
  environment: string;
  appCommitHash: string;
  version: string;
  tables: BackupManifestEntry[];
}

const PROTECTED_TABLES = new Set(["User", "Profile"]);
const PAYMENT_TABLES = new Set(["Pembelian", "PurchaseHistory", "Transaksi", "Subscription", "Withdrawal", "SellerEarning", "AdminPaymentAuditLog"]);
const AUTH_TABLES = new Set(["User", "Profile"]);

function parseArgs(): {
  manifestPath: string;
  execute: boolean;
  tables: Set<string> | null;
  overwrite: boolean;
  forceProtected: boolean;
} {
  const args = process.argv.slice(2);
  const manifestIdx = args.findIndex((a) => a === "--manifest");
  const manifestPath = manifestIdx >= 0 ? args[manifestIdx + 1] : "";
  const execute = args.includes("--execute");
  const overwrite = args.includes("--overwrite");
  const forceProtected = args.includes("--force-protected");

  let tables: Set<string> | null = null;
  const tablesIdx = args.findIndex((a) => a === "--tables");
  if (tablesIdx >= 0 && args[tablesIdx + 1]) {
    tables = new Set(args[tablesIdx + 1].split(",").map((t) => t.trim()));
  }

  return { manifestPath, execute, tables, overwrite, forceProtected };
}

function computeChecksum(data: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

function loadManifest(manifestPath: string): BackupManifest {
  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ Manifest not found: ${manifestPath}`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  if (!raw.tables || !Array.isArray(raw.tables)) {
    console.error("❌ Invalid manifest: missing tables array");
    process.exit(1);
  }
  return raw as BackupManifest;
}

function verifyChecksums(
  manifest: BackupManifest,
  backupDir: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const entry of manifest.tables) {
    const filePath = path.join(backupDir, entry.exportFilePath);
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing file: ${entry.exportFilePath}`);
      continue;
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    let data: any[];
    try { data = JSON.parse(raw); } catch {
      errors.push(`Invalid JSON: ${entry.exportFilePath}`);
      continue;
    }
    const actualChecksum = computeChecksum(data);
    if (actualChecksum !== entry.checksumSha256) {
      errors.push(`Checksum mismatch for ${entry.table}: expected ${entry.checksumSha256.slice(0, 12)}, got ${actualChecksum.slice(0, 12)}`);
    }
    if (data.length !== entry.rowCount) {
      errors.push(`Row count mismatch for ${entry.table}: expected ${entry.rowCount}, got ${data.length}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

function maskEmail(email: string | null | undefined): string {
  if (!email) return "-";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return name.slice(0, 2) + "***@" + domain;
}

async function countExisting(tableName: string): Promise<number> {
  try {
    const model = (db as any)[tableName as keyof typeof db] as any;
    if (model?.count) return await model.count();
  } catch {}
  return 0;
}

async function main() {
  const { manifestPath, execute, tables, overwrite, forceProtected } = parseArgs();

  if (!manifestPath) {
    console.error("\n❌ Usage: npm run restore:backup -- --manifest <path> [--execute] [--tables table1,table2] [--overwrite] [--force-protected]");
    process.exit(1);
  }

  console.log(`\n♻️  RESTORE BACKUP`);
  console.log("=".repeat(55));
  console.log(`   Manifest: ${manifestPath}`);
  console.log(`   Mode:     ${execute ? "EXECUTE ⚠️" : "DRY RUN (no changes)"}`);
  console.log(`   Tables:   ${tables ? [...tables].join(", ") : "ALL"}`);
  console.log(`   Overwrite: ${overwrite ? "YES ⚠️" : "NO (skip existing)"}`);
  console.log(`   Force:    ${forceProtected ? "YES (protected tables allowed) ⚠️" : "NO (protected tables blocked)"}`);

  if (!execute) {
    console.log(`\n⚠️  DRY RUN — No data will be modified.`);
    console.log(`   To execute, add --execute flag.`);
  }

  const manifest = loadManifest(manifestPath);
  const backupDir = path.dirname(manifestPath);

  console.log(`\n📋 MANIFEST`);
  console.log(`   Exported:  ${manifest.exportedAt}`);
  console.log(`   Env:       ${manifest.environment}`);
  console.log(`   Commit:    ${manifest.appCommitHash}`);
  console.log(`   Tables in manifest: ${manifest.tables.length}`);

  console.log(`\n🔍 VERIFYING CHECKSUMS...`);
  const { valid, errors } = verifyChecksums(manifest, backupDir);
  if (!valid) {
    console.error(`\n❌ Checksum verification FAILED:`);
    for (const err of errors) console.error(`   - ${err}`);
    console.error(`\n   Restore aborted. Backup is corrupted.`);
    process.exit(1);
  }
  console.log(`   ✅ All ${manifest.tables.length} table checksums match`);

  console.log(`\n📋 RESTORE PLAN`);
  let totalInserts = 0;
  let totalSkips = 0;
  const protectedBlocked: string[] = [];

  for (const entry of manifest.tables) {
    if (tables && !tables.has(entry.table)) {
      console.log(`   ⏩ ${entry.table.padEnd(25)} ${entry.rowCount} rows (filtered out by --tables)`);
      totalSkips += entry.rowCount;
      continue;
    }

    if (PROTECTED_TABLES.has(entry.table) && !tables?.has(entry.table)) {
      protectedBlocked.push(entry.table);
      console.log(`   🔒 ${entry.table.padEnd(25)} ${entry.rowCount} rows (PROTECTED — add --tables ${entry.table} to restore)`);
      totalSkips += entry.rowCount;
      continue;
    }

    if (PROTECTED_TABLES.has(entry.table) && tables?.has(entry.table) && !forceProtected) {
      protectedBlocked.push(entry.table);
      console.log(`   🔒 ${entry.table.padEnd(25)} ${entry.rowCount} rows (requires --force-protected flag)`);
      totalSkips += entry.rowCount;
      continue;
    }

    if (PAYMENT_TABLES.has(entry.table) && !tables?.has(entry.table)) {
      console.log(`   💰 ${entry.table.padEnd(25)} ${entry.rowCount} rows (payment data — skipped unless in --tables)`);
      totalSkips += entry.rowCount;
      continue;
    }

    const existingCount = await countExisting(entry.table);
    const willInsert = overwrite ? entry.rowCount : Math.max(0, entry.rowCount - existingCount);
    const willSkip = !overwrite ? Math.min(existingCount, entry.rowCount) : 0;

    console.log(
      `   ${willInsert > 0 ? "➕" : "⏩"} ${entry.table.padEnd(25)} ${entry.rowCount} rows (exist: ${existingCount}, insert: ${willInsert}, skip: ${willSkip})`
    );
    totalInserts += willInsert;
    totalSkips += willSkip;

    if (!execute && entry.rowCount > 0 && willInsert > 0) {
      const filePath = path.join(backupDir, entry.exportFilePath);
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const samples = data.slice(0, 3);
      for (const s of samples) {
        const label = entry.table === "User" ? maskEmail(s.email) : s.title || s.id;
        console.log(`      • ${label}`);
      }
      if (data.length > 3) console.log(`      ... and ${data.length - 3} more`);
    }
  }

  console.log(`\n📊 PLAN SUMMARY`);
  console.log(`   Total inserts planned: ${totalInserts}`);
  console.log(`   Total skips:           ${totalSkips}`);
  if (protectedBlocked.length > 0) {
    console.log(`   Protected tables:      ${protectedBlocked.join(", ")} (not restored)`);
  }

  if (!execute) {
    console.log(`\n⚠️  DRY RUN — No data was modified.`);
    console.log(`   To restore, run: npm run restore:backup -- --manifest "${manifestPath}" --execute`);
    console.log(`   To overwrite existing: add --overwrite`);
    console.log(`   To restore protected tables: add --tables User,Profile --force-protected`);
    await db.$disconnect();
    process.exit(0);
  }

  console.log(`\n⚠️  EXECUTING RESTORE...`);

  for (const entry of manifest.tables) {
    if (tables && !tables.has(entry.table)) continue;
    if (PROTECTED_TABLES.has(entry.table) && (!tables?.has(entry.table) || !forceProtected)) continue;
    if (PAYMENT_TABLES.has(entry.table) && !tables?.has(entry.table)) continue;

    const filePath = path.join(backupDir, entry.exportFilePath);
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const model = (db as any)[entry.table as keyof typeof db] as any;
    if (!model || typeof model.createMany !== "function") {
      console.log(`   ⏩ ${entry.table}: createMany not available, skipping`);
      continue;
    }

    if (data.length === 0) {
      console.log(`   ⏩ ${entry.table}: 0 rows, nothing to restore`);
      continue;
    }

    try {
      if (overwrite) {
        await model.deleteMany({});
        await model.createMany({ data });
        console.log(`   ✅ ${entry.table}: ${data.length} rows restored (overwrite)`);
      } else {
        try {
          await model.createMany({ data, skipDuplicates: true });
          console.log(`   ✅ ${entry.table}: ${data.length} rows attempted (skipDuplicates)`);
        } catch {
          let created = 0;
          for (const row of data) {
            try {
              await model.create({ data: row });
              created++;
            } catch {}
          }
          console.log(`   ✅ ${entry.table}: ${created}/${data.length} rows restored`);
        }
      }
    } catch (err: any) {
      console.error(`   ❌ ${entry.table}: ${err.message}`);
    }
  }

  console.log(`\n✅ Restore complete. Verify with: npm run validate:backup`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error("❌ Restore failed:", e.message);
  process.exit(1);
});
