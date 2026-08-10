// Unit test Fase "Guru Berkarya 2.1 — Social Interaction":
// like + komentar untuk Artikel/Puisi guru (model ArtikelLike + ArtikelComment,
// additive-only) dengan aturan:
//   • Like idempotent (POST=like, DELETE=unlike, keduanya aman diulang).
//   • Komentar divalidasi (trim, min 1, max 1000) + sanitize sesuai konvensi.
//   • Hanya pemilik komentar atau moderasi (ADMIN/founder) yang hapus.
//   • TIDAK ada XP/koin/notifikasi untuk like/komentar (XP tetap milik kreasi).
//   • Feed membawa likeCount/commentCount/likedByCurrentUser riil tanpa N+1.
//   • Feed TIDAK eager-fetch komentar (lazy saat panel dibuka), tanpa reload.
//   • Regresi 2.0: karya sendiri tetap tampil ("✨ Karya Anda"), Share tetap ada.
//   • ROOT CAUSE FIX: query dasar feed hanya menyentuh Artikel/User/Profile
//     (tabel selalu ada) — enrichment sosial best-effort (try/catch) sehingga
//     feed tetap tampil walau tabel ArtikelLike/ArtikelComment belum ada
//     (migrasi manual belum di-apply). Error API ≠ empty feed (state error).
// Tidak butuh koneksi DB (tes statis), additive-only.
import { readFileSync } from "fs";
import { join } from "path";

let fail = 0;
const ok = (label: string, cond: boolean) => {
  if (!cond) fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
};

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const feedApi = read("app/api/guru/berkarya/route.ts");
const artikelApi = read("app/api/guru/artikel/route.ts");
const likeApi = read("app/api/guru/berkarya/[id]/like/route.ts");
const commentsApi = read("app/api/guru/berkarya/[id]/comments/route.ts");
const commentDeleteApi = read("app/api/guru/berkarya/[id]/comments/[commentId]/route.ts");
const berkaryaUi = read("components/guru/GuruBerkarya.tsx");
const commentsUi = read("components/guru/GuruBerkaryaComments.tsx");
const migration = read("prisma/migrations/manual/2026-08-08_guru_berkarya_social.sql");
const schema = read("prisma/schema.prisma");
const teacherXp = read("lib/gamification/teacher-xp.ts");
const validations = read("lib/validations.ts");

// ── 1. AUTENTIKASI & OTORISASI ──────────────────────────────────────────────
ok("TEST 1: POST like tanpa login → 401", /if \(!user\) return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\)/.test(likeApi));
ok("TEST 2: GET komentar tanpa login → 401", /if \(!user\) return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\)/.test(commentsApi));
ok("TEST 3: POST komentar tanpa login → 401", /if \(!user\) return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\)/.test(commentsApi));
ok("TEST 4: DELETE komentar tanpa login → 401", /if \(!user\) return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\)/.test(commentDeleteApi));
ok("TEST 5: Semua route role-gated guru/founder (getUser + isTeacherOrStudent)", ["likeApi", "commentsApi", "commentDeleteApi"].every((f) => /getUser\(\)/.test(f === "likeApi" ? likeApi : f === "commentsApi" ? commentsApi : commentDeleteApi) && /isTeacherOrStudent\(user\)/.test(f === "likeApi" ? likeApi : f === "commentsApi" ? commentsApi : commentDeleteApi)));
ok("TEST 6: Like hanya untuk artikel TERBIT milik guru/admin/founder", /isPublished: true/.test(likeApi) && /role: "GURU"/.test(likeApi) && /role: "ADMIN"/.test(likeApi) && /isFounder: true/.test(likeApi));

