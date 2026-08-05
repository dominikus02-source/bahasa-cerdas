// Generator banner promo landing page → /public/landing/banner-*.webp
// Jalankan: npx tsx scripts/generate-landing-banners.ts
// Membuat 5 banner 960x720 (4:3) full gradient + emblem — tanpa external URL.
import sharp from "sharp";
import fs from "node:fs";

const OUT_DIR = "public/landing";

const banners: {
  file: string;
  from: string;
  to: string;
  accent: string;
  emoji: string;
  word: string;
  tagline: string;
}[] = [
  { file: "banner-1", from: "#7c3aed", to: "#6366f1", accent: "#ffd24a", emoji: "🎁", word: "Guru Pro", tagline: "Rp 1.000/bulan selama 1 tahun" },
  { file: "banner-2", from: "#4f46e5", to: "#9333ea", accent: "#22d3ee", emoji: "🚀", word: "Masuk Arena", tagline: "Belajar sambil main" },
  { file: "banner-3", from: "#059669", to: "#0d9488", accent: "#fbbf24", emoji: "📚", word: "Simulasi UKBI & TKA", tagline: "SD sampai UTBK" },
  { file: "banner-4", from: "#f59e0b", to: "#e11d48", accent: "#ffffff", emoji: "✍️", word: "Lomba Menulis", tagline: "Tulis karya, kumpulkan koin" },
  { file: "banner-5", from: "#0284c7", to: "#4f46e5", accent: "#86efac", emoji: "📰", word: "Tips & Artikel", tagline: "Dari para ahli Bahasa" },
];

function svg(b: (typeof banners)[number]): string {
  const { from, to, accent, emoji, word: rawWord, tagline } = b;
  const word = rawWord.replaceAll("&", "&amp;");
  return `
  <svg width="960" height="720" viewBox="0 0 960 720" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${from}"/>
        <stop offset="100%" stop-color="${to}"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.20"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="960" height="720" fill="url(#bg)"/>
    <circle cx="850" cy="60" r="250" fill="url(#glow)"/>
    <circle cx="-40" cy="660" r="210" fill="url(#glow)"/>
    <circle cx="150" cy="110" r="170" fill="url(#glow)"/>
    <circle cx="820" cy="620" r="120" fill="url(#glow)"/>
    <g fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="10">
      <circle cx="120" cy="540" r="70"/>
      <circle cx="120" cy="540" r="105"/>
    </g>
    <g fill="#ffffff" fill-opacity="0.22">
      <rect x="700" y="180" width="46" height="46" rx="12" transform="rotate(20 723 203)"/>
      <rect x="760" y="160" width="22" height="22" rx="7" transform="rotate(-15 771 171)"/>
      <circle cx="240" cy="300" r="16"/>
      <rect x="160" y="500" width="30" height="30" rx="9" transform="rotate(35 175 515)"/>
    </g>
    <text x="480" y="128" text-anchor="middle" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif" font-weight="800" font-size="64" fill="#ffffff" opacity="0.97">${word}</text>
    <text x="480" y="196" text-anchor="middle" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif" font-weight="600" font-size="30" fill="#ffffff" opacity="0.75">${tagline}</text>
    <rect x="340" y="330" width="280" height="230" rx="56" fill="#ffffff" fill-opacity="0.16" stroke="#ffffff" stroke-opacity="0.35" stroke-width="4"/>
    <text x="480" y="485" text-anchor="middle" font-size="190">${emoji}</text>
    <g>
      <rect x="66" y="612" width="210" height="44" rx="22" fill="${accent}" fill-opacity="0.92"/>
      <text x="171" y="642" text-anchor="middle" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif" font-weight="800" font-size="24" fill="#1f2937">BahasaCerdas</text>
    </g>
  </svg>`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const b of banners) {
    const file = `${OUT_DIR}/${b.file}.webp`;
    await sharp(Buffer.from(svg(b))).webp({ quality: 82 }).toFile(file);
    console.log(`✓ ${file}`);
  }
  console.log("\nSelesai. Banner siap di /public/landing/.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});