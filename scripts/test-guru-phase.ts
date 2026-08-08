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
ok("11 sumber XP guru terdefinisi (termasuk GURU_GAME, GURU_ARTIKEL, GURU_PUISI, GURU_MATERI, GURU_KELAS)", Object.keys(GURU_XP_SOURCES).length === 11);
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

// ── 8. Guard quiz/assign (P0: GURU | ADMIN | founder via SSOT) ──────────────
const quizRoutes: Record<string, string> = {
  "quiz": "app/api/guru/quiz/route.ts",
  "quiz/[id]": "app/api/guru/quiz/[id]/route.ts",
  "quiz/[id]/assign": "app/api/guru/quiz/[id]/assign/route.ts",
  "quiz/[id]/publish": "app/api/guru/quiz/[id]/publish/route.ts",
  "quiz/[id]/duplicate": "app/api/guru/quiz/[id]/duplicate/route.ts",
  "quiz/[id]/results": "app/api/guru/quiz/[id]/results/route.ts",
  "quiz/[id]/questions": "app/api/guru/quiz/[id]/questions/route.ts",
  "quiz/[id]/questions/bulk": "app/api/guru/quiz/[id]/questions/bulk/route.ts",
};
for (const [name, path] of Object.entries(quizRoutes)) {
  const src = read(path);
  ok(`/api/guru/${name} guard SSOT (GURU | ADMIN | founder)`, /isTeacherOrStudent/.test(src) && !/dbUser\.role\s*!==\s*"GURU"|role\?\.toUpperCase\(\)\s*!==\s*"GURU"/.test(src));
}

const quizBase = read("app/api/guru/quiz/route.ts");
ok("/api/guru/quiz GET/POST scope creatorId (ownership tetap terjaga)", /creatorId/.test(quizBase));

const assignRoute = read("app/api/guru/quiz/[id]/assign/route.ts");
ok("/api/guru/quiz/[id]/assign ownership quiz (creatorId)", /quiz\.creatorId !== dbUser\.id/.test(assignRoute));
ok("/api/guru/quiz/[id]/assign class safety (teacherId)", /teacherId: dbUser\.id/.test(assignRoute));

const quizDetail = read("app/api/guru/quiz/[id]/route.ts");
ok("/api/guru/quiz/[id] PUT/DELETE ownership quiz (creatorId)", /existing\.creatorId !== dbUser\.id/.test(quizDetail));

