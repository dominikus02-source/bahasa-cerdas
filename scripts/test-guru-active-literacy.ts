// Unit test Fase "Guru Active & Literacy Competition" — misi tanpa terpotong,
// leaderboard guru multi-periode, XP literasi pertama-kali-terbit, feed Guru
// Berkarya (Artikel/Puisi), anti-spam, otorisasi. Tidak butuh koneksi DB
// (tes statis + logika murni).
import { readFileSync } from "fs";
import { join } from "path";
import {
  GURU_XP_SOURCES,
  GURU_XP_NILAI,
  seasonStartWIB,
} from "@/lib/gamification/teacher-xp";
import { MIN_PANJANG_KONTEN } from "@/lib/guru/literasi-xp";

let fail = 0;
const ok = (label: string, cond: boolean) => {
  if (!cond) fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
};

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

// ── 1. Sumber & nilai XP guru baru ─────────────────────────────────────────
ok("GURU_ARTIKEL didefinisikan", GURU_XP_SOURCES.GURU_ARTIKEL === "GURU_ARTIKEL");
ok("GURU_PUISI didefinisikan", GURU_XP_SOURCES.GURU_PUISI === "GURU_PUISI");
ok("GURU_MATERI didefinisikan", GURU_XP_SOURCES.GURU_MATERI === "GURU_MATERI");
ok("GURU_KELAS didefinisikan", GURU_XP_SOURCES.GURU_KELAS === "GURU_KELAS");
ok("GURU_ARTIKEL = 50 XP (selaras misi Menulis Artikel)", GURU_XP_NILAI.GURU_ARTIKEL === 50);
ok("GURU_PUISI = 50 XP", GURU_XP_NILAI.GURU_PUISI === 50);
ok("GURU_MATERI = 40 XP (selaras misi Mengunggah Materi Ajar)", GURU_XP_NILAI.GURU_MATERI === 40);
ok("GURU_KELAS = 20 XP (selaras misi Membuat Kelas)", GURU_XP_NILAI.GURU_KELAS === 20);

// ── 2. Leaderboard multi-periode ───────────────────────────────────────────
const teacherXpSrc = read("lib/gamification/teacher-xp.ts");
ok("getTeacherLeaderboard menerima parameter period", /period\?: TeacherLeaderboardPeriod/.test(teacherXpSrc));
ok("getTeacherLeaderboard memfilter WEEKLY (startOfWeekWIB)", /if \(period === "WEEKLY"\)/.test(teacherXpSrc));
ok("getTeacherLeaderboard memfilter SEASON (seasonStartWIB)", /if \(period === "SEASON"\)/.test(teacherXpSrc));
ok("getTeacherLeaderboard mengembalikan myXp", /myXp: number/.test(teacherXpSrc));
ok("getTeacherLeaderboard mengembalikan participants", /participants: number/.test(teacherXpSrc));
ok("seasonStartWIB diekspor", typeof seasonStartWIB === "function");

