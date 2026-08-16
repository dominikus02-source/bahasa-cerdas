/**
 * STEP 6.6 — BC CLASSROOM STUDENT SUBMISSION & FEEDBACK EXPERIENCE
 * Test statik: status murid, link karya (UI + validasi server), feedback,
 * notifikasi nama guru, deep-link, evidence honesty, protected zones.
 * Tanpa DB write.
 *
 * Run: npm run test:bc-classroom-student-submission
 */
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const exists = (p: string) => existsSync(p);

let passed = 0;
let failed = 0;
let discovered = 0;
function check(name: string, fn: () => boolean) {
  discovered++;
  try {
    if (fn()) { passed++; console.log(`  ✅ ${name}`); }
    else { failed++; console.log(`  ❌ ${name}`); }
  } catch (e) {
    failed++; console.log(`  ❌ ${name} — ${(e as Error).message}`);
  }
}

const muridApi = read("app/api/murid/kelasku/[id]/route.ts");
const muridPage = read("app/(dashboard)/murid/kelasku/[id]/page.tsx");
const kerjakan = read("app/arena/tugas/[assignId]/kerjakan/page.tsx");
const praktikRoute = read("app/api/murid/penugasan/[id]/praktik/route.ts");
const penugasanRoute = read("app/api/guru/penugasan/route.ts");
const quizAssignRoute = read("app/api/guru/quiz/[id]/assign/route.ts");
const nilaiPraktik = read("app/api/guru/penugasan/[id]/nilai-praktik/route.ts");
const quizRoute = read("app/api/murid/quiz/[id]/route.ts");
const css = read("components/kelas/classroom.css");

