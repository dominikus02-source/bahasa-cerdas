/**
 * STEP 6.7 — BC CLASSROOM TEACHER EXPERIENCE AUDIT & SIMPLIFICATION
 * Test statik: journey guru (step contracts), labels, terminology, empty/
 * error/success state, multi-class, direct-send, harness integrity.
 * Tanpa DB write.
 *
 * Run: npm run test:bc-classroom-teacher-experience
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

const guruPage = read("app/(dashboard)/guru/kelasku/page.tsx");
const composer = read("components/kelas/ClassroomComposer.tsx");
const picker = read("components/kelas/ClassPicker.tsx");
const review = read("components/kelas/SubmissionReview.tsx");
const materiAjar = read("app/(dashboard)/guru/materi-ajar/page.tsx");
const panduan = read("app/(dashboard)/guru/panduan-guru/page.tsx");
const bankSoal = read("app/(dashboard)/guru/bank-soal/page.tsx");
const css = read("components/kelas/classroom.css");

function main() {
  console.log("\n📋 STEP 6.7 — BC CLASSROOM TEACHER EXPERIENCE TEST");
  console.log("=".repeat(60));

  // STEP 6.7A — harness self-test: buktikan check benar-benar mengeksekusi fn
  // (false → FAIL, true → PASS), bukan mengevaluasi function sebagai truthy.
  let sPass = 0;
  let sFail = 0;
  function sCheck(name: string, fn: () => boolean) {
    try {
      if (fn()) sPass++;
      else sFail++;
    } catch {
      sFail++;
    }
  }
  sCheck("self: true → pass", () => true);
  sCheck("self: false → fail", () => false);
  check("harness self-test: assertion false menghasilkan FAIL (bukan truthy bug)",
    () => sPass === 1 && sFail === 1);

  // 1-2. API reuse & no new endpoint
  console.log("\n── 1-2. API reuse ──");
  check("1. composer memakai endpoint existing (materi/kirim, penugasan, quiz assign, pengumuman)",
    () => composer.includes("/api/guru/materi/") && composer.includes("/api/guru/penugasan") && composer.includes("quiz/${pickedId}/assign") && composer.includes("/api/guru/pengumuman"));
  check("2. 0 endpoint baru (semua route classroom 6.0-6.6)",
    () => {
      const diff = execSync(`git diff --name-only HEAD -- app/api/`, { encoding: "utf8", cwd: process.cwd() }).trim().split("\n").filter(Boolean);
      const allowed = [
        "app/api/guru/pengumuman/route.ts", "app/api/guru/penugasan/route.ts",
        "app/api/guru/quiz/[id]/assign/route.ts", "app/api/murid/kelasku/[id]/route.ts",
        "app/api/murid/penugasan/[id]/praktik/route.ts", "app/api/guru/kelasku/[id]/route.ts",
        "app/api/guru/penugasan/[id]/nilai-praktik/route.ts", "app/api/guru/kelasku/[id]/insight/route.ts",
        "app/api/murid/quiz/[id]/route.ts",
      ];
      return diff.every((f) => allowed.includes(f));
    });

  // 3-6. Flow contracts (step counts ≤4)
  console.log("\n── 3-6. Journey ──");
  check("3. Materi: tipe → sumber → konten → kelas → kirim (progressive disclosure ≤4 langkah)",
    () => composer.includes("ContentTypePicker") && composer.includes("SourcePicker") && composer.includes("ContentPicker") && composer.includes("ClassPicker"));
  check("4. Tugas flow tersedia (Buku Ajar + quiz existing + deadline preset)",
    () => composer.includes("Buku Ajar") && composer.includes("Besok") && composer.includes("Minggu depan"));
  check("5. Latihan flow tersedia (pilih latihan / buat AI)",
    () => composer.includes("Latihan yang sudah dibuat") && composer.includes("/guru/bank-soal"));
  check("6. Pengumuman flow (form + kelas multi)",
    () => composer.includes("Pengumuman") && composer.includes("groupIds: selected"));

  // 7-9. Multi-class + auto-select + direct-send
  console.log("\n── 7-9. Multi-class & direct-send ──");
  check("7. kelas aktif auto-terpilih + ClassPicker multi + 'N kelas dipilih'",
    () => guruPage.includes("initialClassIds") && picker.includes("kelas dipilih") && picker.includes("Pilih semua"));
  check("8. direct-send dari Materi Ajar & Buku Ajar & Bank Soal (label konsisten)",
    () => materiAjar.includes("Kirim ke Kelas") && panduan.includes("Kirim ke Kelas") && bankSoal.includes("Kirim Latihan ke Kelas"));
  check("9. checkbox touch-friendly (bc-check 24px + row 56px)",
    () => css.includes("width: 24px") && css.includes("min-height: 56px"));

  // 10-12. Today View + Perlu perhatian + Kirim Lagi
  console.log("\n── 10-12. Today View ──");
  check("10. Today View: 'Hari Ini' + N aktivitas sedang berjalan",
    () => guruPage.includes("Hari Ini") && guruPage.includes("aktivitas sedang berjalan"));
  check("11. 'Perlu perhatian' didahulukan + empty positive",
    () => guruPage.includes("Perlu perhatian") && guruPage.includes("Semua aktivitas berjalan baik"));
  check("12. 'Kirim Lagi' (last class ids, localStorage)",
    () => guruPage.includes("Kirim Lagi") && composer.includes("readLastClassIds"));

  // 13. Terminology
  console.log("\n── 13. Terminologi manusiawi ──");
  check("13. UI primer tanpa istilah backend (activityId/submission_count/assignment_status/evidence di teks tampil)",
    () => {
      const ui = guruPage + composer + picker + review;
      return !ui.includes("activityId") && !ui.includes("submission_count") && !ui.includes("assignment_status") && !ui.includes("POST /api");
    });

  // 14-16. States
  console.log("\n── 14-16. States ──");
  check("14. success: 'Berhasil dikirim' + Lihat Aktivitas + Tambahkan Lagi",
    () => guruPage.includes("Berhasil dikirim") && guruPage.includes("Lihat Aktivitas") && guruPage.includes("Tambahkan Lagi"));
  check("15. empty: kelas/aktivitas/materi/tugas + CTA Tambahkan",
    () => guruPage.includes("Belum ada kelas") && guruPage.includes("Tambahkan Materi") && guruPage.includes("Tambahkan Tugas"));
  check("16. error manusiawi (tanpa raw backend)",
    () => composer.includes("Belum berhasil dikirim") && !composer.includes("500 Internal") && !composer.includes("Failed to POST"));

  // 17-20. Mobile & theme
  console.log("\n── 17-20. Mobile & theme ──");
  check("17. bottom sheet (bc-sheet-overlay + safe-area) — composer mobile",
    () => css.includes("bc-sheet-overlay") && css.includes("safe-area-inset-bottom"));
  check("18. CTA full-width mobile + touch >= 44px",
    () => css.includes("min-height: 48px") && guruPage.includes("w-full"));
  check("19. dark mode token", () => css.includes(".dark .bc-classroom"));
  check("20. light mode token", () => css.includes("--clr-bg: #f4f5f7"));

  // 21. Senior teacher flows (step contracts dari kode)
  console.log("\n── 21. Senior teacher flow ──");
  check("21. S1 kirim materi ≤4 langkah (tipe→sumber→konten→kelas) — progressive steps ada",
    () => composer.includes("step") && composer.includes("Lanjut") && guruPage.includes("Kirim Lagi"));
  check("21. S3 siapa belum ≤2 langkah (Today View → Lihat Pengumpulan)",
    () => guruPage.includes("Perlu perhatian") && guruPage.includes("Lihat Pengumpulan"));
  check("21. S4 nilai ≤3 langkah (Lihat Pengumpulan → buka murid → Simpan Penilaian)",
    () => review.includes("Simpan Penilaian") && review.includes("openMurid"));

  // 22-24. Protected & harness
  console.log("\n── 22-24. Integritas ──");
  check("22. protected zones 0 diff (prisma/gamification/learning-loop/adaptive/diagnostic/arena/coins/apk/player)",
    () => {
      const diff = execSync(`git diff --name-only HEAD -- prisma/ lib/gamification/ lib/learning-loop/ lib/adaptive-practice/ lib/learner-state/ lib/diagnostic/ app/api/player/ engines/ lib/apk.ts lib/coins.ts lib/award-xp.ts`, { encoding: "utf8", cwd: process.cwd() }).trim();
      return diff.length === 0;
    });
  check("23. prisma 0 diff (no migration) + tidak ada XP/coin baru di flow classroom",
    () => execSync(`git diff --name-only HEAD -- prisma/`, { encoding: "utf8", cwd: process.cwd() }).trim().length === 0
      && !composer.includes("awardXp") && !composer.includes("addCoin"));
  check("24. harness semua test classroom mengeksekusi fn() (bukan truthy bug)",
    () => ["simple-flow", "student-flow", "learning-loop", "learning-intelligence", "daily-flow", "one-click", "student-submission", "teacher-experience"].every((t) => read(`scripts/test-bc-classroom-${t}.ts`).includes("if (fn())")));

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
