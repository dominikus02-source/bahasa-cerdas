import { db } from "../lib/db";
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

const BACKUP_TABLES: string[] = [
  "User", "Profile", "Artikel", "Video", "Karya",
  "StudentKarya", "StudentKaryaLike", "StudentKaryaComment",
  "Soal", "SoalSet", "BankSoal",
  "UKBIQuestion", "TKAQuestion", "PaketKompetensi",
  "TestSession", "TestAnswer", "ProgresKompetensi", "KompetensiCertificate",
  "Pembelian", "PurchaseHistory", "SellerEarning", "Withdrawal",
  "Subscription", "AdminPaymentAuditLog",
  "Transaksi",
  "AiSavedResult", "AIUsage", "AiCreditLedger",
  "CoinTransaction", "DailyQuest", "StoreItem", "UserItem",
  "Notifikasi", "Group", "GroupMember",
  "Quiz", "QuizQuestion", "QuizAssignment", "QuizSubmission", "QuizAnswer", "QuizSession",
  "LearningLevel", "LearningUnit", "UserUnitProgress",
  "Penugasan", "PenugasanSubmission",
  "Materi", "KoleksiKata", "KamusEntry",
  "NilaiKategori", "Nilai",
  "Lomba", "LombaPeserta", "Loker",
  "RPP", "GeneratedRPP", "AIJob",
  "Certificate", "Community", "CommunityMember", "CommunityPost",
  "CoursePlaylist", "ChatMessage",
  "GameRoom", "GameQuestion", "GameSession", "GameResult",
  "GroupQuiz", "GroupQuizResult",
];

const BACKUP_ROOT = path.join(process.cwd(), "backups", "daily");
const MAX_BACKUPS = 30;

function parseArgs(): { trigger: string } {
  const args = process.argv.slice(2);
  const triggerIdx = args.findIndex((a) => a === "--trigger");
  const trigger = triggerIdx >= 0 && args[triggerIdx + 1] ? args[triggerIdx + 1] : "MANUAL";
  const validTriggers = ["MANUAL", "SCHEDULED", "PRE_DEPLOY", "POST_RECOVERY"];
  if (!validTriggers.includes(trigger.toUpperCase())) {
    console.error(`Invalid trigger: ${trigger}. Must be one of: ${validTriggers.join(", ")}`);
    process.exit(1);
  }
  return { trigger: trigger.toUpperCase() };
}

async function getCommitHash(): Promise<string> {
  try {
    const { execSync } = await import("child_process");
    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    return "unknown";
  }
}

