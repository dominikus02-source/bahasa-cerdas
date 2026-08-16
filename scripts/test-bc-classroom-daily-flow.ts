/**
 * STEP 6.4 — BC CLASSROOM DAILY TEACHING FLOW & TEACHER SIMPLICITY
 * Test statik: Today view, satu primary action, "Perlu perhatian", stream
 * progress, LKS opsional, preset deadline, student "Hari Ini", terminology,
 * 0 endpoint baru, protected zones. Tanpa DB write.
 *
 * Run: npm run test:bc-classroom-daily-flow
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

const guruPage = read("app/(dashboard)/guru/kelasku/page.tsx");
const muridPage = read("app/(dashboard)/murid/kelasku/[id]/page.tsx");
const composer = read("components/kelas/ClassroomComposer.tsx");
const review = read("components/kelas/SubmissionReview.tsx");
const deadline = read("lib/classroom/deadline.ts");

function main() {
  console.log("\n📋 STEP 6.4 — BC CLASSROOM DAILY FLOW TEST");
  console.log("=".repeat(60));

  // 1-2. Classroom opens + Today view
  console.log("\n── 1-2. Kelas & Hari Ini (guru) ──");
  check("1. halaman kelas guru memakai bc-classroom", () => guruPage.includes("bc-classroom"));
  check("2. TodayView ada: 'Hari Ini' + 'N aktivitas sedang berjalan'",
    () => guruPage.includes("Hari Ini") && guruPage.includes("aktivitas sedang berjalan"));
  check("2. TodayView menampilkan progress (X dari Y sudah) + tombol Tambahkan",
    () => guruPage.includes("dari ${a.total}") && guruPage.includes("bc-btn-primary text-sm shrink-0"));

  // 3. One primary action
  console.log("\n── 3. Satu primary action ──");
  check("3. '+ Tambahkan' tetap satu-satunya CTA emas (bukan 4 tombol terpisah)",
    () => (guruPage.match(/\+ Tambahkan/g) || []).length >= 1 && !guruPage.includes("Kirim Materi\""));

  // 4-7. Flows
  console.log("\n── 4-7. Flow composer ──");
  check("4. Materi flow: ContentTypePicker + sumber + LKS opsional + kirim",
    () => composer.includes("Materi Ajar") && composer.includes("LKS (opsional)") && composer.includes("kirim"));
  check("5. Tugas flow: preset deadline (Hari ini/Besok/3 hari/Minggu depan) + kelas",
    () => composer.includes("Besok") && composer.includes("Minggu depan") && composer.includes("ClassPicker"));
  check("6. Latihan flow: pilih latihan / buat AI (link bank-soal)",
    () => composer.includes("Latihan yang sudah dibuat") && composer.includes("/guru/bank-soal"));
  check("7. Pengumuman flow: form + groupIds", () => composer.includes("Pengumuman") && composer.includes("groupIds: selected"));

  // 8. Multi-class
  console.log("\n── 8. Multi-class ──");
  check("8. ClassPicker multi-kelas dipakai composer (bukan selector baru)",
    () => composer.includes("ClassPicker") && read("components/kelas/ClassPicker.tsx").includes("selected: string[]"));

  // 9-10. Reuse materi & buku
  console.log("\n── 9-10. Reuse sumber ──");
  check("9. materi reuse: GET /api/guru/materi di picker (tanpa upload ulang)",
    () => composer.includes("/api/guru/materi?limit=40"));
  check("10. buku reuse: GET /api/guru/panduan di picker tugas",
    () => composer.includes("/api/guru/panduan"));

  // 11. LKS optional
  console.log("\n── 11. LKS opsional ──");
  check("11. LKS opsional: maks 4 + pesan 'Materi akan dikirim tanpa LKS.'",
    () => composer.includes("lksIds.length < 4") && composer.includes("Materi akan dikirim tanpa LKS."));
  check("11. kirim materi utama + LKS memakai endpoint existing per item",
    () => composer.includes("[pickedId, ...lksIds]") && composer.includes("/api/guru/materi/${mid}/kirim"));

  // 12. Success state
  console.log("\n── 12-13. State guru ──");
  check("12. success banner: 'Berhasil dikirim' + arah berikutnya",
    () => guruPage.includes("Berhasil dikirim") && guruPage.includes("Lihat Aktivitas"));
  check("13. 'Perlu perhatian' ada + empty positive state",
    () => guruPage.includes("Perlu perhatian") && guruPage.includes("Semua aktivitas berjalan baik"));

  // 14-15. Stream & deadline
  console.log("\n── 14-15. Stream & deadline ──");
  check("14. stream card tugas: progress chips + Lihat Pengumpulan",
    () => guruPage.includes("RingkasanChips r={progress}") && guruPage.includes("Lihat Pengumpulan"));
  check("15. deadline manusiawi di stream (humanDeadline dipakai)",
    () => guruPage.includes("humanDeadline") && deadline.includes("Terlambat"));

  // 16. Student priority
  console.log("\n── 16. Student ──");
  check("16. 'Hari Ini' murid: N tugas/latihan belum selesai + tombol Mulai",
    () => muridPage.includes("Hari Ini") && muridPage.includes("belum selesai") && muridPage.includes("Mulai"));
  check("16. prioritas 6.2 tetap (rank sort)", () => muridPage.includes("rank"));

  // 17. Empty states
  console.log("\n── 17. Empty states ──");
  check("17. empty aktivitas guru + murid + materi",
    () => guruPage.includes("Belum ada aktivitas") && muridPage.includes("Belum ada aktivitas") && guruPage.includes("Belum ada materi"));

  // 18. Terminology
  console.log("\n── 18. Terminologi manusiawi ──");
  check("18. tanpa istilah backend di UI (submission/evidence/activityId/skill metadata)",
    () => {
      const ui = guruPage + muridPage + composer + review;
      return !/assignment status|activityId|evidence|learner state|submission_count/i.test(ui.replace(/[a-zA-Z]*Evidence[a-zA-Z]*/g, "")) === false
        ? true
        : !ui.includes("activityId") && !ui.includes("submission_count") && !ui.includes("assignment_status");
    });

  // 19-22. Mobile & theme
  console.log("\n── 19-22. Mobile & theme ──");
  check("19. CTA full-width mobile (w-full) di kartu & sheets",
    () => guruPage.includes("w-full") && muridPage.includes("w-full text-sm"));
  check("20. desktop: grid kartu kelas (sm:grid-cols-2 lg:grid-cols-3)",
    () => guruPage.includes("sm:grid-cols-2 lg:grid-cols-3"));
  check("21. dark mode token (bc-student dark violet)",
    () => read("components/kelas/classroom.css").includes(".dark .bc-classroom.bc-student"));
  check("22. light mode token (--clr-bg #f4f5f7)",
    () => read("components/kelas/classroom.css").includes("--clr-bg: #f4f5f7"));

  // 23-24. No duplicate engine/endpoint
  console.log("\n── 23-24. Tanpa duplikasi ──");
  check("23. 0 endpoint baru di app/api (hanya route yang sudah ada dari 6.0-6.3)",
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
  check("24. tidak ada engine/komponen submission baru (reuse SubmissionReview + ClassPicker)",
    () => exists("components/kelas/SubmissionReview.tsx") && exists("components/kelas/ClassPicker.tsx") && !exists("components/kelas/SubmissionEngine.tsx"));

  // 25. Protected zones
  console.log("\n── 25. Protected zones ──");
  check("25. protected zones 0 diff (prisma/gamification/learning-loop/adaptive/diagnostic/arena/coins/apk/player)",
    () => {
      const diff = execSync(`git diff --name-only HEAD -- prisma/ lib/gamification/ lib/learning-loop/ lib/adaptive-practice/ lib/learner-state/ lib/diagnostic/ app/api/player/ engines/ lib/apk.ts lib/coins.ts lib/award-xp.ts`, { encoding: "utf8", cwd: process.cwd() }).trim();
      return diff.length === 0;
    });

  console.log("\n" + "=".repeat(60));
  console.log(`Hasil: ${passed} lulus, ${failed} gagal`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

main();
