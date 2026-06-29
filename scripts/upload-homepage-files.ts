import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import os from "os";

const db = new PrismaClient();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY!;

const COLORS = [
  ["#6366f1", "#4f46e5"], // indigo
  ["#8b5cf6", "#7c3aed"], // violet
  ["#ec4899", "#db2777"], // pink
  ["#14b8a6", "#0d9488"], // teal
  ["#f97316", "#ea580c"], // orange
  ["#eab308", "#ca8a04"], // yellow
];

async function uploadToSupabase(buffer: Buffer, fileName: string, bucket: string, contentType: string): Promise<string> {
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": contentType,
    },
    body: buffer,
  });
  if (!res.ok) throw new Error(`Upload ${fileName} failed: ${res.status} ${await res.text()}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
}

function splitIntoLines(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      lines.push(current.trim());
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

async function generateCoverImage(title: string, index: number): Promise<Buffer> {
  const [color1, color2] = COLORS[index % COLORS.length];
  const lines = splitIntoLines(title, 35);
  const fontSize = lines.length <= 2 ? 44 : lines.length <= 3 ? 36 : 28;
  const startY = 315 - ((lines.length - 1) * (fontSize * 0.6));
  const textLines = lines
    .map((line, i) => `<tspan x="60" dy="${i === 0 ? 0 : 1.5}em">${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</tspan>`)
    .join("");

  const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)" />
      <text x="60" y="${startY}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white">
        ${textLines}
      </text>
      <text x="60" y="560" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.7)">
        bahasacerdas.com
      </text>
    </svg>
  `;

  return sharp(Buffer.from(svg))
    .resize(1200, 630)
    .png()
    .toBuffer();
}

async function generateThumbnail(title: string, index: number): Promise<Buffer> {
  const [color1, color2] = COLORS[(index + 3) % COLORS.length];
  const lines = splitIntoLines(title, 22);
  const fontSize = lines.length <= 2 ? 24 : 20;
  const textY = 200 - ((lines.length - 1) * (fontSize * 0.7));
  const textLines = lines
    .map((line, i) =>
      `<tspan x="320" dy="${i === 0 ? 0 : 1.5}em">${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</tspan>`
    )
    .join("");

  const svg = `
    <svg width="640" height="360" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#bg)" />
      <circle cx="320" cy="180" r="50" fill="rgba(255,255,255,0.2)" />
      <polygon points="305,155 305,205 345,180" fill="white" />
      <text x="320" y="${textY}" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="white" text-anchor="middle">
        ${textLines}
      </text>
    </svg>
  `;

  return sharp(Buffer.from(svg))
    .resize(640, 360)
    .png()
    .toBuffer();
}

function generatePDF(title: string, description: string): Buffer {
  // Minimal valid PDF without pdfkit dependency to avoid issues
  const escapeText = (t: string) => t.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const lines = description.match(/.{1,80}/g) || [description];

  const objects: string[] = [];
  let objNum = 1;

  const addObj = (content: string) => {
    objects.push(`${objNum} 0 obj\n${content}\nendobj`);
    return objNum++;
  };

  const fontObj = addObj("<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>");
  const fontBoldObj = addObj("<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica-Bold\n>>");

  const pageContent = `BT
/F${fontBoldObj} 20 Tf
50 750 Td
(${escapeText(title.substring(0, 60))}) Tj
/F${fontObj} 11 Tf
50 720 Td
(${escapeText("BahasaCerdas.com — Homepage Content")}) Tj
${lines
  .map(
    (line, i) =>
      `BT\n/F${fontObj} 10 Tf\n50 ${700 - i * 15} Td\n(${escapeText(line.substring(0, 90))}) Tj\nET`
  )
  .join("\n")}
BT
/F${fontObj} 8 Tf
50 50 Td
(${escapeText(`Generated by BahasaCerdas — ${new Date().toISOString().substring(0, 10)}`)}) Tj
ET`;

  const pageObj = addObj(`<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n/Resources <<\n/Font <<\n/F${fontBoldObj} ${fontBoldObj} 0 R\n/F${fontObj} ${fontObj} 0 R\n>>\n>>\n>>`);
  const pagesObj = addObj(`<<\n/Type /Pages\n/Kids [${pageObj} 0 R]\n/Count 1\n>>`);
  const contentObj = addObj(`<<\n/Length ${Buffer.byteLength(pageContent, "utf8")}\n>>\nstream\n${pageContent}\nendstream`);
  const catalogObj = addObj(`<<\n/Type /Catalog\n/Pages ${pagesObj} 0 R\n>>`);

  const pdf = `%PDF-1.4
${objects.join("\n")}
xref
0 ${objNum}
0000000000 65535 f 
${objects
  .map((_, i) => {
    let offset = 9;
    for (let j = 0; j < i; j++) offset += objects[j].length + 2;
    return `${String(offset).padStart(10, "0")} 00000 n`;
  })
  .join("\n")}
trailer
<<\n/Size ${objNum}\n/Root ${catalogObj} 0 R\n>>
startxref
${objects.reduce((sum, o) => sum + o.length + 2, 9)}
%%EOF`;

  return Buffer.from(pdf, "utf8");
}

const YOUTUBE_IDS: Record<string, string> = {
  "Belajar Menulis Puisi untuk Pemula": "XeVrR85-PbU",
  "Bedah Buku: Ronggeng Dukuh Paruk Karya Ahmad Tohari": "2tHZkKWfok4",
  "Tips Menjawab Soal TKA Bahasa Indonesia dengan Cepat": "OivyYZH6YQE",
  "Cara Membaca Cepat untuk Memahami Teks Eksplanasi": "uQ_kJHcFo7c",
  "Praktik Baik: Mengajar Teks Prosedur dengan Media Infografis": "3nNF-YgTMto",
  "Webinar: Implementasi Kurikulum Merdeka dalam Pembelajaran Bahasa Indonesia": "ldCM4ndy8tQ",
};

async function main() {
  console.log("Uploading homepage files to Supabase Storage...\n");

  // 1. Upload article cover images
  const artikelList = await db.artikel.findMany({ select: { id: true, title: true, coverImage: true } });
  console.log(`\n--- Articles (${artikelList.length}) ---`);
  for (let i = 0; i < artikelList.length; i++) {
    const a = artikelList[i];
    if (a.coverImage) {
      console.log(`  SKIP ${a.title.substring(0, 40)}... — already has coverImage`);
      continue;
    }
    const safeName = a.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || `artikel-${i}`;
    const fileName = `homepage/artikel/${safeName}-${Date.now()}.png`;
    try {
      const img = await generateCoverImage(a.title, i);
      const url = await uploadToSupabase(img, fileName, "images", "image/png");
      await db.artikel.update({ where: { id: a.id }, data: { coverImage: url } });
      console.log(`  ✓ ${a.title.substring(0, 40)}...`);
    } catch (e: any) {
      console.log(`  ✗ ${a.title.substring(0, 40)}... — ${e.message}`);
    }
  }

  // 2. Upload video thumbnails + fix YouTube URLs
  const videoList = await db.video.findMany({ select: { id: true, title: true, videoUrl: true, thumbnailUrl: true } });
  console.log(`\n--- Videos (${videoList.length}) ---`);
  for (let i = 0; i < videoList.length; i++) {
    const v = videoList[i];
    let updated = false;

    // Fix YouTube URL
    if (v.videoUrl.includes("dQw4w9WgXcQ")) {
      const realId = YOUTUBE_IDS[v.title];
      if (realId) {
        await db.video.update({
          where: { id: v.id },
          data: { videoUrl: `https://www.youtube.com/watch?v=${realId}` },
        });
        console.log(`  ✓ URL fixed: ${v.title.substring(0, 40)}... → ${realId}`);
        updated = true;
      }
    }

    // Upload thumbnail
    if (!v.thumbnailUrl) {
      const safeName = v.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || `video-${i}`;
      const fileName = `homepage/video/${safeName}-${Date.now()}.png`;
      try {
        const img = await generateThumbnail(v.title, i);
        const url = await uploadToSupabase(img, fileName, "images", "image/png");
        await db.video.update({ where: { id: v.id }, data: { thumbnailUrl: url } });
        console.log(`  ✓ Thumbnail: ${v.title.substring(0, 40)}...`);
        updated = true;
      } catch (e: any) {
        console.log(`  ✗ Thumbnail ${v.title.substring(0, 40)}... — ${e.message}`);
      }
    }

    if (!updated) {
      console.log(`  SKIP ${v.title.substring(0, 40)}...`);
    }
  }

  // 3. Upload karya files (PDFs)
  const karyaList = await db.karya.findMany({ select: { id: true, title: true, description: true, fileUrl: true } });
  console.log(`\n--- Karya (${karyaList.length}) ---`);
  for (let i = 0; i < karyaList.length; i++) {
    const k = karyaList[i];
    if (k.fileUrl && !k.fileUrl.includes("example.com")) {
      console.log(`  SKIP ${k.title.substring(0, 40)}... — already has real file`);
      continue;
    }
    const safeName = k.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || `karya-${i}`;
    const fileName = `homepage/karya/${safeName}-${Date.now()}.pdf`;
    try {
      const pdf = generatePDF(k.title, k.description || `Dokumen ${k.title} — BahasaCerdas.com`);
      const url = await uploadToSupabase(pdf, fileName, "documents", "application/pdf");
      await db.karya.update({ where: { id: k.id }, data: { fileUrl: url, fileType: "PDF" } });
      console.log(`  ✓ ${k.title.substring(0, 40)}...`);
    } catch (e: any) {
      console.log(`  ✗ ${k.title.substring(0, 40)}... — ${e.message}`);
    }
  }

  console.log("\n✓ Upload complete!");
  await db.$disconnect();
}

main().catch((e) => {
  console.error("Failed:", e);
  db.$disconnect();
  process.exit(1);
});
