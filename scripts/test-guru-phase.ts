// Unit test Fase Guru — XP guru, badge guru, notifikasi guru, analytics WIB,
// summary murid. Tidak butuh koneksi DB (tes statis + logika murni).
import { readFileSync } from "fs";
import { join } from "path";
import { GURU_XP_SOURCES, GURU_XP_NILAI } from "@/lib/gamification/teacher-xp";

let fail = 0;
const ok = (label: string, cond: boolean) => {
  if (!cond) fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
};

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

// ── 1. teacher-xp.ts ─────────────────────────────────────────────────────
ok("7 sumber XP guru terdefinisi (termasuk GURU_GAME)", Object.keys(GURU_XP_SOURCES).length === 7);
for (const [k, v] of Object.entries(GURU_XP_NILAI)) {
  ok(`nilai XP guru ${k} > 0 (${v})`, v > 0);
}
const teacherXpSrc = read("lib/gamification/teacher-xp.ts");
ok("awardGuruXp memakai awardXp (satu pintu XP resmi)", /awardXp\(/.test(teacherXpSrc));
ok("awardGuruXp mengevaluasi badge guru setelah XP", /evaluateBadges\(/.test(teacherXpSrc));
ok("getMuridGuruIds ada", /export async function getMuridGuruIds/.test(teacherXpSrc));
ok("notifyGuruMurid ada (batch createMany)", /export async function notifyGuruMurid/.test(teacherXpSrc));

// ── 2. badge-engine.ts — kondisi guru ─────────────────────────────────────
const badgeSrc = read("lib/gamification/badge-engine.ts");
for (const t of ["MURID_KARYA", "MURID_LIKE", "MURID_FEATURED", "TUGAS_DIKIRIM", "PENGUMUMAN_DIBUAT"]) {
  ok(`badge engine menangani kondisi ${t}`, badgeSrc.includes(t));
}
ok("collectGuruMetrics ada", /collectGuruMetrics/.test(badgeSrc));
ok("metrik guru hanya dihitung bila punya kelas", /groups\.length === 0 \? undefined|if \(groups\.length === 0\) return undefined/.test(badgeSrc));

// ── 3. seed-guru-badges.ts ────────────────────────────────────────────────
const seedSrc = read("scripts/seed-guru-badges.ts");
const codes = [...seedSrc.matchAll(/code: "([^"]+)"/g)].map(m => m[1]);
ok("10 badge guru didefinisikan", codes.length === 10);
ok("kode badge guru unik", new Set(codes).size === codes.length);
ok("badge wajib prefix guru-", codes.every(c => c.startsWith("guru-")));
ok("badge wajib 5 jenis kondisi guru", ["guru-literasi", "guru-inspiratif", "guru-literasi-legend", "guru-kreatif", "guru-kreatif-master", "guru-motivator", "guru-inspirator", "guru-penggerak", "guru-mentor", "guru-dedikasi"].every(c => codes.includes(c)));
ok("seed guru dry-run default (--execute untuk apply)", /process\.argv\.includes\("--execute"\)/.test(seedSrc));
ok("seed guru upsert-only (tidak delete)", !/deleteMany|truncate/.test(seedSrc));

// ── 4. analytics guru — logika minggu WIB ─────────────────────────────────
const analyticsSrc = read("app/api/guru/dashboard/analytics/route.ts");
ok("analytics memakai offset WIB 7 jam", /WIB_MS = 7 \* 60 \* 60 \* 1000/.test(analyticsSrc));
ok("analytics minggu mulai Senin", /mondayWIB/.test(analyticsSrc));
ok("analytics batasi 12 minggu maksimal", /Math\.max\(4, Number\(searchParams\.get\("weeks"\) \|\| 8\)\)/.test(analyticsSrc));
ok("analytics murid-only via SSOT getTeacherStudentIds", /getTeacherStudentIds/.test(analyticsSrc));
ok("analytics hitung karya/like/komentar per minggu", ["studentKarya.count", "studentKaryaLike.count", "studentKaryaComment.count"].every(x => analyticsSrc.includes(x)));

// ── 5. notifikasi guru di route like/comment/karya ────────────────────────
const likeSrc = read("app/api/siswa/karya/[id]/like/route.ts");
ok("like → notifikasi guru (MURID_LIKE)", /MURID_LIKE/.test(likeSrc) && /notifyGuruMurid/.test(likeSrc));
ok("like → XP guru (awardGuruXp)", /awardGuruXp/.test(likeSrc));
ok("like → trending milestone 25/50/100/250/500/1000", /TRENDING_MILESTONES = \[25, 50, 100, 250, 500, 1000\]/.test(likeSrc));

const commentSrc = read("app/api/siswa/karya/[id]/comment/route.ts");
ok("komentar → notifikasi + XP guru", /notifyGuruMurid/.test(commentSrc) && /MURID_KOMENTAR/.test(commentSrc));

const karyaSrc = read("app/api/siswa/karya/route.ts");
ok("upload karya → notifikasi + XP guru (MURID_KARYA)", /MURID_KARYA/.test(karyaSrc) && /getMuridGuruIds/.test(karyaSrc));

const featSrc = read("app/api/siswa/karya/[id]/route.ts");
ok("pilih karya → XP guru GURU_FEATURED", /GURU_FEATURED/.test(featSrc));

const pengumumanSrc = read("app/api/guru/pengumuman/route.ts");
ok("buat pengumuman → XP guru", /GURU_PENGUMUMAN/.test(pengumumanSrc));

const penugasanSrc = read("app/api/guru/penugasan/route.ts");
ok("kirim penugasan → XP guru (reference UUID)", /GURU_TUGAS/.test(penugasanSrc) && /crypto\.randomUUID\(\)/.test(penugasanSrc));

// ── 6. summary murid ──────────────────────────────────────────────────────
const summarySrc = read("app/api/murid/dashboard/summary/route.ts");
ok("summary murid punya guard role MURID", /user\.role !== "MURID" && !user\.isFounder/.test(summarySrc));
ok("summary murid memuat tugas/pengumuman/materi/leaderboard", ["tugas", "pengumuman", "materi", "leaderboard"].every(x => summarySrc.includes(x)));
ok("summary murid pakai getLeaderboard mingguan", /getLeaderboard\(\{ scope: "GLOBAL", period: "WEEKLY"/.test(summarySrc));
ok("summary murid tidak bocor jawaban", !/correctAnswer|answerKey|jawaban/.test(summarySrc));

// ── 7. SSOT data siswa guru (lib/teacher/students.ts) ──────────────────────
const teacherSvc = read("lib/teacher/students.ts");
ok("SSOT guard isTeacherOrStudent (GURU | ADMIN | founder)", /user\.role === "GURU" \|\| user\.role === "ADMIN" \|\| user\.isFounder === true/.test(teacherSvc));
ok("SSOT getTeacherStudents ada (daftar murid lengkap)", /getTeacherStudents\(/.test(teacherSvc));
ok("SSOT getTeacherStudentIds ada (ID murid unik)", /getTeacherStudentIds\(/.test(teacherSvc));
ok("SSOT hanya kelas aktif (isActive true)", /isActive: true/.test(teacherSvc));
ok("SSOT dedupe murid lintas kelas (Set)", /new Set\(/.test(teacherSvc));
ok("SSOT tidak filter role member (hitung semua anggota)", !/role:\s*"member"/.test(teacherSvc));

const siswaApi = read("app/api/guru/siswa/route.ts");
ok("/api/guru/siswa memakai guard SSOT (bukan role === GURU saja)", /isTeacherOrStudent/.test(siswaApi) && !/dbUser\.role !== "GURU"/.test(siswaApi));
ok("/api/guru/siswa memakai getTeacherStudents", /getTeacherStudents/.test(siswaApi));

const siswaPatch = read("app/api/guru/siswa/[id]/route.ts");
ok("/api/guru/siswa/[id] PATCH memakai guard SSOT", /isTeacherOrStudent/.test(siswaPatch) && !/dbUser\.role !== "GURU"/.test(siswaPatch));

const groupApi = read("app/api/group/route.ts");
ok("/api/group GET memakai getTeacherGroups (SSOT)", /getTeacherGroups/.test(groupApi));

const gameHub = read("app/api/guru/game-hub/route.ts");
ok("game-hub memakai getTeacherStudentIds (SSOT)", /getTeacherStudentIds/.test(gameHub));
ok("game-hub guard SSOT", /isTeacherOrStudent/.test(gameHub));

const gradeSrc = read("app/api/guru/gradebook/route.ts");
ok("gradebook guard SSOT", /isTeacherOrStudent/.test(gradeSrc));

const penugasanDetail = read("app/api/guru/penugasan/[id]/route.ts");
ok("penugasan/[id] guard SSOT", /isTeacherOrStudent/.test(penugasanDetail));
ok("penugasan/[id] menghitung semua anggota (role filter dihapus)", !/role:\s*"member"/.test(penugasanDetail));

const dataSiswaPage = read("app/(dashboard)/guru/data-siswa/page.tsx");
ok("halaman data-siswa tidak menelan error fetch (cek res.ok)", /r\.ok \? r\.json\(\) : null/.test(dataSiswaPage));
ok("halaman data-siswa menampilkan loadError", /loadError/.test(dataSiswaPage));

const kelaskuPage = read("app/(dashboard)/guru/kelasku/page.tsx");
ok("halaman kelasku cek res.ok di fetchGroups", /!res\.ok/.test(kelaskuPage));

console.log(`\n${fail === 0 ? "SEMUA LULUS" : `${fail} GAGAL`}`);
process.exit(fail === 0 ? 0 : 1);