function main() {
  console.log("\n📋 STEP 6.6 — BC CLASSROOM STUDENT SUBMISSION TEST");
  console.log("=".repeat(60));

  // 1-3. Tugas terlihat & status
  console.log("\n── 1-3. Status murid ──");
  check("1. halaman kelas murid menampilkan tugas + latihan + materi",
    () => muridPage.includes("Kerjakan Tugas") && muridPage.includes("Mulai Latihan") && muridPage.includes("Baca Materi"));
  check("2. status BELUM_DIKERJAKAN ada di API + UI",
    () => muridApi.includes("BELUM_DIKERJAKAN") && muridPage.includes("Belum dikerjakan"));
  check("3. status SEDANG_DIKERJAKAN", () => muridApi.includes("SEDANG_DIKERJAKAN") && muridPage.includes("Sedang dikerjakan"));

  // 4-5. Submission & idempotent
  console.log("\n── 4-5. Submission ──");
  check("4. praktik route upsert (resubmit aman — bukan create duplikat)",
    () => praktikRoute.includes("upsert") && praktikRoute.includes("penugasanId_userId"));
  check("5. praktikUrl => 'Sudah dikumpulkan' (konsisten dengan hitungan guru)",
    () => muridApi.includes("s?.praktikUrl") && muridApi.includes('status = "SUDAH_DIKUMPULKAN"'));

  // 6-8. Status lanjutan
  console.log("\n── 6-8. Status lanjutan ──");
  check("6. SUDAH_DIKUMPULKAN di API + UI",
    () => muridApi.includes("SUDAH_DIKUMPULKAN") && muridPage.includes("Sudah dikumpulkan"));
  check("7. DINILAI + nilai tampil", () => muridApi.includes('status = "DINILAI"') && muridPage.includes("Sudah dinilai"));
  check("8. feedback tampil di UI murid ('Feedback guru')",
    () => muridPage.includes("Feedback guru") && muridApi.includes("feedback"));

  // 9-10. Deadline
  console.log("\n── 9-10. Deadline ──");
  check("9. deadline manusiawi (humanDeadline + label Terlambat)",
    () => muridPage.includes("humanDeadline") && read("lib/classroom/deadline.ts").includes("Terlambat"));
  check("10. 'Deadline: Besok' pattern", () => muridPage.includes("Deadline: ${dl.label}"));

  // 11-12. Link karya valid / javascript ditolak
  console.log("\n── 11-12. Link karya ──");
  check("11. UI kerjakan punya input 'tempel link karyamu' + contoh",
    () => kerjakan.includes("tempel link karyamu") && kerjakan.includes("YouTube") && kerjakan.includes("Canva"));
  check("12. server menolak non-http(s) (javascript:/file:)",
    () => praktikRoute.includes('protocol !== "http:"') && praktikRoute.includes("https:"));
  check("12. client hint https:// + tombol Simpan Link", () => kerjakan.includes("https://") && kerjakan.includes("Simpan Link"));

  // 13. Non-member ditolak
  console.log("\n── 13. Keamanan ──");
  check("13. murid API menolak non-member (403) + praktik route cek membership",
    () => muridApi.includes("status: 403") && praktikRoute.includes("penugasan.group.members.length"));

  // 14-16. Notifikasi
  console.log("\n── 14-16. Notifikasi ──");
  check("14. penugasan: notif murid 'Dari {guru}' + deep-link /arena/tugas",
    () => penugasanRoute.includes("Dari ${user.fullName}") && penugasanRoute.includes('link: "/arena/tugas"'));
  check("15. quiz assign: notif murid 'Dari {guru}' + deep-link /murid/tugasku",
    () => quizAssignRoute.includes("Dari ${dbUser.fullName}") && quizAssignRoute.includes('link: "/murid/tugasku"'));
  check("16. penilaian: notif 'Tugas Dinilai' + deep-link kerjakan",
    () => nilaiPraktik.includes("Tugas Dinilai") && nilaiPraktik.includes("kerjakan"));

  // 17-18. Empty & error
  console.log("\n── 17-18. States ──");
  check("17. empty aktivitas murid manusiawi",
    () => muridPage.includes("Belum ada aktivitas") && muridPage.includes("Guru akan mengirim"));
  check("18. error murid manusiawi (tanpa raw backend)",
    () => muridPage.includes("Belum dapat memuat kelas.") && !muridPage.includes("Prisma error"));

  // 19-20. Mobile & theme
  console.log("\n── 19-20. Mobile & theme ──");
  check("19. CTA full-width mobile + touch >= 44px",
    () => muridPage.includes("w-full text-sm") && css.includes("min-height: 48px"));
  check("20. dark/light token bc-student",
    () => css.includes(".bc-classroom.bc-student") && css.includes(".dark .bc-classroom.bc-student"));

  // 21-24. Kejujuran
  console.log("\n── 21-24. Kejujuran ──");
  check("21. kerjakan error pesan manusiawi (bukan POST /api 500)",
    () => kerjakan.includes("belum berhasil disimpan") && !kerjakan.includes("500 Internal"));
  check("22. tidak ada XP baru dari submission praktik (praktik route tanpa awardXp)",
    () => !praktikRoute.includes("awardXp") && !praktikRoute.includes("addCoin"));
  check("23. LearningEvidence hanya di quiz (kontrak tersedia); praktik tidak menulis evidence palsu",
    () => quizRoute.includes("replaceLearningEvidenceBatch") && !praktikRoute.includes("learningEvidence"));
  check("24. NO fake mastery: status murid dari submission (bukan klaim skill)",
    () => !muridApi.includes("masteryState") && muridApi.includes("userId: user.id"));

  // 25. Protected zones
  console.log("\n── 25. Protected zones ──");
  check("25. protected zones 0 diff (prisma/gamification/learning-loop/adaptive/diagnostic/arena/coins/apk/player)",
    () => {
      const diff = execSync(`git diff --name-only HEAD -- prisma/ lib/gamification/ lib/learning-loop/ lib/adaptive-practice/ lib/learner-state/ lib/diagnostic/ app/api/player/ engines/ lib/apk.ts lib/coins.ts lib/award-xp.ts`, { encoding: "utf8", cwd: process.cwd() }).trim();
      return diff.length === 0;
    });

  console.log("\n" + "=".repeat(60));
  console.log(`Discovered: ${discovered}`);
  console.log(`Executed: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: 0`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

main();