const lbRoute = read("app/api/guru/leaderboard/route.ts");
ok("route leaderboard membaca ?period=", /searchParams\.get\("period"\)/.test(lbRoute));
ok("route leaderboard role-gated guru/founder", /isTeacherOrStudent\(/.test(lbRoute));
ok("route leaderboard default ALL_TIME (backward compatible)", /periodParam \?\? "ALL_TIME"|periodParam && PERIODS\.includes\(periodParam\) \? periodParam : "ALL_TIME"/.test(lbRoute));

// ── 3. MissionItem tanpa truncation ────────────────────────────────────────
const missionSrc = read("components/guru/misi/MissionItem.tsx");
ok("label misi TIDAK pakai truncate (bisa wrap/line-clamp)", !/\btruncate\b/.test(missionSrc));
ok("label misi memakai line-clamp-2", /line-clamp-2/.test(missionSrc));
ok("chip XP tetap tampil (+{xp} XP)", /\+\{xp\} XP/.test(missionSrc));

// ── 4. Kartu posisi Kompetisi Guru ─────────────────────────────────────────
const rankCard = read("components/guru/GuruLeaderboardCard.tsx");
ok("GuruLeaderboardCard default periode WEEKLY", /useState<TeacherLeaderboardPeriod>\("WEEKLY"\)/.test(rankCard));
ok("GuruLeaderboardCard fetch memakai ?period= dinamis", /\?period=\$\{period\}/.test(rankCard));
ok("GuruLeaderboardCard menampilkan posisi (#myRank)", /#\{data\.myRank/.test(rankCard));
ok("GuruLeaderboardCard menampilkan XP minggu ini", /XP Minggu Ini/.test(rankCard));
ok("GuruLeaderboardCard menampilkan gap ke peringkat atas", /gapNext/.test(rankCard));
ok("GuruLeaderboardCard menampilkan top 3", /top3\.map/.test(rankCard));

// ── 5. Feed Guru Berkarya ──────────────────────────────────────────────────
const berkaryaRoute = read("app/api/guru/berkarya/route.ts");
ok("route /api/guru/berkarya ada", berkaryaRoute.length > 0);
ok("berkarya hanya karya terbit", /isPublished: true/.test(berkaryaRoute));
ok("berkarya hanya dari guru/admin/founder", /role: "GURU"/.test(berkaryaRoute));
ok("berkarya menyertakan karya sendiri (current user tampil, penanda Karya Anda)", !/excludeMe/.test(berkaryaRoute) && /currentUserId/.test(berkaryaRoute));
ok("berkarya role-gated guru/founder", /isTeacherOrStudent\(/.test(berkaryaRoute));
const berkaryaUi = read("components/guru/GuruBerkarya.tsx");
ok("komponen GuruBerkarya memakai SafeMediaImage", /SafeMediaImage/.test(berkaryaUi));
ok("komponen GuruBerkarya menampilkan badge Puisi", /Puisi/.test(berkaryaUi));
ok("komponen GuruBerkarya menampilkan asal sekolah", /\.school/.test(berkaryaUi));

// ── 6. Wiring XP literasi (pertama kali terbit, anti-spam) ─────────────────
const literasi = read("lib/guru/literasi-xp.ts");
ok("literasi-xp memakai awardGuruXp (pintu XP resmi)", /awardGuruXp\(/.test(literasi));
ok("literasi-xp reference idempoten per artikel (artikel-publish-<id>)", /`\$\{prefix\}-publish-\$\{artikelId\}`/.test(literasi));
ok("literasi-xp mencatat aktivitas ARTICLE", /type: "ARTICLE"/.test(literasi));
ok("literasi-xp menambah skill WRITING", /skill: "WRITING"/.test(literasi));
ok("literasi-xp mengirim notifikasi ke guru lain", /notifyGuruMurid/.test(literasi));
ok("anti-spam: panjang konten minimal diterapkan", MIN_PANJANG_KONTEN.ARTIKEL >= 40 && MIN_PANJANG_KONTEN.PUISI >= 20);
ok("anti-spam: konten terlalu pendek TIDAK dapat XP (early return)", /kontenPanjang < min/.test(literasi));

const artikelRoute = read("app/api/guru/artikel/route.ts");
ok("POST artikel menyimpan articleType", /articleType/.test(artikelRoute));
ok("POST artikel menyimpan publishedAt saat terbit", /publishedAt: terbit \? new Date\(\) : null/.test(artikelRoute));
ok("POST artikel menyimpan authorName/authorRole", /authorName: user\.fullName/.test(artikelRoute));
ok("POST artikel mencairkan XP hanya saat terbit", /if \(terbit\)/.test(artikelRoute));
ok("PUT artikel mendeteksi transisi draft → terbit (first publish)", /terbitPertamaKali/.test(artikelRoute));
ok("PUT artikel TIDAK mencairkan XP ulang saat edit (guard first)", /existing\.isPublished !== true/.test(artikelRoute));

// ── 7. Wiring XP materi & kelas ────────────────────────────────────────────
const materiRoute = read("app/api/guru/materi/route.ts");
ok("POST materi mencairkan GURU_MATERI", /GURU_MATERI/.test(materiRoute));
ok("materi XP hanya saat isPublished (anti-spam)", /if \(isPublished\)/.test(materiRoute));
ok("materi XP reference idempoten (materi-publish-<id>)", /materi-publish-/.test(materiRoute));

const groupRoute = read("app/api/group/route.ts");
ok("POST group mencairkan GURU_KELAS", /GURU_KELAS/.test(groupRoute));
ok("kelas XP reference idempoten (kelas-create-<id>)", /kelas-create-/.test(groupRoute));

// ── 8. Integrasi dashboard ─────────────────────────────────────────────────
const beranda = read("app/(dashboard)/guru/beranda/page.tsx");
ok("beranda memasang GuruLeaderboardCard", /GuruLeaderboardCard/.test(beranda));
ok("beranda memasang GuruBerkarya", /GuruBerkarya/.test(beranda));

// ── 9. Otorisasi endpoint baru ─────────────────────────────────────────────
for (const p of [
  "app/api/guru/berkarya/route.ts",
  "app/api/guru/leaderboard/route.ts",
]) {
  const src = read(p);
  ok(`otorisasi ${p} (getUser + isTeacherOrStudent)`, /getUser\(\)/.test(src) && /isTeacherOrStudent/.test(src));
}

// ── 10. Regresi: source count masih utuh ───────────────────────────────────
ok("GURU_XP_SOURCES berjumlah 11 (7 lama + 4 baru)", Object.keys(GURU_XP_SOURCES).length === 11);

if (fail > 0) {
  console.log(`\n${fail} tes GAGAL.`);
  process.exit(1);
}
console.log("\nSEMUA TES LULUS.");
process.exit(0);
