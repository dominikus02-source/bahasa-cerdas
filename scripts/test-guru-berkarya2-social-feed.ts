// Unit test Fase "Guru Berkarya 2.0 — Social Feed" (Latest Works + Social Feed):
// feed Guru Berkarya sebagai mini social feed guru (Artikel + Puisi) dengan:
//   • Karya TERBARU duluan (publishedAt DESC), BUKAN popularitas.
//   • Current user SELALU tampil (fix root cause excludeMe) + penanda "Karya Anda".
//   • Bounded feed (~6 kartu), tanpa N+1, tanpa draft bocor.
//   • Like/Komentar = GAP terdocumented (tidak ada infra Artikel); Share = EXISTING
//     (ShareButton + route /artikel/[slug]) — reuse.
//   • XP footer riil dari GURU_XP_NILAI via API meta (tanpa hardcode).
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
const detailPage = read("app/artikel/[slug]/page.tsx");
const shareBtn = read("components/shared/ShareButton.tsx");
const artikelEditor = read("app/(dashboard)/guru/artikel/page.tsx");
const teacherXp = read("lib/gamification/teacher-xp.ts");

// ── 1. ROOT CAUSE FIX: karya sendiri tampil ────────────────────────────────
ok("TEST 1: API TIDAK lagi mengecualikan diri sendiri (excludeMe dihapus)", !/excludeMe/.test(api));
ok("TEST 2: API mengembalikan currentUserId (untuk penanda Karya Anda)", /currentUserId: user\.id/.test(api));
ok("TEST 3: Artikel milik current user tampil (authorId TIDAK di-not-kan)", !/authorId:\s*\{\s*not:\s*user\.id/.test(api));

// ── 2. Urutan & batasan feed ───────────────────────────────────────────────
ok("TEST 4: Urutan karya TERBARU dulu (publishedAt DESC, NULLS LAST — artikel tanpa tanggal terbit tidak menempel di atas)", /publishedAt: \{ sort: "desc", nulls: "last" \}/.test(api));
ok("TEST 5: Popularitas TIDAK membatalkan kebaruan (tanpa orderBy readCount)", !/orderBy:\s*\[\{\s*readCount/.test(api) && !/orderBy:\s*\[\{\s*views/.test(api));
ok("TEST 6: Feed dibatasi (take: limit) — bounded, tanpa N+1", /take: limit/.test(api));
ok("TEST 7: Hanya karya terbit (isPublished: true)", /isPublished: true/.test(api));
ok("TEST 8: Hanya penulis guru/admin/founder", /role: "GURU"/.test(api) && /role: "ADMIN"/.test(api) && /isFounder: true/.test(api));
ok("TEST 9: API role-gated (getUser + isTeacherOrStudent)", /getUser\(\)/.test(api) && /isTeacherOrStudent\(user\)/.test(api));

// ── 3. XP riil dari GURU_XP_NILAI (tanpa hardcode) ─────────────────────────
ok("TEST 10: API menyuntik meta XP dari GURU_XP_NILAI", /GURU_XP_NILAI\.GURU_ARTIKEL/.test(api) && /GURU_XP_NILAI\.GURU_PUISI/.test(api));
ok("TEST 11: UI memakai meta.xpArtikel/meta.xpPuisi (bukan angka hardcode)", /meta\.xpArtikel/.test(berkaryaUi) && /meta\.xpPuisi/.test(berkaryaUi));
ok("TEST 12: TombolKarya merender XP dinamis (+{xp} XP)", /\+{xp} XP/.test(berkaryaUi));

// ── 4. Kartu sosial: penulis, sekolah, jenis, waktu ─────────────────────────
ok("TEST 13: Kartu menampilkan penanda Karya Anda (currentUserId)", /karyaAnda/.test(berkaryaUi) && /currentUserId/.test(berkaryaUi) && /✨ Karya Anda/.test(berkaryaUi));
ok("TEST 14: Kartu menampilkan nama penulis", /a\.author\?\.fullName/.test(berkaryaUi));
ok("TEST 15: Kartu menampilkan asal sekolah", /\.school/.test(berkaryaUi));
ok("TEST 16: Jenis puisi dideteksi dari articleType", /\(a\.articleType \|\| ""\)\.toUpperCase\(\) === "PUISI"/.test(berkaryaUi));
ok("TEST 17: Badge Artikel & Puisi dirender", /Artikel/.test(berkaryaUi) && /Puisi/.test(berkaryaUi));
ok("TEST 18: Waktu relatif memakai publishedAt || createdAt", /waktuRelatif\(a\.publishedAt \|\| a\.createdAt\)/.test(berkaryaUi));

// ── 5. Penanda BARU (≤ 24 jam, berbasis publishedAt) ───────────────────────
ok("TEST 19: Badge BARU memakai adalahBaru dengan jendela 24 jam", /adalahBaru/.test(berkaryaUi) && /24 \* 60 \* 60 \* 1000/.test(berkaryaUi));
ok("TEST 20: Badge BARU dirender", /Flame size=\{9\} \/> Baru/.test(berkaryaUi));

// ── 6. Share = EXISTING (reuse), Like/Komentar = GAP documented ────────────
ok("TEST 21: Kartu memakai ShareButton (bagikan) menuju /artikel/{slug}", /ShareButton/.test(berkaryaUi) && /url=\{`\/artikel\/\$\{a\.slug\}`\}/.test(berkaryaUi));
ok("TEST 22: ShareButton memakai navigator.share + fallback (copy/WA/email)", /navigator\.share/.test(shareBtn) && /wa\.me/.test(shareBtn) && /mailto/.test(shareBtn));
ok("TEST 23: Detail route publik ada (target tautan karya)", /revalidate = 600/.test(detailPage) && /isPublished: true/.test(detailPage));

// ── 7. Empty state, CTA, tanpa polling ─────────────────────────────────────
ok("TEST 24: Empty state — Belum ada karya terbaru + ajakan pertama berkarya", /Belum ada karya terbaru\./.test(berkaryaUi) && /Jadilah guru pertama yang berkarya hari ini\./.test(berkaryaUi));
ok("TEST 25: CTA Buat Artikel & Buat Puisi (deep-link ?type=puisi)", /href="\/guru\/artikel"/.test(berkaryaUi) && /href="\/guru\/artikel\?type=puisi"/.test(berkaryaUi));
ok("TEST 26: Tanpa polling berulang (fetch sekali, cache no-store)", !/setInterval|setTimeout|refetch|polling/.test(berkaryaUi) && /cache: "no-store"/.test(berkaryaUi));

// ── 8. Keamanan: tanpa bocor draft/konten penuh ────────────────────────────
ok("TEST 27: Feed TIDAK mengekspos konten penuh artikel", !/content: true/.test(api));
ok("TEST 28: Feed TIDAK mengekspos draft (isPublished menjadi pagar)", /isPublished: true/.test(api) && !/isPublished:\s*false/.test(api));

// ── 9. Editor tetap satu alur publikasi (SSOT isPublished) ─────────────────
ok("TEST 29: Editor menyimpan articleType (PUISI/ARTIKEL)", /articleType/.test(artikelEditor));
ok("TEST 30: XP literasi tetap 1 pintu (awardGuruLiterasiPublish di lib/guru)", /awardGuruLiterasiPublish/.test(read("lib/guru/literasi-xp.ts")));
ok("TEST 31: GURU_XP_NILAI berisi nilai Artikel & Puisi (sumber meta)", /GURU_ARTIKEL: 50/.test(teacherXp) && /GURU_PUISI: 50/.test(teacherXp));

// ── 10. REAL-WORLD REGRESSION ACCEPTANCE — Skenario founder ────────────────
// Skenario: Guru A membuat artikel → terbit → kembali ke dashboard →
// karyanya TAMPIL di Guru Berkarya → ditandai "Karya Anda".
// Karena suite ini statis (tanpa DB), kita buktikan rantai kode yang membuat
// skenario itu benar: (a) publish menandai isPublished+publishedAt,
// (b) feed query tidak menyaring authorId diri, (c) urutan publishedAt DESC
// menaruh karya baru di atas, (d) UI menandai karya sendiri.
console.log("\n── REAL-WORLD REGRESSION ACCEPTANCE (rantai kode skenario founder) ──");
const editorRoute = read("app/api/guru/artikel/route.ts");
ok("RA-1: Publikasi guru menandai isPublished: true", /isPublished: true/.test(editorRoute));
ok("RA-2: Publikasi menandai publishedAt (dasar urutan feed)", /publishedAt/.test(editorRoute));
ok("RA-3: Feed tidak menyaring authorId = diri sendiri (karya Guru A masuk)", !/authorId:\s*\{\s*not:\s*user\.id/.test(api));
ok("RA-4: Feed menaruh karya baru (publishedAt terbaru) di posisi teratas (NULLS LAST)", /publishedAt: \{ sort: "desc", nulls: "last" \}/.test(api));
ok("RA-5: UI menandai karya Guru A sebagai Karya Anda", /karyaAnda/.test(berkaryaUi) && /a\.author\.id === currentUserId/.test(berkaryaUi));
ok("RA-6: Bounded feed — take 6 dari frontend, default 8 server", /take: limit/.test(api) && /limit=6/.test(berkaryaUi));

// ── Ringkasan ──────────────────────────────────────────────────────────────
console.log(`\n${fail === 0 ? "SEMUA LULUS" : `${fail} GAGAL`}  (total asersi: 37)`);
process.exit(fail === 0 ? 0 : 1);
