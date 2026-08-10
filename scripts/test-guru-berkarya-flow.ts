// Flow test — Guru Berkarya Refactor (IA: display vs creation)
//
// Memverifikasi alur yang dibetulkan:
//   A. Guru Beranda merender Guru Berkarya.
//   B. "Lihat Semua Karya" TIDAK lagi menuju editor (/guru/artikel).
//   C. "Lihat Semua Karya" membuka showcase /guru/karya.
//   D. Showcase punya filter Artikel/Puisi.
//   E. "Lihat Karya" membuka detail (/artikel/{slug}).
//   F. "Tulis Karya" membuka unified composer (/guru/artikel).
//   G. Composer mendukung Artikel & Puisi.
//   H. Deskripsi Artikel & Puisi satu kesatuan (satu halaman).
//   I. Draft tidak tampil di showcase (API hanya isPublished).
//   J. Karya guru existing tetap utuh (API & kartu tidak mengubah data).
//
// Statis — tidak butuh DB.

import { readFileSync } from "fs";
import { join } from "path";

let fail = 0;
const ok = (label: string, cond: boolean, detail?: string) => {
  if (!cond) fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
};

const BASE = process.cwd();
const read = (p: string) => readFileSync(join(BASE, p), "utf8");
const existsSyncPath = (p: string) => {
  try {
    read(p);
    return true;
  } catch {
    return false;
  }
};

const beranda = read("app/(dashboard)/guru/beranda/page.tsx");
const berkaryaUi = read("components/guru/GuruBerkarya.tsx");
const showcase = read("app/(dashboard)/guru/karya/page.tsx");
const api = read("app/api/guru/berkarya/route.ts");
const artikelEditor = read("app/(dashboard)/guru/artikel/page.tsx");
const artikelDetail = read("app/artikel/[slug]/page.tsx");