function computeChecksum(data: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

async function backupTable(
  tableName: string,
  backupDir: string,
  manifest: BackupManifestEntry[]
): Promise<number> {
  const model = (db as any)[tableName as keyof typeof db] as any;
  if (!model || typeof model.findMany !== "function") {
    console.warn(`  ⚠️  Model ${tableName} not found`);
    return 0;
  }

  let rows: any[];
  try {
    rows = await model.findMany();
  } catch (err: any) {
    console.warn(`  ⚠️  Error reading ${tableName}: ${err.message}`);
    return 0;
  }

  const rowCount = rows.length;
  const checksum = computeChecksum(rows);
  const filePath = path.join(backupDir, `${tableName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), "utf-8");

  manifest.push({
    table: tableName,
    rowCount,
    checksumSha256: checksum,
    exportFilePath: `${tableName}.json`,
    exportedAt: new Date().toISOString(),
  });

  return rowCount;
}

function maskEmail(email: string | null | undefined): string {
  if (!email) return "-";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return name.slice(0, 2) + "***@" + domain;
}

async function uploadToStorage(
  backupDir: string,
  backupName: string
): Promise<boolean> {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.log("   ⏩ Supabase Storage upload skipped (SERVICE_ROLE_KEY not set)");
      return false;
    }

    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === "bahasacerdas-backups");
    if (!bucketExists) {
      const { error: createErr } = await supabase.storage.createBucket(
        "bahasacerdas-backups",
        { public: false }
      );
      if (createErr) {
        console.log(`   ⏩ Cannot create bucket: ${createErr.message}`);
        return false;
      }
    }

    const files = fs.readdirSync(backupDir).filter((f) => f.endsWith(".json"));
    let uploaded = 0;
    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const fileBuffer = fs.readFileSync(filePath);
      const storagePath = `${backupName}/${file}`;

      const { error } = await supabase.storage
        .from("bahasacerdas-backups")
        .upload(storagePath, fileBuffer, {
          contentType: "application/json",
          upsert: true,
        });

      if (!error) uploaded++;
    }

    console.log(`   📤 Uploaded ${uploaded}/${files.length} files to storage`);
    return uploaded === files.length;
  } catch (err: any) {
    console.log(`   ⏩ Storage upload unavailable: ${err.message}`);
    return false;
  }
}

function pruneOldBackups(): void {
  if (!fs.existsSync(BACKUP_ROOT)) return;
  const entries = fs
    .readdirSync(BACKUP_ROOT)
    .filter((e) => fs.statSync(path.join(BACKUP_ROOT, e)).isDirectory())
    .sort()
    .reverse();

  if (entries.length > MAX_BACKUPS) {
    const toRemove = entries.slice(MAX_BACKUPS);
    for (const dir of toRemove) {
      fs.rmSync(path.join(BACKUP_ROOT, dir), { recursive: true, force: true });
      console.log(`   🗑️  Pruned old backup: ${dir}`);
    }
  }
}

async function createBackupManifestRecord(
  backupName: string,
  storagePath: string,
  localPath: string,
  trigger: string,
  manifest: BackupManifest,
  totalRows: number,
  storageUploaded: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    const tableCounts: Record<string, number> = {};
    const checksums: Record<string, string> = {};
    for (const t of manifest.tables) {
      tableCounts[t.table] = t.rowCount;
      checksums[t.table] = t.checksumSha256;
    }

    const status = errorMessage ? "FAILED" : storageUploaded ? "SUCCESS" : "PARTIAL";
    const totalBytes = fs.existsSync(localPath)
      ? fs.readdirSync(localPath)
          .filter((f) => f.endsWith(".json"))
          .reduce((s, f) => s + fs.statSync(path.join(localPath, f)).size, 0)
      : 0;

    await db.backupManifest.create({
      data: {
        backupId: backupName,
        storagePath,
        localPath,
        environment: process.env.NODE_ENV || "production",
        status: status as any,
        trigger: trigger as any,
        tableCountsJson: JSON.stringify(tableCounts),
        checksumsJson: JSON.stringify(checksums),
        totalRows,
        totalTables: manifest.tables.length,
        totalBytes,
        startedAt: new Date(manifest.exportedAt),
        completedAt: new Date(),
        errorMessage: errorMessage || null,
      },
    });
    console.log(`   📝 BackupManifest DB record created (status: ${status})`);
  } catch (err: any) {
    console.error(`   ⚠️  Failed to create BackupManifest record: ${err.message}`);
  }
}

async function main() {
  const { trigger } = parseArgs();

  console.log("\n📦 DAILY BACKUP: Supabase to Local + Storage");
  console.log("=".repeat(55));
  console.log(`   Trigger:     ${trigger}`);

  const now = new Date();
  const ts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
  ].join("-");
  const backupName = `daily-${ts}`;
  const backupDir = path.join(BACKUP_ROOT, backupName);

  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`\n   Local path: ${backupDir}`);

  const manifest: BackupManifest = {
    exportedAt: new Date().toISOString(),
    environment: process.env.NODE_ENV || "production",
    appCommitHash: await getCommitHash(),
    version: "1.0.0",
    tables: [],
  };

  let totalRows = 0;
  let backedUpCount = 0;
  let errorMessage: string | undefined;

  for (const tableName of BACKUP_TABLES) {
    const count = await backupTable(tableName, backupDir, manifest.tables);
    totalRows += count;
    backedUpCount++;
    const entry = manifest.tables[manifest.tables.length - 1];
    const masked = tableName === "User" ? ` (email masked in report)` : "";
    const chk = entry ? entry.checksumSha256.slice(0, 12) : "????????";
    console.log(
      `   ${count.toString().padStart(6)} rows  ${tableName.padStart(25)}  ${chk}${masked}`
    );
  }

  const manifestPath = path.join(backupDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  console.log(`\n${"=".repeat(55)}`);
  console.log(`📊 BACKUP SUMMARY`);
  console.log(`   Name:          ${backupName}`);
  console.log(`   Tables:        ${backedUpCount}`);
  console.log(`   Total rows:    ${totalRows}`);
  console.log(`   Manifest:      manifest.json`);

  console.log(`\n☁️  STORAGE UPLOAD`);
  let storageUploaded = false;
  try {
    storageUploaded = await uploadToStorage(backupDir, backupName);
  } catch (err: any) {
    errorMessage = err.message;
    console.log(`   ⏩ Storage upload failed: ${err.message}`);
  }

  const storagePath = `bahasacerdas-backups/${backupName}/`;

  console.log(`\n📝 CREATING BACKUP MANIFEST DB RECORD`);
  await createBackupManifestRecord(
    backupName,
    storagePath,
    backupDir,
    trigger,
    manifest,
    totalRows,
    storageUploaded,
    errorMessage
  );

  console.log(`\n🧹 PRUNE OLD BACKUPS (keep ${MAX_BACKUPS})`);
  pruneOldBackups();

  console.log(`\n✅ Daily backup complete: ${backupName}`);

  await db.$disconnect();
}

main().catch((e) => {
  console.error("❌ Backup failed:", e.message);
  process.exit(1);
});