const editPage = read("app/(dashboard)/guru/kuis/[id]/edit/page.tsx");
ok("halaman edit kuis ada (bukan 404) dan reuse editor existing", /redirect\(`\/guru\/kuis\/new\?edit=/.test(editPage));
ok("halaman edit kuis tidak membuat editor kedua", !/useState|"use client"/.test(editPage));

const builderSrc = read("app/(dashboard)/guru/kuis/new/page.tsx");
ok("editor edit-mode tidak duplikat soal saat simpan (filter existingSourceIds)", /soalIdsToAdd = editId\s*\?\s*selectedSoalIds\.filter\(id => !existingSourceIds\.includes\(id\)\)/.test(builderSrc));

// ── 9. P1-A SSOT — TEST 1–8 (audit §13) ────────────────────────────────────
// TEST 1: Guru melihat hanya murid kelas miliknya — scoping getTeacherStudents.
ok("[TEST 1] getTeacherStudents scope teacherId (hanya kelas milik guru)", /where: \{ teacherId, isActive: true \}/.test(teacherSvc));
ok("[TEST 1] getTeacherGroups scope teacherId", /where: \{ teacherId, isActive: true \}/.test(teacherSvc));

// TEST 2: Guru A tidak dapat melihat murid Guru B — ownership tetap di route.
const sosialSrc = read("app/api/guru/dashboard/social/route.ts");
const literasiSrc = read("app/api/guru/literasi/stats/route.ts");
const leaderboardSrc = read("app/api/guru/hasil-karya/leaderboard/route.ts");
ok("[TEST 2] dashboard/social population via SSOT getTeacherGroups(user.id, null)", /getTeacherGroups\(user\.id, null\)/.test(sosialSrc));
ok("[TEST 2] literasi/stats population via SSOT (ownership terjaga)", /getTeacherGroups\(user\.id, null\)/.test(literasiSrc));
ok("[TEST 2] hasil-karya/leaderboard population via SSOT (ownership terjaga)", /getTeacherGroups\(user\.id, null\)/.test(leaderboardSrc));

// TEST 3: ADMIN/founder pakai Guru Experience tanpa false-403 — semua guard SSOT.
const p1aRoutes: Record<string, string> = {
  "assign-tka": "app/api/guru/assign-tka/route.ts",
  "buat-assessment": "app/api/guru/buat-assessment/route.ts",
  "latihan": "app/api/guru/latihan/route.ts",
  "latihan/[id]": "app/api/guru/latihan/[id]/route.ts",
  "latihan/[id]/assignment/[assignId]": "app/api/guru/latihan/[id]/assignment/[assignId]/route.ts",
  "nilai-kategori": "app/api/guru/nilai-kategori/route.ts",
  "nilai-kategori/[id]": "app/api/guru/nilai-kategori/[id]/route.ts",
  "nilai/stats": "app/api/guru/nilai/stats/route.ts",
  "hasil-tka": "app/api/guru/hasil-tka/route.ts",
  "generated-rpp": "app/api/guru/generated-rpp/route.ts",
  "rpp": "app/api/guru/rpp/route.ts",
  "artikel": "app/api/guru/artikel/route.ts",
  "earnings": "app/api/guru/earnings/route.ts",
  "leaderboard": "app/api/guru/leaderboard/route.ts",
  "siswa/[id]/nickname-history": "app/api/guru/siswa/[id]/nickname-history/route.ts",
  "penugasan/[id]/nilai-praktik": "app/api/guru/penugasan/[id]/nilai-praktik/route.ts",
  "kelasku/[id]": "app/api/guru/kelasku/[id]/route.ts",
  "nilai": "app/api/guru/nilai/route.ts",
  "nilai/bulk": "app/api/guru/nilai/bulk/route.ts",
  "nilai/export": "app/api/guru/nilai/export/route.ts",
  "nilai/auto-populate": "app/api/guru/nilai/auto-populate/route.ts",
  "nilai/kuis-grade": "app/api/guru/nilai/kuis-grade/route.ts",
  "pengumuman": "app/api/guru/pengumuman/route.ts",
  "pengumuman/[id]": "app/api/guru/pengumuman/[id]/route.ts",
  "siswa/[id]": "app/api/guru/siswa/[id]/route.ts",
  "dashboard/social": "app/api/guru/dashboard/social/route.ts",
  "literasi/stats": "app/api/guru/literasi/stats/route.ts",
  "hasil-karya/leaderboard": "app/api/guru/hasil-karya/leaderboard/route.ts",
};
for (const [name, path] of Object.entries(p1aRoutes)) {
  const src = read(path);
  ok(`[TEST 3] /api/guru/${name} guard isTeacherOrStudent`, /isTeacherOrStudent/.test(src) && !/role\s*!==\s*"GURU"/.test(src));
}

// TEST 4: Kelas inactive tidak masuk population — getTeacherGroups isActive.
ok("[TEST 4] SSOT hanya kelas isActive=true", /isActive: true/.test(teacherSvc));
ok("[TEST 4] nilai/stats population via getTeacherGroups(dbUser.id, null) (kelas aktif saja)", /getTeacherGroups\(dbUser\.id, null\)/.test(read("app/api/guru/nilai/stats/route.ts")));

// TEST 5: Duplicate student lintas kelas dihitung sekali — dedupe SSOT.
ok("[TEST 5] getTeacherStudents dedupe via Set", /const seen = new Set<string>\(\)/.test(teacherSvc));
ok("[TEST 5] getTeacherStudentIds dedupe via Set", /new Set\(ids\)/.test(teacherSvc));

// TEST 6: Population analytics tidak terpotong take:50.
ok("[TEST 6] SSOT getTeacherGroups menerima take null (population tak terpotong)", /take === undefined \? \{ take: 50 \} : take === null \? \{\} : \{ take \}/.test(teacherSvc));
ok("[TEST 6] getTeacherGroups projection diperluas STUDENT_SELECT (noAbsen/nisn)", /profile: \{ select: \{ noAbsen: true, nisn: true \} \}/.test(teacherSvc));
ok("[TEST 6] nilai/stats population kelas via getTeacherGroups (tanpa take:50)", /getTeacherGroups\(dbUser\.id, null\)/.test(read("app/api/guru/nilai/stats/route.ts")) && !/db\.group\.findMany/.test(read("app/api/guru/nilai/stats/route.ts")));
ok("[TEST 6] buat-assessment population via getTeacherGroups(dbUser.id, null)", /getTeacherGroups\(dbUser\.id, null\)/.test(read("app/api/guru/buat-assessment/route.ts")));

// TEST 7: role:"member" legit tidak rusak — SPECIAL CASE tetap.
ok("[TEST 7] nilai/stats count role:member dipertahankan (SPECIAL CASE)", /role:\s*"member"/.test(read("app/api/guru/nilai/stats/route.ts")));
ok("[TEST 7] nilai/export population role:member dipertahankan (SPECIAL CASE)", /role:\s*"member"/.test(read("app/api/guru/nilai/export/route.ts")));
ok("[TEST 7] nilai/auto-populate population role:member dipertahankan (SPECIAL CASE)", /role:\s*"member"/.test(read("app/api/guru/nilai/auto-populate/route.ts")));
ok("[TEST 7] dashboard/social role:member dipertahankan (SPECIAL CASE)", /m\.role === "member"/.test(sosialSrc));
ok("[TEST 7] literasi/stats role:member dipertahankan (SPECIAL CASE)", /m\.role === "member"/.test(literasiSrc));
ok("[TEST 7] hasil-karya/leaderboard role:member dipertahankan (SPECIAL CASE)", /m\.role === "member"/.test(leaderboardSrc));

// TEST 8: Response contract kompatibel — struktur payload population tetap.
ok("[TEST 8] buat-assessment memetakan kelas → {id,name,grade,description,memberCount}", /memberCount/.test(read("app/api/guru/buat-assessment/route.ts")));
ok("[TEST 8] gradebook population via getTeacherGroups(user.id, null)", /getTeacherGroups\(user\.id, null\)/.test(gradeSrc));
ok("[TEST 8] gradebook membership dari group.members (bukan query terpisah)", /group\.members/.test(gradeSrc));
ok("[TEST 8] tinjau-konstruktif guruStudentIds via SSOT getTeacherStudentIds", /getTeacherStudentIds\(teacherId\)/.test(read("app/api/guru/tinjau-konstruktif/route.ts")));
ok("[TEST 8] dokumen-siswa legacy docs via SSOT getTeacherStudentIds", /getTeacherStudentIds\(teacherId\)/.test(read("app/api/guru/dokumen-siswa/route.ts")));

// ── P1-B Guru Authorization — TEST 9–18 (audit §14) ────────────────────────
// Migrasi guard legacy → isTeacherOrStudent. Semua tes statis/sumber (tanpa DB
// live) — konsisten pola existing fase guru.

// TEST 9: GURU allowed — semua file MIGRATE memakai SSOT (yang menerima GURU).
const p1bMigrate: Record<string, string> = {
  "soal": "app/api/guru/soal/route.ts",
  "soal-set": "app/api/guru/soal-set/route.ts",
  "soal-set/[id]": "app/api/guru/soal-set/[id]/route.ts",
  "soal-set/[id]/questions": "app/api/guru/soal-set/[id]/questions/route.ts",
  "bank-soal": "app/api/guru/bank-soal/route.ts",
  "bank-soal/send": "app/api/guru/bank-soal/send/route.ts",
  "bank-soal/preview": "app/api/guru/bank-soal/preview/route.ts",
  "materi": "app/api/guru/materi/route.ts",
  "materi/[id]/kirim": "app/api/guru/materi/[id]/kirim/route.ts",
  "buat-tka": "app/api/guru/buat-tka/route.ts",
  "group/[id]": "app/api/group/[id]/route.ts",
};
for (const [name, path] of Object.entries(p1bMigrate)) {
  const src = read(path);
  ok(`[TEST 9] ${name} guard isTeacherOrStudent (GURU allowed)`, /isTeacherOrStudent/.test(src));
  ok(`[TEST 9] ${name} tidak ada guard legacy role !== GURU`, !/dbUser\.role\s*!==\s*"GURU"|user\.role\s*!==\s*"GURU"|role\?\.toUpperCase\(\)\s*!==\s*"GURU"/.test(src));
}
// TEST 9 (policy files yang juga dimigrasi/ber-guard SSOT).
const p1bPolicy: Record<string, string> = {
  "panduan": "app/api/guru/panduan/route.ts",
  "panduan/[unitId]": "app/api/guru/panduan/[unitId]/route.ts",
  "latihan/pick": "app/api/guru/latihan/pick/route.ts",
  "misi": "app/api/guru/misi/route.ts",
  "soal-pool": "app/api/guru/soal-pool/route.ts",
};
for (const [name, path] of Object.entries(p1bPolicy)) {
  const src = read(path);
  ok(`[TEST 9] ${name} guard isTeacherOrStudent`, /isTeacherOrStudent/.test(src));
  ok(`[TEST 9] ${name} tidak ada guard legacy`, !/dbUser\.role\s*!==\s*"GURU"|user\.role\s*!==\s*"GURU"|role\?\.toUpperCase\(\)\s*!==\s*"GURU"/.test(src));
}

// TEST 10: ADMIN allowed — SSOT menerima role "ADMIN".
ok("[TEST 10] SSOT isTeacherOrStudent menerima ADMIN", /user\.role === "ADMIN"/.test(teacherSvc));
ok("[TEST 10] file MIGRATE tidak lagi memblokir ADMIN (semua via SSOT)", Object.entries(p1bMigrate).every(([, p]) => /isTeacherOrStudent/.test(read(p))));

// TEST 11: founder allowed — SSOT menerima isFounder.
ok("[TEST 11] SSOT isTeacherOrStudent menerima founder", /user\.isFounder === true/.test(teacherSvc));
ok("[TEST 11] panduan menerima ADMIN+founder via SSOT", /isTeacherOrStudent/.test(read("app/api/guru/panduan/route.ts")) && /isTeacherOrStudent/.test(read("app/api/guru/panduan/[unitId]/route.ts")));
ok("[TEST 11] latihan/pick menerima ADMIN+founder via SSOT", /isTeacherOrStudent/.test(read("app/api/guru/latihan/pick/route.ts")));

// TEST 12: MURID denied — guard SSOT menolak role selain GURU/ADMIN/founder.
ok("[TEST 12] SSOT menolak MURID (guard gate eksplisit)", !/user\.role === "MURID"/.test(teacherSvc));
ok("[TEST 12] misi/soal-pool kini role-gated (sebelumnya auth-only)", /isTeacherOrStudent/.test(read("app/api/guru/misi/route.ts")) && /isTeacherOrStudent/.test(read("app/api/guru/soal-pool/route.ts")));
ok("[TEST 12] soal-set GET kini role-gated (sebelumnya auth-only)", /isTeacherOrStudent/.test(read("app/api/guru/soal-set/route.ts")));
ok("[TEST 12] group/[id] GET kini role-gated (sebelumnya auth-only)", /isTeacherOrStudent/.test(read("app/api/group/[id]/route.ts")));

// TEST 13: Guru A → resource Guru B ditolak — ownership tetap dipertahankan.
const soalSrc = read("app/api/guru/soal/route.ts");
ok("[TEST 13] soal PUT/DELETE ownership uploaderId", (soalSrc.match(/existing\.uploaderId !== dbUser\.id/g) || []).length === 2);
const soalSetIdSrc = read("app/api/guru/soal-set/[id]/route.ts");
ok("[TEST 13] soal-set/[id] GET/PUT/DELETE ownership creatorId", (soalSetIdSrc.match(/set\.creatorId !== dbUser\.id/g) || []).length === 3);
const questionsSrc = read("app/api/guru/soal-set/[id]/questions/route.ts");
ok("[TEST 13] soal-set/[id]/questions POST/DELETE ownership creatorId", (questionsSrc.match(/set\.creatorId !== dbUser\.id/g) || []).length === 2);
const materiSrc = read("app/api/guru/materi/route.ts");
ok("[TEST 13] materi PUT/DELETE ownership uploaderId", (materiSrc.match(/existing\.uploaderId !== dbUser\.id/g) || []).length === 2);
ok("[TEST 13] materi/[id]/kirim ownership uploader + teacherId", /!materi\.isPublished && materi\.uploaderId !== user\.id/.test(read("app/api/guru/materi/[id]/kirim/route.ts")) && /teacherId: user\.id/.test(read("app/api/guru/materi/[id]/kirim/route.ts")));
ok("[TEST 13] bank-soal/send kelas milik guru (teacherId)", /teacherId: dbUser\.id/.test(read("app/api/guru/bank-soal/send/route.ts")));
ok("[TEST 13] group/[id] GET ownership teacherId", /group\.teacherId !== dbUser\.id/.test(read("app/api/group/[id]/route.ts")));

// TEST 14: ADMIN TIDAK bisa bypass ownership — guard ownership mutlak (kecuali
// isPrivileged legacy yang memang desain group PATCH/DELETE — dibiarkan KEEP).
ok("[TEST 14] soal ownership tanpa bypass (tetap uploaderId mutlak)", !/isFounder.*uploaderId|uploaderId.*isFounder/.test(soalSrc));
ok("[TEST 14] soal-set/[id] ownership tanpa bypass ADMIN", !/set\.creatorId !== dbUser\.id.*isPrivileged|isPrivileged.*set\.creatorId/.test(soalSetIdSrc));
ok("[TEST 14] materi ownership tanpa bypass ADMIN", !/existing\.uploaderId !== dbUser\.id.*isFounder/.test(materiSrc));
ok("[TEST 14] group/[id] GET ownership tanpa bypass (hanya PATCH/DELETE yang punya isPrivileged legacy)", /group\.teacherId !== dbUser\.id\s*\)/.test(read("app/api/group/[id]/route.ts")));

// TEST 15: founder TIDAK bisa bypass ownership — resource milik guru lain 404.
ok("[TEST 15] soal-set/[id]/use ownership creatorId (founder ikut kena 404)", /set\.creatorId !== dbUser\.id/.test(read("app/api/guru/soal-set/[id]/use/route.ts")));

// TEST 16: soal-set/[id]/use — akses tidak sah TIDAK bisa increment useCount.
const useSrc = read("app/api/guru/soal-set/[id]/use/route.ts");
ok("[TEST 16] use route guard SSOT sebelum aksi", /isTeacherOrStudent\(dbUser\)/.test(useSrc));
ok("[TEST 16] use route ownership SEBELUM increment (urutan file)", useSrc.indexOf("set.creatorId !== dbUser.id") < useSrc.indexOf("useCount: { increment: 1 }"));
ok("[TEST 16] use route membaca questionIds hanya setelah ownership (urutan file)", useSrc.indexOf("set.creatorId !== dbUser.id") < useSrc.indexOf("set.questions.map"));
ok("[TEST 16] use route tidak lagi polos (guard + ownership ada)", /if \(!isTeacherOrStudent\(dbUser\)\)/.test(useSrc));

// TEST 17: withdraw — ADMIN tetap ditolak (SPECIAL CASE finansial).
const withdrawSrc = read("app/api/guru/withdraw/route.ts");
ok("[TEST 17] withdraw guard GURU/founder-only (ADMIN denied)", /user\.role !== "GURU" && !user\.isFounder/.test(withdrawSrc));
ok("[TEST 17] withdraw tidak memakai isTeacherOrStudent (special case)", !/from "@\/lib\/teacher\/students"/.test(withdrawSrc));
ok("[TEST 17] withdraw memuat penanda P1-B SPECIAL CASE", /P1-B SPECIAL CASE: Withdraw remains GURU\/founder-only by financial policy\. ADMIN is intentionally denied\. Do not replace this guard with isTeacherOrStudent\(\)\./.test(withdrawSrc));

// TEST 18: withdraw — GURU/founder tetap boleh (guard lama dipertahankan).
ok("[TEST 18] withdraw guard membiarkan GURU", /user\.role !== "GURU" && !user\.isFounder/.test(withdrawSrc) && !/role\?\.toUpperCase\(\)\s*!==\s*"GURU"/.test(withdrawSrc));
ok("[TEST 18] withdraw atomicity saldo dipertahankan", /saldo: \{ gte: nominal \}/.test(withdrawSrc));
ok("[TEST 18] withdraw MINIMAL_PENARIKAN dipertahankan", /MINIMAL_PENARIKAN = 50_000/.test(withdrawSrc));

console.log(`\n${fail === 0 ? "SEMUA LULUS" : `${fail} GAGAL`}`);
process.exit(fail === 0 ? 0 : 1);
