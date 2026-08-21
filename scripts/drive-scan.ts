/**
 * Google Drive recursive folder scanner for Alat Ajar BC Master ingestion.
 *
 * Run:
 *   npx tsx scripts/drive-scan.ts
 *
 * Scans all 12 source folders, builds inventory JSON.
 * Requires token.json from drive-auth.ts (run that first).
 */

import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

const CREDENTIALS_PATH = path.resolve(
  process.env.GOOGLE_OAUTH_CLIENT_PATH || "credentials/google-oauth-client.json"
);
const TOKEN_PATH = path.resolve("credentials/google-oauth-token.json");
const OUTPUT_DIR = path.resolve("data/alat-ajar-import");
const INVENTORY_PATH = path.join(OUTPUT_DIR, "inventory.json");

const SOURCE_FOLDERS = [
  { grade: "1", educationLevel: "SD", folderId: "1rLjTr2CGP1tp0U-7TqWonF8rlWraiIWx" },
  { grade: "2", educationLevel: "SD", folderId: "1gjjg_uzPmL7WpYvnyqnnpKau7BMH3MCe" },
  { grade: "3", educationLevel: "SD", folderId: "1XhaIuxzd9PBsSn9wFnP2VCZxhgkHGfcX" },
  { grade: "4", educationLevel: "SD", folderId: "1KAHDCvmA4T8N8JPrueRzO2d_ssBKr9vP" },
  { grade: "5", educationLevel: "SD", folderId: "1AO3dECTqvzP8c52jCWpbHvMzAhwoBaB_" },
  { grade: "6", educationLevel: "SD", folderId: "1ipzb4JlAlCcADMJOZ8xw8XDfieh2hN0w" },
  { grade: "7", educationLevel: "SMP", folderId: "1gOyyoWpioReO189M6reHinHIrHlUHq4a" },
  { grade: "8", educationLevel: "SMP", folderId: "1enquQDrEFNv7NNb-xED8z8-d1RPE1CVx" },
  { grade: "9", educationLevel: "SMP", folderId: "1fxf00CQXTyEWLLOg30Zs5Ni-Ny0f_OJH" },
  { grade: "10", educationLevel: "SMA", folderId: "1iJXa_urvMFY7IZrcomxGhKkxZ6EiCi8U" },
  { grade: "11", educationLevel: "SMA", folderId: "1ijgMhU046fT_LNT4orgtLIs35c8mIFEf" },
  { grade: "12", educationLevel: "SMA", folderId: "1mhXgN2SqhNe_ZFXDIIOC2Nanx7gqG0X9" },
];

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  parents?: string[];
}

interface InventoryEntry {
  sourceDriveFileId: string;
  sourceDriveFolderId: string;
  sourceFileName: string;
  mimeType: string;
  fileSize: string;
  modifiedTime: string;
  sourcePath: string;
  sourceUrl: string;
  detectedExtension: string;
  educationLevel: string;
  grade: string;
  parentSubjectFolder: string;
}

function getExtension(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  return ext || "(none)";
}

function getMimeTypeLabel(mime: string): string {
  const map: Record<string, string> = {
    "application/pdf": "PDF",
    "application/vnd.google-apps.document": "Google Docs",
    "application/vnd.google-apps.spreadsheet": "Google Sheets",
    "application/vnd.google-apps.presentation": "Google Slides",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
    "application/msword": "DOC",
    "application/vnd.ms-powerpoint": "PPT",
    "application/vnd.ms-excel": "XLS",
    "application/zip": "ZIP",
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "image/gif": "GIF",
  };
  return map[mime] || mime.split("/").pop() || "UNKNOWN";
}

async function getAuth() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(`Credentials not found at ${CREDENTIALS_PATH}. Run drive-auth.ts first.`);
  }
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error(`Token not found at ${TOKEN_PATH}. Run drive-auth.ts first.`);
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8"));
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
  const { client_id, client_secret } = credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret);
  oAuth2Client.setCredentials(token);

  // Auto-refresh: save updated token
  oAuth2Client.on("tokens", (newToken) => {
    const existing = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
    fs.writeFileSync(TOKEN_PATH, JSON.stringify({ ...existing, ...newToken }, null, 2));
  });

  return oAuth2Client;
}

async function listFolder(
  drive: ReturnType<typeof google.drive>,
  folderId: string,
  depth: number = 0
): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, parents)",
      pageSize: 100,
      pageToken,
      orderBy: "name",
    });

    if (res.data.files) {
      files.push(...res.data.files);
    }
    pageToken = res.data.nextPageToken || undefined;

    // Rate limit: 2 req/sec max for free tier
    await new Promise((r) => setTimeout(r, 500));
  } while (pageToken);

  return files;
}