// ── 2. SEMANTIK LIKE (idempoten) ────────────────────────────────────────────
ok("TEST 7: POST like idempoten — like yang sudah ada TIDAK dibuat ganda", /if \(existing\) \{\s*return NextResponse\.json\(\{ success: true, liked: true/.test(likeApi));
ok("TEST 8: POST like memakai compound unique artikelId_userId", /artikelId_userId: \{ artikelId: id, userId: user\.id \}/.test(likeApi));
ok("TEST 9: DELETE unlike idempoten — tidak ada like tetap sukses", /if \(!existing\) \{\s*return NextResponse\.json\(\{ success: true, liked: false/.test(likeApi));
ok("TEST 10: Unlike hanya menghapus like MILIK SENDIRI (where: { id: existing.id })", /db\.artikelLike\.delete\(\{ where: \{ id: existing\.id \} \}\)/.test(likeApi));
ok("TEST 11: likeCount dihitung dari tabel (bukan angka hardcode/di-fabricate)", /db\.artikelLike\.count\(\{ where: \{ artikelId \} \}\)/.test(likeApi));
ok("TEST 12: Respons like menyertakan liked + likeCount", /liked: true, likeCount/.test(likeApi) && /liked: false, likeCount/.test(likeApi));

// ── 3. VALIDASI KOMENTAR ────────────────────────────────────────────────────
ok("TEST 13: Komentar memakai commentSchema konvensi existing", /commentSchema\.safeParse/.test(commentsApi));
ok("TEST 14: Komentar kosong/whitespace ditolak (min(1) + trim)", /commentSchema = z\.object\(\{/.test(validations) && /konten: z\.string\(\)\.min\(1, "Komentar harus diisi"\)\.max\(1000\)\.trim\(\)/.test(validations));
ok("TEST 15: Panjang komentar dibatasi (max 1000)", /\.max\(1000\)/.test(validations));
ok("TEST 16: Konten komentar di-sanitize sesuai konvensi", /sanitize\(parsed\.data\.konten\)/.test(commentsApi) && /export function sanitize/.test(validations));
ok("TEST 17: POST komentar mengembalikan 201 + comment + commentCount", /status: 201/.test(commentsApi) && /commentCount/.test(commentsApi));

// ── 4. KEPEMILIKAN & MODERASI KOMENTAR ─────────────────────────────────────
ok("TEST 18: GET komentar menyertakan isOwner (untuk tombol Hapus)", /isOwner: c\.user\.id === user\.id/.test(commentsApi));
ok("TEST 19: GET komentar menyertakan displayName (konteks guru)", /getDisplayName\(c\.user, "guru"\)/.test(commentsApi));
ok("TEST 20: Hapus komentar milik sendiri diperbolehkan", /comment\.userId !== user\.id && !isModerasi/.test(commentDeleteApi));
ok("TEST 21: Hapus komentar orang lain oleh guru biasa → 403", /Tidak dapat menghapus komentar orang lain/.test(commentDeleteApi) && /status: 403/.test(commentDeleteApi));
ok("TEST 22: Moderasi (ADMIN/founder) boleh hapus komentar siapa pun", /isModerasi = user\.role === "ADMIN" \|\| user\.isFounder === true/.test(commentDeleteApi));
ok("TEST 23: Hapus komentar beda artikel dari path → 400", /Komentar tidak terkait dengan artikel ini/.test(commentDeleteApi) && /status: 400/.test(commentDeleteApi));

// ── 5. TIDAK ADA XP/KOIN UNTUK LIKE/KOMENTAR ───────────────────────────────
ok("TEST 24: Like route TIDAK memberi XP/koin/notifikasi", !/awardXp|awardGuruXp|awardCoins|notif|GURU_XP_NILAI/.test(likeApi));
ok("TEST 25: Komentar routes TIDAK memberi XP/koin/notifikasi", !/awardXp|awardGuruXp|awardCoins|notifyGuruMurid|db\.notifikasi|GURU_XP_NILAI/.test(commentsApi) && !/awardXp|awardGuruXp|awardCoins|notifyGuruMurid|db\.notifikasi/.test(commentDeleteApi));
ok("TEST 26: GURU_XP_NILAI tanpa sumber baru untuk like/komentar karya (hanya kreasi: Artikel & Puisi)", /GURU_ARTIKEL: 50/.test(teacherXp) && /GURU_PUISI: 50/.test(teacherXp) && !/GURU_KARYA_LIKE|GURU_KARYA_KOMENTAR|GURU_ARTIKEL_LIKE|GURU_ARTIKEL_KOMENTAR/.test(teacherXp));

// ── 6. KEAMANAN DATA (additive-only) ───────────────────────────────────────
ok("TEST 27: Migrasi hanya MEMBUAT tabel baru (tidak ada ALTER/DROP existing)", !/ALTER TABLE "Artikel"|DROP TABLE|ALTER TABLE "Profile"|ALTER TABLE "User"/.test(migration) && /CREATE TABLE IF NOT EXISTS "ArtikelLike"/.test(migration) && /CREATE TABLE IF NOT EXISTS "ArtikelComment"/.test(migration));
ok("TEST 28: Migrasi idempoten (CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS)", /CREATE TABLE IF NOT EXISTS/.test(migration) && /CREATE UNIQUE INDEX IF NOT EXISTS/.test(migration) && /CREATE INDEX IF NOT EXISTS/.test(migration));
ok("TEST 29: Migrasi TIDAK menyentuh tabel sosial murid (StudentKarya*)", !/StudentKarya/.test(migration));
ok("TEST 30: Like/komentar guru TIDAK memakai model sosial murid", !/studentKaryaLike|studentKaryaComment|studentKarya\./.test(likeApi) && !/studentKaryaLike|studentKaryaComment/.test(commentsApi));
ok("TEST 31: Model ArtikelLike/ArtikelComment terdefinisi di schema + relasi Artikel", /model ArtikelLike \{/.test(schema) && /model ArtikelComment \{/.test(schema) && /likes\s+ArtikelLike\[\]/.test(schema) && /comments\s+ArtikelComment\[\]/.test(schema) && /artikelLikes\s+ArtikelLike\[\]/.test(schema) && /artikelComments\s+ArtikelComment\[\]/.test(schema));

// ── 7. FEED: COUNTS RIIL TANPA N+1 (BEST-EFFORT) ────────────────────────────
ok("TEST 32: Feed enrichment sosial memakai groupBy (tanpa N+1)", /db\.artikelLike\.groupBy/.test(feedApi) && /db\.artikelComment\.groupBy/.test(feedApi) && /_count: \{ _all: true \}/.test(feedApi));
ok("TEST 33: Feed status like per user via findMany userId (bukan join yang bisa gagal)", /db\.artikelLike\.findMany\(\{ where: \{ artikelId: \{ in: ids \}, userId: user\.id \}/.test(feedApi));
ok("TEST 34: Feed membungkus field stabil likeCount/commentCount/likedByCurrentUser", /likeCount: likeCountById\.get\(r\.id\) \?\? 0/.test(feedApi) && /commentCount: commentCountById\.get\(r\.id\) \?\? 0/.test(feedApi) && /likedByCurrentUser: likedByCurrentUserIds\.has\(r\.id\)/.test(feedApi));
ok("TEST 35: Feed TIDAK eager-fetch isi komentar", !/comments: \{\s*(where|select|include)/.test(feedApi));

// ── 8. UI: INTERAKSI SOSIAL ────────────────────────────────────────────────
ok("TEST 36: Footer sosial punya tombol suka (Heart) + jumlah", /toggleLike/.test(berkaryaUi) && /Heart size=\{13\}/.test(berkaryaUi) && /\{like\.likeCount\}/.test(berkaryaUi));
ok("TEST 37: Tombol komentar (MessageCircle) + jumlah ada di footer", /setActiveCommentsId/.test(berkaryaUi) && /MessageCircle size=\{13\}/.test(berkaryaUi) && /\{a\.commentCount\}/.test(berkaryaUi));
ok("TEST 38: Like instan (optimistic setLikes SEBELUM fetch, tanpa reload)", /setLikes\(\(prev\) => \(\{ \.\.\.prev, \[a\.id\]: optimistik \}\)\)/.test(berkaryaUi) && !/router\.refresh|window\.location\.reload/.test(berkaryaUi));
ok("TEST 39: Panel komentar LAZY — fetch komentar hanya di GuruBerkaryaComments", !/\/comments/.test(berkaryaUi) && /fetch\(`\/api\/guru\/berkarya\/\$\{artikelId\}\/comments`/.test(commentsUi));
ok("TEST 40: Panel komentar dipasang sebagai modal saat dibuka", /activeCommentsId &&/.test(berkaryaUi) && /<GuruBerkaryaComments/.test(berkaryaUi));
ok("TEST 41: Empty state komentar — ajakan apresiasi pertama", /Belum ada komentar\./.test(commentsUi) && /Jadilah guru pertama yang memberi apresiasi\./.test(commentsUi));
ok("TEST 42: UI komentar tanpa polling (tidak ada setInterval)", !/setInterval|setTimeout/.test(commentsUi));
ok("TEST 43: UI memvalidasi draft (trim + maxLength 1000) sebelum kirim", /maxLength=\{1000\}/.test(commentsUi) && /!draft\.trim\(\)/.test(commentsUi));

// ── 9. REGRESI 2.0 (WAJIB TETAP) ───────────────────────────────────────────
ok("TEST 44: Regresi — karya sendiri tetap tampil (tanpa excludeMe) + badge Karya Anda", !/excludeMe/.test(feedApi) && /karyaAnda/.test(berkaryaUi) && /✨ Karya Anda/.test(berkaryaUi));
ok("TEST 45: Regresi — ShareButton tetap ada di footer", /ShareButton/.test(berkaryaUi) && /url=\{`\/artikel\/\$\{a\.slug\}`\}/.test(berkaryaUi));
ok("TEST 46: Regresi — urutan feed tetap publishedAt DESC", /orderBy: \[\{ publishedAt: "desc" \}, \{ createdAt: "desc" \}\]/.test(feedApi));
ok("TEST 47: Regresi — Feed dan editor guru TIDAK mengekspos jawaban/kunci apa pun", !/correctAnswer|jawaban/.test(feedApi) && !/correctAnswer|jawaban/.test(likeApi) && !/correctAnswer|jawaban/.test(commentsApi));

// ── 10. ROOT CAUSE FIX — FEED RESILIENCY (ERROR ≠ EMPTY) ─────────────────────
ok("TEST 48: Root cause — query DASAR feed tidak menyentuh tabel sosial", !/select: \{ likes: true/.test(feedApi) && !/_count: \{\s*likes/.test(feedApi));
ok("TEST 49: Root cause — Artikel terbit guru lain tampil (author OR, tanpa authorId exclusion)", /isPublished: true/.test(feedApi) && /author: \{ OR: \[\{ role: "GURU" \}, \{ role: "ADMIN" \}, \{ isFounder: true \}\] \}/.test(feedApi) && !/authorId: \{ not/.test(feedApi));
ok("TEST 50: Root cause — Semua (tanpa ?type) tampil tanpa filter articleType, puisi ikut", /\(typeParam === "PUISI"/.test(feedApi) && /: \{\}\)/s.test(feedApi) && !/articleType: typeParam/.test(feedApi));
ok("TEST 51: Root cause — draft/unpublished TIDAK tampil (feed isPublished + terbit set publishedAt)", /isPublished: true/.test(feedApi) && /publishedAt: terbit \? new Date\(\) : null/.test(artikelApi));
ok("TEST 52: Root cause — karya lama tetap tampil (tanpa filter tanggal di feed)", !/gte:|lte:|Date\.now/.test(feedApi));
ok("TEST 53: Root cause — badge BARU ≤24 jam hanya untuk karya terbaru", /Date\.now\(\) - t < 24 \* 60 \* 60 \* 1000/.test(berkaryaUi) && /\{isBaru && \(/.test(berkaryaUi));
ok("TEST 54: Root cause — karya >24 jam tampil tanpa badge (waktuRelatif 'kemarin')", /if \(hari === 1\) return "kemarin"/.test(berkaryaUi) && /\{waktuRelatif\(a\.publishedAt \|\| a\.createdAt\)\}/.test(berkaryaUi));
ok("TEST 55: Root cause — type PUISI dibaca dan ditampilkan (bukan ARTIKEL only)", /\(a\.articleType \|\| ""\)\.toUpperCase\(\) === "PUISI"/.test(berkaryaUi));
ok("TEST 56: Root cause — enrichment sosial best-effort (try/catch) tidak menghapus item feed", /\} catch \{/.test(feedApi) && /Promise\.all\(\[/.test(feedApi) && /db\.artikelLike\.groupBy/.test(feedApi));
ok("TEST 57: Root cause — error API ≠ empty feed (state error + tombol Muat Ulang)", /setError\(true\)/.test(berkaryaUi) && /Gagal memuat karya guru\./.test(berkaryaUi) && /Belum ada karya terbaru\./.test(berkaryaUi) && /setReloadKey\(\(k\) => k \+ 1\)/.test(berkaryaUi));

// ── Ringkasan ──────────────────────────────────────────────────────────────
console.log(`\n${fail === 0 ? "SEMUA LULUS" : `${fail} GAGAL`}  (total asersi: 57)`);
process.exit(fail === 0 ? 0 : 1);
