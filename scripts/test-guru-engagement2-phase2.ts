// Unit test Fase "Guru Engagement 2.0 — Phase 2" — Real-time/Latest Guru Works
// & Social Motivation: feed "Guru Berkarya" sebagai aktivitas literasi sosial,
// karya terbaru guru lain (publishedAt DESC), penanda BARU, timestamp relatif,
// CTA motivasional (Artikel/Puisi → +50 XP), empty state, deep-link ?type=puisi,
// tanpa polling agresif, tanpa perubahan XP/Leaderboard engine.
// Tidak butuh koneksi DB (tes statis), additive-only.
import { readFileSync } from "fs";
import { join } from "path";

let fail = 0;
const ok = (label: string, cond: boolean) => {
  if (!cond) fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
};

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const api = read("app/api/guru/berkarya/route.ts");
const berkaryaUi = read("components/guru/GuruBerkarya.tsx");
const beranda = read("app/(dashboard)/guru/beranda/page.tsx");
const homeV3 = read("components/guru/TeacherHomeV3.tsx");
const artikelEditor = read("app/(dashboard)/guru/artikel/page.tsx");
const teacherXp = read("lib/gamification/teacher-xp.ts");
const leaderboardApi = read("app/api/guru/leaderboard/route.ts");
const rankCard = read("components/guru/GuruLeaderboardCard.tsx");

// ── 1. Urutan karya terbaru (publishedAt DESC) ──────────────────────────────
ok("API mengurutkan karya publishedAt menurun (NULLS LAST — tanpa inflasi NULL bertanggal NULL)", /publishedAt: \{ sort: "desc", nulls: "last" \}/.test(api));

// ── 2. Draft tidak tampil (hanya karya terbit) ──────────────────────────────
ok("API hanya menampilkan karya terbit (isPublished)", /isPublished: true/.test(api));
ok("API membatasi jumlah karya (take: limit)", /take: limit/.test(api));

// ── 3. Artikel terbit tampil ────────────────────────────────────────────────
ok("UI menampilkan badge Artikel", /Artikel/.test(berkaryaUi));
ok("UI memakai articleType untuk membedakan jenis", /articleType/.test(berkaryaUi));

// ── 4. Puisi terbit tampil ──────────────────────────────────────────────────
ok("UI menampilkan badge Puisi", /Puisi/.test(berkaryaUi));
ok("UI mendeteksi tipe PUISI (bukan POETRY)", /\(a\.articleType \|\| ""\)\.toUpperCase\(\) === "PUISI"/.test(berkaryaUi));

// ── 5. Penulis (author) tampil ──────────────────────────────────────────────
ok("API menyertakan author + profil sekolah", /author: \{[\s\S]*?profile: \{ select: \{ school: true \} \}/.test(api));
ok("UI menampilkan nama penulis", /a\.author\?\.fullName/.test(berkaryaUi));
ok("UI menampilkan asal sekolah penulis", /\.school/.test(berkaryaUi));

// ── 6. Timestamp relatif memakai publishedAt ────────────────────────────────
ok("Timestamp relatif memakai publishedAt", /waktuRelatif\(a\.publishedAt \|\| a\.createdAt\)/.test(berkaryaUi));
ok("waktu relatif menangani menit/jam/kemarin/hari", /menit lalu/.test(berkaryaUi) && /jam lalu/.test(berkaryaUi) && /kemarin/.test(berkaryaUi) && /hari lalu/.test(berkaryaUi));

// ── 7. Indikator BARU (≤24 jam) ─────────────────────────────────────────────
ok("Ada penanda karya BARU (adalahBaru)", /adalahBaru/.test(berkaryaUi));
ok("Syarat BARU = 24 jam", /24 \* 60 \* 60 \* 1000/.test(berkaryaUi));
ok("Badge BARU dirender saat kondisi terpenuhi", /Flame size=\{9\} \/> Baru/.test(berkaryaUi));

// ── 8. Empty state ──────────────────────────────────────────────────────────
ok("Empty state: teks Belum ada karya terbaru", /Belum ada karya terbaru\./.test(berkaryaUi));
ok("Empty state: ajakan jadi guru pertama", /Jadilah guru pertama yang berkarya hari ini\./.test(berkaryaUi));

// ── 9. CTA Artikel (href) ───────────────────────────────────────────────────
ok("CTA Buat Artikel menuju /guru/artikel", /href="\/guru\/artikel"/.test(berkaryaUi));

// ── 10. CTA Puisi (href + deep-link editor) ─────────────────────────────────
ok("CTA Buat Puisi menuju /guru/artikel?type=puisi", /href="\/guru\/artikel\?type=puisi"/.test(berkaryaUi));
ok("Editor artikel membaca query ?type=puisi", /params\.get\("type"\)/.test(artikelEditor) && /toLowerCase\(\) === "puisi"/.test(artikelEditor));

// ── 11. XP engine tidak berubah ─────────────────────────────────────────────
ok("XP engine guru tidak diubah (GURU_ARTIKEL 50)", /GURU_ARTIKEL: 50/.test(teacherXp));
ok("XP engine guru tidak diubah (GURU_PUISI 50)", /GURU_PUISI: 50/.test(teacherXp));

// ── 12. Leaderboard engine tidak berubah ────────────────────────────────────
ok("Leaderboard API tidak diubah (periode WEEKLY)", /WEEKLY/.test(leaderboardApi));
ok("LeaderboardCard tetap periode WEEKLY default", /useState<TeacherLeaderboardPeriod>\("WEEKLY"\)/.test(rankCard));

// ── 13. Tanpa polling agresif ───────────────────────────────────────────────
ok("GuruBerkarya tanpa polling/interval berulang", !/setInterval|setTimeout|refetch|polling/.test(berkaryaUi));

// ── Bonus: wiring & microcopy motivasional ──────────────────────────────────
ok("Beranda V3 memasang GuruBerkarya compact dengan misiStatus", /<GuruBerkarya misiStatus=\{misiStatus\} compact \/>/.test(homeV3) && /<TeacherHomeV3/.test(beranda));
ok("GuruBerkarya menerima prop misiStatus", /misiStatus\?: MisiGuruStatus \| null/.test(berkaryaUi));
ok("Microcopy CTA membaca misi artikel (sudah/sedang berkarya)", /m\.id === "artikel"/.test(berkaryaUi));
ok("CTA menampilkan XP riil dari GURU_XP_NILAI (via API meta, tanpa hardcode)", /\+{xp} XP/.test(berkaryaUi) && /meta\.xpArtikel/.test(berkaryaUi));
ok("Tautan Lihat Semua Karya menuju showcase /guru/karya", /Lihat Semua Karya/.test(berkaryaUi) && /href="\/guru\/karya"/.test(berkaryaUi));
ok("Microcopy kosmetik tanpa angka diarang (mengikuti misiStatus)", !/myRank|#\d+/.test(berkaryaUi));

if (fail > 0) {
  console.log(`\n${fail} tes GAGAL.`);
  process.exit(1);
}
console.log("\nSEMUA TES LULUS.");
process.exit(0);