async function scanFolderRecursive(
  drive: ReturnType<typeof google.drive>,
  folderId: string,
  parentPath: string,
  educationLevel: string,
  grade: string,
  subjectFolder: string,
  depth: number = 0
): Promise<InventoryEntry[]> {
  const entries: InventoryEntry[] = [];
  const items = await listFolder(drive, folderId);

  for (const item of items) {
    const itemPath = parentPath ? `${parentPath}/${item.name}` : item.name;

    if (item.mimeType === "application/vnd.google-apps.folder") {
      // Determine subject folder name at depth 1
      const newSubject = depth === 0 ? item.name : subjectFolder;

      const subEntries = await scanFolderRecursive(
        drive,
        item.id,
        itemPath,
        educationLevel,
        grade,
        newSubject,
        depth + 1
      );
      entries.push(...subEntries);
    } else {
      // It's a file
      entries.push({
        sourceDriveFileId: item.id,
        sourceDriveFolderId: folderId,
        sourceFileName: item.name,
        mimeType: item.mimeType,
        fileSize: item.size || "0",
        modifiedTime: item.modifiedTime || "",
        sourcePath: itemPath,
        sourceUrl: item.webViewLink || `https://drive.google.com/file/d/${item.id}`,
        detectedExtension: getExtension(item.name),
        educationLevel,
        grade,
        parentSubjectFolder: subjectFolder,
      });
    }
  }

  return entries;
}

async function main() {
  const auth = await getAuth();
  const drive = google.drive({ version: "v3", auth });

  // Verify access
  const about = await drive.about.get({ fields: "user" });
  console.log(`\n🔑 Authenticated as: ${about.data.user?.displayName} (${about.data.user?.emailAddress})`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Load existing inventory for idempotent append
  let allEntries: InventoryEntry[] = [];
  if (fs.existsSync(INVENTORY_PATH)) {
    allEntries = JSON.parse(fs.readFileSync(INVENTORY_PATH, "utf-8"));
    console.log(`📦 Loaded ${allEntries.length} existing entries`);
  }

  const existingIds = new Set(allEntries.map((e) => e.sourceDriveFileId));
  let scannedFiles = 0;
  let newFiles = 0;
  let errors = 0;

  console.log("\n📂 Scanning 12 source folders...\n");

  for (const folder of SOURCE_FOLDERS) {
    console.log(`━━━ ${folder.educationLevel} Kelas ${folder.grade} ━━━`);

    try {
      const entries = await scanFolderRecursive(
        drive,
        folder.folderId,
        "",
        folder.educationLevel,
        folder.grade,
        ""
      );

      let folderNew = 0;
      for (const entry of entries) {
        scannedFiles++;
        if (!existingIds.has(entry.sourceDriveFileId)) {
          allEntries.push(entry);
          existingIds.add(entry.sourceDriveFileId);
          folderNew++;
          newFiles++;
        }
      }

      console.log(
        `   ✅ ${entries.length} files (${folderNew} new)`
      );

      // Save progress after each folder (idempotent)
      fs.writeFileSync(INVENTORY_PATH, JSON.stringify(allEntries, null, 2));

    } catch (err: any) {
      errors++;
      console.log(`   ❌ Error: ${err.message}`);
    }
  }

  // Summary
  console.log("\n" + "━".repeat(50));
  console.log("📊 INVENTORY SUMMARY");
  console.log("━".repeat(50));
  console.log(`Total files scanned: ${scannedFiles}`);
  console.log(`New entries added:   ${newFiles}`);
  console.log(`Total in inventory: ${allEntries.length}`);
  console.log(`Errors:             ${errors}`);
  console.log(`Output:             ${INVENTORY_PATH}`);

  // Type breakdown
  const mimeBreakdown: Record<string, number> = {};
  const levelBreakdown: Record<string, number> = {};
  const gradeBreakdown: Record<string, number> = {};
  const extBreakdown: Record<string, number> = {};

  for (const entry of allEntries) {
    const label = getMimeTypeLabel(entry.mimeType);
    mimeBreakdown[label] = (mimeBreakdown[label] || 0) + 1;
    levelBreakdown[entry.educationLevel] = (levelBreakdown[entry.educationLevel] || 0) + 1;
    gradeBreakdown[`${entry.educationLevel} ${entry.grade}`] =
      (gradeBreakdown[`${entry.educationLevel} ${entry.grade}`] || 0) + 1;
    extBreakdown[entry.detectedExtension] = (extBreakdown[entry.detectedExtension] || 0) + 1;
  }

  console.log("\n📁 By MIME type:");
  for (const [k, v] of Object.entries(mimeBreakdown).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${k}: ${v}`);
  }

  console.log("\n🎓 By education level:");
  for (const [k, v] of Object.entries(levelBreakdown).sort()) {
    console.log(`   ${k}: ${v}`);
  }

  console.log("\n📚 By grade:");
  for (const [k, v] of Object.entries(gradeBreakdown).sort()) {
    console.log(`   ${k}: ${v}`);
  }

  console.log("\n📎 By extension:");
  for (const [k, v] of Object.entries(extBreakdown).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${k}: ${v}`);
  }
}

main().catch((err) => {
  console.error("❌ Fatal error:", err.message);
  process.exit(1);
});
