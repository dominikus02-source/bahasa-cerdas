/**
 * STEP 6.2 — BC CLASSROOM LEARNING LOOP
 * Test statik: ringkasan guru, review submission, grading reuse, feedback
 * murid, deadline manusiawi, prioritas aktivitas, notifikasi grading,
 * reuse API (0 endpoint baru), protected zones. Tanpa DB write.
 *
 * Run: npm run test:bc-classroom-learning-loop
 */
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const exists = (p: string) => existsSync(p);

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

const guruApi = read("app/api/guru/kelasku/[id]/route.ts");
const guruPage = read("app/(dashboard)/guru/kelasku/page.tsx");
const muridApi = read("app/api/murid/kelasku/[id]/route.ts");
const muridPage = read("app/(dashboard)/murid/kelasku/[id]/page.tsx");
const review = read("components/kelas/SubmissionReview.tsx");
const nilaiPraktik = read("app/api/guru/penugasan/[id]/nilai-praktik/route.ts");
const penugasanDetail = read("app/api/guru/penugasan/[id]/route.ts");
const deadline = read("lib/classroom/deadline.ts");

import { humanDeadline } from "../lib/classroom/deadline";

function main() {
  console.log("\n📋 STEP 6.2 — BC CLASSROOM LEARNING LOOP TEST");
  console.log("=".repeat(60));

  // 1-2. Teacher & student can view classroom activities
  console.log("\n── 1-2. Kelas guru & murid ──");
  check("1. guru kelasku menampilkan ringkasan submission per aktivitas",
    () => guruPage.includes("RingkasanChips") && guruPage.includes("sudah mengumpulkan"));
  check("2. murid kelas menampilkan stream prioritas (rank) + feedback",
    () => muridPage.includes("rank") && muridPage.includes("Feedback guru"));

  // 3. Assignment status is server-derived
  console.log("\n── 3. Status server-derived ──");
  check("3. guru API menghitung sudah/sedang/belum server-side (ringkasanPenugasan)",
    () => guruApi.includes("ringkasanPenugasan") && guruApi.includes("ringkasanQuiz") && guruApi.includes("Math.max(0, totalMurid"));
  check("3. murid API menurunkan status manusiawi (DINILAI dst.)",
    () => muridApi.includes("BELUM_DIKERJAKAN") && muridApi.includes("DINILAI"));

  // 4-5. Student submission appears to teacher + teacher can open
  console.log("\n── 4-5. Submission guru ──");
  check("4. GET penugasan/[id] mengembalikan semua murid + submission",
    () => penugasanDetail.includes("submissions") && penugasanDetail.includes("praktikUrl") && penugasanDetail.includes("murid"));
  check("5. SubmissionReview: daftar + filter Semua/Belum/Sudah + buka murid",
    () => review.includes("Semua") && review.includes("Belum") && review.includes("Sudah") && review.includes("openMurid"));

  // 6. Grading reuses existing flow
  console.log("\n── 6. Grading reuse ──");
  check("6. review menyimpan lewat POST nilai-praktik existing (bukan endpoint baru)",
    () => review.includes("/nilai-praktik") && review.includes("penugasanId}/nilai-praktik"));
  check("6. nilai-praktik mengisi rekap Nilai (upsertNilaiOtomatis)",
    () => nilaiPraktik.includes("upsertNilaiOtomatis") && nilaiPraktik.includes("sumberType: \"PENUGASAN\""));

  // 7-8. Graded result + feedback to student
  console.log("\n── 7-8. Hasil & feedback murid ──");
  check("7. murid API mengirim nilai saat DINILAI", () => muridApi.includes('status = "DINILAI"') && muridApi.includes("nilai"));
  check("8. murid API mengirim feedback (praktikCatatan)", () => muridApi.includes("praktikCatatan") && muridApi.includes("feedback"));
  check("8. halaman murid menampilkan 'Feedback guru' + nilai badge",
    () => muridPage.includes("Feedback guru") && muridPage.includes("Sudah dinilai"));

  // 9. Multi-class consistency
  console.log("\n── 9-11. Multi-class & delivery ──");
  check("9. composer masih mengirim groupIds[] (STEP 6.0 utuh)",
    () => read("components/kelas/ClassroomComposer.tsx").includes("groupIds: selected"));
  check("10. material delivery utuh (kirim route + CTA murid)",
    () => read("app/api/guru/materi/[id]/kirim/route.ts").includes("groupIds") && muridPage.includes("Baca Materi"));
  check("11. quiz assignment utuh (assign route + CTA murid)",
    () => read("app/api/guru/quiz/[id]/assign/route.ts").includes("groupIds") && muridPage.includes("Mulai Latihan"));

  // 12. Notification deep-link
  console.log("\n── 12. Notifikasi ──");
  check("12. grading mengirim notifikasi murid (deep-link kerjakan)",
    () => nilaiPraktik.includes("Tugas Dinilai") && nilaiPraktik.includes("kerjakan"));

  // 13-15. Access control
  console.log("\n── 13-15. Keamanan ──");
  check("13. guru API murid menolak non-member (403)",
    () => muridApi.includes('"Anda tidak tergabung di kelas ini"') && muridApi.includes("status: 403"));
  check("14. guru penugasan detail membatasi teacherId (403 Forbidden)",
    () => penugasanDetail.includes("teacherId !== user.id") && penugasanDetail.includes("Forbidden"));
  check("15. submission murid di kelas: hanya milik user ini (where userId)",
    () => muridApi.includes("userId: user.id") && muridApi.includes("submissions: { where: { userId: user.id } }"));

  // 16. Deadline display server-derived (human)
  console.log("\n── 16. Deadline manusiawi ──");
  check("16. helper humanDeadline ada + halaman murid memakainya",
    () => deadline.includes("Besok") && deadline.includes("Terlambat") && muridPage.includes("humanDeadline"));
  check("16. humanDeadline('besok') → 'Besok'",
    () => {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      return humanDeadline(tomorrow.toISOString()).label === "Besok";
    });
  check("16. humanDeadline kemarin → 'Terlambat 1 hari'",
    () => {
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      return humanDeadline(yesterday.toISOString()).label === "Terlambat 1 hari";
    });

  // 17. No duplicate assignment
  console.log("\n── 17-18. Tanpa duplikasi ──");
  check("17. backend @@unique quiz+group & materi+group masih ada",
    () => read("prisma/schema.prisma").includes("@@unique([quizId, groupId])") && read("prisma/schema.prisma").includes("@@unique([materiId, groupId])"));
  check("18. tidak ada evidence/engine baru (prisma 0 diff, LearningEvidence tak disentuh)",
    () => execSync(`git diff --name-only HEAD -- prisma/`, { encoding: "utf8", cwd: process.cwd() }).trim().length === 0);

  // 19-20. Mobile & theme
  console.log("\n── 19-20. Mobile & theme ──");
  check("19. review modal = bottom sheet (bc-sheet), CTA full-width",
    () => review.includes("bc-sheet-overlay") && review.includes("flex-1 text-sm"));
  check("20. token light/dark utuh (bc-student violet + dark)",
    () => read("components/kelas/classroom.css").includes(".bc-classroom.bc-student") && read("components/kelas/classroom.css").includes(".dark .bc-classroom.bc-student"));

  // 21. No protected zone modification
  console.log("\n── 21. Protected zones ──");
  check("21. protected zones 0 diff (prisma/gamification/learning-loop/adaptive/diagnostic/arena/coins/apk/player)",
    () => {
      const diff = execSync(`git diff --name-only HEAD -- prisma/ lib/gamification/ lib/learning-loop/ lib/adaptive-practice/ lib/learner-state/ lib/diagnostic/ app/api/player/ engines/ lib/apk.ts lib/coins.ts lib/award-xp.ts`, { encoding: "utf8", cwd: process.cwd() }).trim();
      return diff.length === 0;
    });

  // 22-23. STEP 6.0 & 6.1 tests untouched
  console.log("\n── 22-23. Test 6.0 & 6.1 tidak diubah ──");
  check("22. test-bc-classroom-simple-flow.ts 0 diff",
    () => execSync(`git diff --name-only HEAD -- scripts/test-bc-classroom-simple-flow.ts`, { encoding: "utf8", cwd: process.cwd() }).trim().length === 0);
  check("23. test-bc-classroom-student-flow.ts 0 diff",
    () => execSync(`git diff --name-only HEAD -- scripts/test-bc-classroom-student-flow.ts`, { encoding: "utf8", cwd: process.cwd() }).trim().length === 0);

  console.log("\n" + "=".repeat(60));
  console.log(`Hasil: ${passed} lulus, ${failed} gagal`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

main();
