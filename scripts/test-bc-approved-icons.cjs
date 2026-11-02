// Regression guard for the eight user-approved, individually cropped PNG assets.
// This checks file integrity and canonical mapping without altering any pixels.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const assets = {
  jumpa: "01_video-meeting.png",
  nara: "02_ai-chatbot.png",
  aksara: "03_menulis-buku.png",
  "toko-karya": "04_belanja-bintang.png",
  gim: "05_game.png",
  "jalur-cerdas": "06_level-progres.png",
  bigt: "07_checklist.png",
  komunitas: "08_komunitas.png",
};
const source = fs.readFileSync("components/shared/FeatureIcons.tsx", "utf8");
for (const [key, filename] of Object.entries(assets)) {
  const filepath = path.join("public", "feature-icons", filename);
  assert.ok(fs.existsSync(filepath), `Icon missing: ${filepath}`);
  const bytes = fs.readFileSync(filepath);
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `Invalid PNG: ${filename}`);
  const w = bytes.readUInt32BE(16), h = bytes.readUInt32BE(20);
  assert.ok(w >= 300 && h >= 300 && w <= 1024 && h <= 1024, `Unexpected icon dimensions: ${filename} ${w}x${h}`);
  assert.ok(source.includes(`"${filename}"`), `Icon not mapped: ${key}`);
  console.log(`OK ${key.padEnd(13)} ${w}x${h}`);
}
const expectedUsage = [
  ["app/umum/page.tsx", "PRODUCT_TILE"],
  ["components/landing/FiturUnggulanSection.tsx", "FeatureIcons"],
  ["components/landing/StudentSection.tsx", "FeatureIcons"],
  ["components/landing/TeacherSection.tsx", "FeatureIcons"],
  ["components/landing/KomunitasSection.tsx", "FeatureIcons"],
  ["components/student-home/RuangBelajarSection.tsx", "FeatureIcons"],
  ["components/guru/TeacherHomeV3.tsx", "FeatureIcons"],
];
for (const [file, text] of expectedUsage) {
  assert.ok(fs.readFileSync(file, "utf8").includes(text), `BC icon integration missing in ${file}`);
}
console.log("BC feature icon assets and integration: PASS");
