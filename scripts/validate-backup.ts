import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

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

const BACKUP_ROOTS = [
  path.join(process.cwd(), "backups", "daily"),
  path.join(process.cwd(), "backups", "current"),
];

function computeChecksum(data: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

interface ValidationResult {
  backupName: string;
  backupDir: string;
  manifestValid: boolean;
  totalTables: number;
  totalRows: number;
  checksumErrors: string[];
  missingFiles: string[];
  rowCountErrors: string[];
  parsedAt: string;
  environment: string;
  commitHash: string;
}

function findLatestBackup(): { dir: string; name: string } | null {
  for (const root of BACKUP_ROOTS) {
    if (!fs.existsSync(root)) continue;
    const dirs = fs
      .readdirSync(root)
      .filter((d) => fs.statSync(path.join(root, d)).isDirectory())
      .sort()
      .reverse();
    if (dirs.length > 0) {
      return { dir: path.join(root, dirs[0]), name: dirs[0] };
    }
  }
  return null;
}

function validateBackup(backupDir: string, backupName: string): ValidationResult {
  const result: ValidationResult = {
    backupName,
    backupDir,
    manifestValid: false,
    totalTables: 0,
    totalRows: 0,
    checksumErrors: [],
    missingFiles: [],
    rowCountErrors: [],
    parsedAt: new Date().toISOString(),
    environment: "unknown",
    commitHash: "unknown",
  };

  const manifestPath = path.join(backupDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    result.checksumErrors.push("manifest.json not found");
    return result;
  }

  let manifest: BackupManifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  } catch {
    result.checksumErrors.push("manifest.json is not valid JSON");
    return result;
  }

  if (!manifest.tables || !Array.isArray(manifest.tables)) {
    result.checksumErrors.push("manifest.json missing tables array");
    return result;
  }

  result.manifestValid = true;
  result.environment = manifest.environment || "unknown";
  result.commitHash = manifest.appCommitHash || "unknown";
  result.totalTables = manifest.tables.length;

  // Track all non-zero tables for summary
  const nonZeroTables: { table: string; rows: number }[] = [];

  for (const entry of manifest.tables) {
    const filePath = path.join(backupDir, entry.exportFilePath);

    if (!fs.existsSync(filePath)) {
      result.missingFiles.push(entry.exportFilePath);
      continue;
    }

    let raw: string;
    try {
      raw = fs.readFileSync(filePath, "utf-8");
    } catch {
      result.checksumErrors.push(`Cannot read ${entry.exportFilePath}`);
      continue;
    }

    let data: any[];
    try {
      data = JSON.parse(raw);
    } catch {
      result.checksumErrors.push(`Invalid JSON in ${entry.exportFilePath}`);
      continue;
    }

    const actualChecksum = computeChecksum(data);
    if (actualChecksum !== entry.checksumSha256) {
      result.checksumErrors.push(
        `${entry.table}: checksum mismatch (expected ${entry.checksumSha256.slice(
          0,
          12
        )}, got ${actualChecksum.slice(0, 12)})`
      );
    }

    if (data.length !== entry.rowCount) {
      result.rowCountErrors.push(
        `${entry.table}: expected ${entry.rowCount} rows, got ${data.length}`
      );
    }

    result.totalRows += entry.rowCount;

    if (entry.rowCount > 0) {
      nonZeroTables.push({ table: entry.table, rows: entry.rowCount });
    }
  }

  // Print summary
  console.log(`\n📊 VALIDATION REPORT: ${backupName}`);
  console.log("=".repeat(55));
  console.log(`   Backup dir:    ${backupDir}`);
  console.log(`   Exported:      ${manifest.exportedAt}`);
  console.log(`   Environment:   ${result.environment}`);
  console.log(`   Commit:        ${result.commitHash}`);
  console.log(`   Tables:        ${result.totalTables}`);
  console.log(`   Total rows:    ${result.totalRows}`);
  console.log(`   Missing files: ${result.missingFiles.length}`);
  console.log(`   Checksum errs: ${result.checksumErrors.length}`);
  console.log(`   Row count err: ${result.rowCountErrors.length}`);

  if (nonZeroTables.length > 0) {
    console.log(`\n   Tables with data:`);
    for (const t of nonZeroTables) {
      console.log(`   ${t.rows.toString().padStart(6)}  ${t.table}`);
    }
  }

  if (result.missingFiles.length > 0) {
    console.log(`\n❌ MISSING FILES:`);
    for (const f of result.missingFiles) console.log(`   - ${f}`);
  }

  if (result.checksumErrors.length > 0) {
    console.log(`\n❌ CHECKSUM ERRORS:`);
    for (const e of result.checksumErrors) console.log(`   - ${e}`);
  }

  if (result.rowCountErrors.length > 0) {
    console.log(`\n⚠️  ROW COUNT MISMATCHES:`);
    for (const e of result.rowCountErrors) console.log(`   - ${e}`);
  }

  const isValid =
    result.manifestValid &&
    result.missingFiles.length === 0 &&
    result.checksumErrors.length === 0 &&
    result.rowCountErrors.length === 0;

  console.log(`\n✅ VALID: ${isValid ? "YES" : "NO"}`);

  return result;
}

function main() {
  const args = process.argv.slice(2);
  const specificPath = args.find((a) => !a.startsWith("--"));

  console.log("\n🔍 BACKUP VALIDATOR");

  if (specificPath) {
    const backupDir = fs.statSync(specificPath).isDirectory()
      ? specificPath
      : path.dirname(specificPath);
    const backupName = path.basename(backupDir);
    validateBackup(backupDir, backupName);
  } else {
    // Find and validate latest backup
    const latest = findLatestBackup();
    if (!latest) {
      console.error("❌ No backups found in backup directories");
      process.exit(1);
    }
    console.log(`   Latest backup: ${latest.name}`);
    validateBackup(latest.dir, latest.name);
  }
}

main();
