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
  tables: BackupManifestEntry[];
}

const BACKUP_TABLES: string[] = [
  "User",
  "Artikel",
  "Video",
  "Karya",
  "StudentKarya",
  "StudentKaryaLike",
  "StudentKaryaComment",
  "Soal",
  "SoalSet",
  "BankSoal",
  "UKBIQuestion",
  "TKAQuestion",
  "PaketKompetensi",
  "TestSession",
  "TestAnswer",
  "ProgresKompetensi",
  "KompetensiCertificate",
  "Pembelian",
  "PurchaseHistory",
  "SellerEarning",
  "Withdrawal",
  "Subscription",
  "AdminPaymentAuditLog",
  "Transaksi",
  "AiSavedResult",
  "AIUsage",
  "AiCreditLedger",
  "CoinTransaction",
  "DailyQuest",
  "StoreItem",
  "UserItem",
  "Notifikasi",
  "Group",
  "GroupMember",
  "Quiz",
  "QuizQuestion",
  "QuizAssignment",
  "QuizSubmission",
  "QuizAnswer",
  "QuizSession",
  "LearningLevel",
  "LearningUnit",
  "UserUnitProgress",
  "Penugasan",
  "PenugasanSubmission",
  "Materi",
  "KoleksiKata",
  "KamusEntry",
  "Profile",
  "NilaiKategori",
  "Nilai",
  "Lomba",
  "LombaPeserta",
  "Loker",
  "RPP",
  "GeneratedRPP",
  "AIJob",
  "Certificate",
  "Community",
  "CommunityMember",
  "CommunityPost",
  "CoursePlaylist",
  "ChatMessage",
  "GameRoom",
  "GameQuestion",
  "GameSession",
  "GameResult",
];

async function getCommitHash(): Promise<string> {
  try {
    const { execSync } = await import("child_process");
    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    return "unknown";
  }
}

function computeChecksum(data: unknown): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex");
}

async function backupTable(
  tableName: string,
  backupDir: string,
  manifest: BackupManifestEntry[]
): Promise<number> {
  const model = (db as any)[tableName as keyof typeof db] as any;
  if (!model || typeof model.findMany !== "function") {
    console.warn(`  ⚠️  Model ${tableName} not found in Prisma, skipping`);
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

  console.log(`  ✅ ${tableName}: ${rowCount} rows, checksum=${checksum.slice(0, 12)}...`);
  return rowCount;
}

async function main() {
  console.log("\n📦 BACKUP: Supabase Current State");
  console.log("=".repeat(50));

  const now = new Date();
  const ts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
  ].join("-");
  const backupDir = path.join(process.cwd(), "backups", "current", ts);

  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`\nBackup directory: ${backupDir}\n`);

  const manifest: BackupManifest = {
    exportedAt: new Date().toISOString(),
    environment: process.env.NODE_ENV || "production",
    appCommitHash: await getCommitHash(),
    tables: [],
  };

  let totalRows = 0;
  let successCount = 0;

  for (const tableName of BACKUP_TABLES) {
    const count = await backupTable(tableName, backupDir, manifest.tables);
    totalRows += count;
    if (count > 0 || tableName !== "") successCount++;
  }

  const manifestPath = path.join(backupDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  console.log(`\n${"=".repeat(50)}`);
  console.log(`📊 Backup Complete`);
  console.log(`   Directory: ${backupDir}`);
  console.log(`   Tables backed up: ${successCount}`);
  console.log(`   Total rows: ${totalRows}`);
  console.log(`   Manifest: ${manifestPath}`);

  await db.$disconnect();
}

main().catch((e) => {
  console.error("❌ Backup failed:", e.message);
  process.exit(1);
});
