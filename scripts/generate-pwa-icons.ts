import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

// Generator ikon PWA Arena — dari 1 gambar sumber menghasilkan semua ukuran
// yang dibutuhkan Android/iOS. Jalankan ulang setiap ganti desain:
//   npx tsx scripts/generate-pwa-icons.ts [path-sumber.png]
// Sumber default: public/BC-logo.png

const SOURCE = process.argv[2] || "public/BC-logo.png";
const BRAND_BG = "#7c3aed"; // ungu violet — tema Arena
const OUT: { file: string; size: number; mode: "any" | "maskable" | "apple" }[] = [
  { file: "public/icon-192.png", size: 192, mode: "any" },
  { file: "public/icon-512.png", size: 512, mode: "any" },
  { file: "public/icon-maskable-512.png", size: 512, mode: "maskable" },
  { file: "public/apple-touch-icon.png", size: 180, mode: "apple" },
];

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Sumber tidak ditemukan: ${SOURCE}`);
    process.exit(1);
  }

  const meta = await sharp(SOURCE).metadata();
  if (!meta.width || !meta.height) {
    console.error("Gambar sumber tidak valid.");
    process.exit(1);
  }
  const sourceHasAlpha = meta.hasAlpha === true;

  // Potong border seragam (umumnya logo di atas latar putih) supaya mark
  // logo mengisi ikon, bukan terlihat kecil di tengah latar.
  const trimmed = sharp(SOURCE).trim({ threshold: 10 });

  for (const out of OUT) {
    let img = trimmed.clone();
    if (out.mode === "maskable") {
      if (sourceHasAlpha) {
        // Sumber transparan: latar warna penuh, logo ~68% di tengah (safe zone 80%).
        const logo = await sharp(SOURCE).trim({ threshold: 10 })
          .resize(Math.round(out.size * 0.68), Math.round(out.size * 0.68), { fit: "contain" })
          .toBuffer();
        img = sharp({
          create: { width: out.size, height: out.size, channels: 4, background: BRAND_BG },
        }).composite([{ input: logo, gravity: "center" }]);
      } else {
        // Sumber sudah icon penuh (opaque): full-bleed — elemen kunci harus
        // sudah berada dalam safe zone 80% di desain aslinya.
        img = img.resize(out.size, out.size, { fit: "cover" });
      }
    } else if (out.mode === "apple") {
      // iOS tidak mendukung transparansi — flatten ke latar putih.
      img = img.resize(out.size, out.size, { fit: "contain" }).flatten({ background: "#ffffff" });
    } else {
      img = img.resize(out.size, out.size, { fit: "contain" });
    }
    await img.png().toFile(out.file);
    console.log(`✓ ${out.file} (${out.size}x${out.size}, ${out.mode})`);
  }

  console.log("\nSelesai. File ikon siap — jangan lupa: user iOS perlu hapus & add ulang shortcut homescreen.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
