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

function parseArgs(): { manifestPath?: string } {
  const args = process.argv.slice(2);
  const manifestIdx = args.findIndex((a) => a === "--manifest");
  const manifestPath = manifestIdx >= 0 ? args[manifestIdx + 1] : undefined;
  return { manifestPath };
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

function validateBackup(backupDir: string, backupName: string): boolean {
  let isValid = true;
  const manifestPath = path.join(backupDir, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ manifest.json not found in ${backupDir}`);
    return false;
  }

  let manifest: BackupManifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  } catch {
    console.error("❌ manifest.json is not valid JSON");
    return false;
  }

  if (!manifest.tables || !Array.isArray(manifest.tables)) {
    console.error("❌ manifest.json missing tables array");
    return false;
  }

  let totalRows = 0;
  let missingFiles = 0;
  let checksumErrors = 0;
  let rowCountErrors = 0;
  const nonZeroTables: { table: string; rows: number }[] = [];

  for (const entry of manifest.tables) {
    const filePath = path.join(backupDir, entry.exportFilePath);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Missing file: ${entry.exportFilePath}`);
      missingFiles++;
      isValid = false;
      continue;
    }

    let raw: string;
    try {
      raw = fs.readFileSync(filePath, "utf-8");
    } catch {
      console.error(`❌ Cannot read ${entry.exportFilePath}`);
      checksumErrors++;
      isValid = false;
      continue;
    }

    let data: any[];
    try {
      data = JSON.parse(raw);
    } catch {
      console.error(`❌ Invalid JSON in ${entry.exportFilePath}`);
      checksumErrors++;
      isValid = false;
      continue;
    }

    const actualChecksum = computeChecksum(data);
    if (actualChecksum !== entry.checksumSha256) {
      console.error(`❌ Checksum mismatch for ${entry.table}: expected ${entry.checksumSha256.slice(0, 12)}, got ${actualChecksum.slice(0, 12)}`);
      checksumErrors++;
      isValid = false;
    }

    if (data.length !== entry.rowCount) {
      console.error(`⚠️ Row count mismatch for ${entry.table}: expected ${entry.rowCount}, got ${data.length}`);
      rowCountErrors++;
      isValid = false;
    }

    totalRows += entry.rowCount;
    if (entry.rowCount > 0) {
      nonZeroTables.push({ table: entry.table, rows: entry.rowCount });
    }
  }

  console.log(`\n📊 VALIDATION REPORT: ${backupName}`);
  console.log("=".repeat(55));
  console.log(`   Backup dir:    ${backupDir}`);
  console.log(`   Exported:      ${manifest.exportedAt}`);
  console.log(`   Environment:   ${manifest.environment}`);
  console.log(`   Commit:        ${manifest.appCommitHash}`);
  console.log(`   Tables:        ${manifest.tables.length}`);
  console.log(`   Total rows:    ${totalRows}`);
  console.log(`   Missing files: ${missingFiles}`);
  console.log(`   Checksum errs: ${checksumErrors}`);
  console.log(`   Row count err: ${rowCountErrors}`);

  if (nonZeroTables.length > 0) {
    console.log(`\n   Tables with data:`);
    for (const t of nonZeroTables) {
      console.log(`   ${t.rows.toString().padStart(6)}  ${t.table}`);
    }
  }

  console.log(`\n✅ VALID: ${isValid ? "YES" : "NO"}`);
  return isValid;
}

function main() {
  const { manifestPath } = parseArgs();

  console.log("\n🔍 BACKUP VALIDATOR");

  if (manifestPath) {
    const resolvedPath = path.resolve(manifestPath);
    const backupDir = fs.statSync(resolvedPath).isDirectory()
      ? resolvedPath
      : path.dirname(resolvedPath);
    const backupName = path.basename(backupDir);
    const valid = validateBackup(backupDir, backupName);
    process.exit(valid ? 0 : 1);
  }

  const latest = findLatestBackup();
  if (!latest) {
    console.error("❌ No backups found in backup directories");
    process.exit(1);
  }
  console.log(`   Latest backup: ${latest.name}`);
  const valid = validateBackup(latest.dir, latest.name);
  process.exit(valid ? 0 : 1);
}

main();