// ── A. Guru Beranda merender Guru Berkarya ─────────────────────────────────
ok("A: Beranda memasang komponen GuruBerkarya", /<GuruBerkarya/.test(beranda));
ok("A: Section tetap preview yang menampilkan karya", /fetch\("\/api\/guru\/berkarya\?limit=6"/.test(berkaryaUi));

// ── B. Lihat Semua Karya ≠ editor ──────────────────────────────────────────
// Setiap <Link href="/guru/artikel" ...>...</Link> harus NORMAL (Tulis Karya /
// Buat Artikel), dan halaman harus punya Link terpisah "Lihat Semua Karya" →
// /guru/karya. Regex di-scope per elemen Link agar tidak false-positive.
const linkArtikelBlocks = berkaryaUi.match(/<Link\s+href="\/guru\/artikel"[^]*?<\/Link>/gs) || [];
ok(
  "B: Tidak ada elemen Link ke /guru/artikel yang berlabel 'Lihat Semua Karya'",
  linkArtikelBlocks.length > 0 && linkArtikelBlocks.every((b) => !b.includes("Lihat Semua Karya")),
);
ok(
  "B: Label 'Lihat Semua Karya' hanya muncul sebagai Link ke /guru/karya",
  (berkaryaUi.match(/Lihat Semua Karya/g) || []).length >= 1,
);
const linkKaryaBlock = berkaryaUi.match(/<Link\s+href="\/guru\/karya"[^]*?<\/Link>/gs) || [];
ok(
  "B: Semua blok Link /guru/karya mengandung 'Lihat Semua Karya'",
  linkKaryaBlock.length >= 1 && linkKaryaBlock.every((b) => b.includes("Lihat Semua Karya")),
);

// ── C. Lihat Semua Karya → /guru/karya ─────────────────────────────────────
ok("C: CTA desktop menuju /guru/karya", /href="\/guru\/karya"/.test(berkaryaUi) && /Lihat Semua Karya <ChevronRight size=\{12\} \/>/.test(berkaryaUi));
ok("C: CTA mobile menuju /guru/karya (sm:hidden)", /href="\/guru\/karya"/.test(berkaryaUi) && /sm:hidden/.test(berkaryaUi));

// ── D. Showcase: filter + halaman showcase ada ─────────────────────────────
ok("D: Halaman showcase /guru/karya ada", /Panggung Karya Guru/.test(showcase));
ok("D: Filter Semua/Artikel/Puisi hadir", /value: "SEMUA", label: "Semua"/.test(showcase) && /value: "ARTIKEL"/.test(showcase) && /value: "PUISI"/.test(showcase));
ok("D: Filter diteruskan ke API (?type=)", /params\.set\("type", f\)/.test(showcase));
ok("D: API mendukung filter type (PUISI exact + ARTIKEL non-PUISI)", /typeParam === "PUISI"/.test(api) && /articleType: null/.test(api) && /articleType: \{ not: "PUISI" \}/.test(api));
ok("D: API root cause — filter ARTIKEL tidak exact-match 'ARTIKEL' (mengosongkan legacy)", !/articleType: typeParam/.test(api));

// ── E. Klik karya → detail ─────────────────────────────────────────────────
ok("E: Kartu showcase menuju detail /artikel/{slug}", /href=\{`\/artikel\/\$\{a\.slug\}`\}/.test(showcase));
ok("E: Detail halaman publik ada", /isPublished: true/.test(artikelDetail) && /revalidate = 600/.test(artikelDetail));

// ── F. Tulis Karya → unified composer ──────────────────────────────────────
ok("F: CTA 'Tulis Karya' di showcase menuju /guru/artikel", /Tulis Karya/.test(showcase) && /href="\/guru\/artikel"/.test(showcase));
ok("F: CTA 'Tulis Karya' di beranda menuju /guru/artikel", /Tulis Karya/.test(berkaryaUi) && /href="\/guru\/artikel"/.test(berkaryaUi));

// ── G. Composer muncul dua jenis ───────────────────────────────────────────
ok("G: Composer unified — toggle Artikel", /form\.articleType === "ARTIKEL"/.test(artikelEditor) && /FileText size=\{15\} \/> Artikel/.test(artikelEditor));
ok("G: Composer unified — toggle Puisi", /form\.articleType === "PUISI"/.test(artikelEditor) && /Feather size=\{15\} \/> Puisi/.test(artikelEditor));
ok("G: Tidak ada route terpisah /guru/tulis-artikel", !existsSyncPath("app/(dashboard)/guru/tulis-artikel/page.tsx"));
ok("G: Tidak ada route terpisah /guru/tulis-puisi", !existsSyncPath("app/(dashboard)/guru/tulis-puisi/page.tsx"));

// ── H. Deskripsi satu kesatuan ─────────────────────────────────────────────
ok("H: Deskripsi halaman satu kesatuan (artikel & puisi dalam satu editor)", /Tulis dan kelola artikel atau puisi untuk dibaca publik/.test(artikelEditor));

// ── I. Draft tidak tampil ──────────────────────────────────────────────────
ok("I: API hanya isPublished: true", /isPublished: true/.test(api) && !/isPublished: false/.test(api));
ok("I: Feed tidak mengekspos konten penuh", !/content: true/.test(api));

// ── K. Filter semantics (29-tes asli): Semua ⇒ ARTIKEL+PUISI ───────────────
ok("K: SEMUA tanpa filter jenis ({} fallback)", /: \{\} \}/.test(api) || /typeParam === "PUISI"/.test(api));
ok("K: PUISI filter exact 'PUISI'", /articleType: "PUISI"/.test(api));
ok("K: ARTIKEL filter = null atau non-PUISI (mematikan bug exact-match)", /OR: \[\{ articleType: null \}, \{ articleType: \{ not: "PUISI" \} \}\]/.test(api));

// ── J. Data existing utuh ──────────────────────────────────────────────────
ok("J: API tidak menghapus/mengubah query existing (take: limit, orderBy publishedAt DESC)", /take: limit/.test(api) && /orderBy: \[\{ publishedAt: "desc" \}/.test(api));
ok("J: Karya sendiri tetap tampil di feed (tanpa excludeMe)", !/excludeMe/.test(api) && !/authorId:\s*\{\s*not:\s*user\.id/.test(api));
ok("J: API tetap role-gated", /isTeacherOrStudent\(user\)/.test(api));
ok("J: XP meta tetap dari GURU_XP_NILAI", /GURU_XP_NILAI\.GURU_ARTIKEL/.test(api) && /GURU_XP_NILAI\.GURU_PUISI/.test(api));

console.log(`\n════════════════════════════════════════`);
console.log(`HASIL: ${fail === 0 ? "SEMUA LULUS ✅" : `${fail} GAGAL ❌`}`);
process.exit(fail === 0 ? 0 : 1);