import sharp from "sharp";
import { statSync } from "node:fs";

const SRC = "/Users/user/BC-Bahasa Cerdas Master/Logo BC terbaru/Logo BC 2026";
const OUT = "public/brand";

// 1. Optimasi brand/*.png (tanpa mengubah dimensi/alpha — hanya kompresi + strip metadata)
const targets = [
  ["bahasacerdas-icon-transparent-BETA.png", "bc2026-icon.png"],
  ["bahasacerdas-logo-horizontal-light.png", "bc2026-logo-light.png"],
  ["bahasacerdas-logo-horizontal-dark.png", "bc2026-logo-dark.png"],
  ["bahasacerdas-icon-appicon-gradient.png", "bc2026-appicon.png"],
];
for (const [src, dst] of targets) {
  const before = statSync(`${SRC}/${src}`).size;
  await sharp(`${SRC}/${src}`)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(`${OUT}/${dst}`);
  const after = statSync(`${OUT}/${dst}`).size;
  console.log(`${dst}: ${(before/1024).toFixed(1)}KB -> ${(after/1024).toFixed(1)}KB`);
}

// 2. Favicon derivatives 32/48/64 (alpha dipertahankan)
for (const s of [32, 48, 64]) {
  await sharp(`${SRC}/bahasacerdas-icon-transparent-BETA.png`)
    .resize(s, s, { fit: "contain" })
    .png({ compressionLevel: 9 })
    .toFile(`${OUT}/bc2026-favicon-${s}.png`);
}
console.log("favicon 32/48/64 ok");

// 3. Regenerasi ikon root: square COVER (tanpa stretch) dari appicon-gradient
const square = async (size, path) => {
  await sharp(`${SRC}/bahasacerdas-icon-appicon-gradient.png`)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9 })
    .toFile(path);
};
await square(512, "public/icon-512.png");
await square(192, "public/icon-192.png");
await square(512, "public/icon-maskable-512.png");
await square(512, "public/arena-icon-512.png");
await square(192, "public/arena-icon-192.png");
await square(512, "public/arena-icon-maskable-512.png");
await square(180, "public/apple-touch-icon.png");
console.log("root icons regenerated (square cover)");
