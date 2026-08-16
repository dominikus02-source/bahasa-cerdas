/**
 * STEP 6.1 — BC CLASSROOM STUDENT EXPERIENCE · SIMPLE LEARNING FLOW
 * Test statik: halaman kelas murid, stream 4 tipe, status submission,
 * deep-link, URL validation, notifikasi, reuse API, protected zones.
 * Tanpa DB write.
 *
 * Run: npm run test:bc-classroom-student-flow
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

const page = read("app/(dashboard)/murid/kelasku/[id]/page.tsx");
const api = read("app/api/murid/kelasku/[id]/route.ts");
const praktikRoute = read("app/api/murid/penugasan/[id]/praktik/route.ts");
const penugasanRoute = read("app/api/guru/penugasan/route.ts");
const quizAssignRoute = read("app/api/guru/quiz/[id]/assign/route.ts");
const css = read("components/kelas/classroom.css");

function main() {
  console.log("\n📋 STEP 6.1 — BC CLASSROOM STUDENT FLOW TEST");
  console.log("=".repeat(60));

  // 1. Student can see class activity
  console.log("\n── 1-2. Halaman kelas murid ──");
  check("1. halaman /murid/kelasku/[id] memakai bc-classroom bc-student",
    () => page.includes("bc-classroom") && page.includes("bc-student"));
  check("1. API agregat murid ada (GET /api/murid/kelasku/[id])", () => exists("app/api/murid/kelasku/[id]/route.ts") && api.includes("export async function GET"));
  check("1. halaman menampilkan Aktivitas stream", () => page.includes("Aktivitas") && page.includes("stream.map"));
  check("2. halaman menampilkan materi (judul + deskripsi + guru + tanggal)",
    () => page.includes("Baca Materi") && page.includes("m.guru") && page.includes("line-clamp-2"));

  // 3. Student can open material
  console.log("\n── 3. Buka materi ──");
  check("3. CTA 'Baca Materi' menuju /arena/materi?materiId=", () => page.includes("/arena/materi?materiId="));

  // 4-5. Assignment + deadline
  console.log("\n── 4-5. Tugas & deadline ──");
  check("4. kartu tugas menampilkan judul + deskripsi + status", () => page.includes("Kerjakan Tugas") && page.includes("Deadline:"));
  check("5. deadline ditampilkan (Deadline: / Tanpa tenggat)", () => page.includes("Tanpa batas waktu") && page.includes("Deadline:"));

  // 6. Submission status
  console.log("\n── 6. Status submission ──");
  check("6. 4 status manusiawi (Belum/Sedang/Sudah dikumpulkan/Dinilai)",
    () => ["Belum dikerjakan", "Sedang dikerjakan", "Sudah dikumpulkan", "Sudah dinilai"].every((s) => page.includes(s)));
  check("6. status diturunkan server (API map status)",
    () => api.includes("BELUM_DIKERJAKAN") && api.includes("SEDANG_DIKERJAKAN") && api.includes("SUDAH_DIKUMPULKAN") && api.includes("DINILAI"));

  // 7-8. Submit supported content + link
  console.log("\n── 7-8. Pengumpulan ──");
  check("7. CTA tugas menuju flow kerjakan existing (/arena/tugas/[id]/kerjakan)",
    () => page.includes("/arena/tugas/${t.id}/kerjakan"));
  check("7. CTA latihan menuju flow take existing (/murid/tugasku/[id]/take)",
    () => page.includes("/murid/tugasku/${l.id}/take"));
  check("8. praktik route menerima URL + validasi http/https server-side",
    () => praktikRoute.includes("new URL(") && praktikRoute.includes('protocol !== "http:"') && praktikRoute.includes("https:"));

  // 9-10. Access control
  console.log("\n── 9-10. Access control ──");
  check("9. API murid kelasku memvalidasi membership (groupId_userId)",
    () => api.includes("groupId_userId") && api.includes('"Anda tidak tergabung di kelas ini"'));
  check("9. submission hanya milik user (where userId + assignment groupId)",
    () => api.includes("userId: user.id") && api.includes("assignment: { groupId: id }"));
  check("10. kelas lain tidak bisa diakses (403 saat bukan member)", () => api.includes("status: 403"));
  check("10. praktik route validasi membership penugasan (group members)",
    () => praktikRoute.includes("penugasan.group.members.length") && praktikRoute.includes("404"));

  // 11. Teacher can see submission status
  console.log("\n── 11. Teacher result ──");
  check("11. guru melihat status pengumpulan (kelasku tab tugas + tugas-murid)",
    () => read("app/(dashboard)/guru/kelasku/page.tsx").includes("dikumpulkan") && read("app/(dashboard)/guru/tugas-murid/page.tsx").includes("praktikDinilai"));

  // 12-13. Multi-class + no duplicate
  console.log("\n── 12-13. Multi-class ──");
  check("12. API murid per-kelas: query scoped groupId (bukan global)",
    () => api.includes("groupId: id") && !api.includes("groupId: { in:"));
  check("13. backend mencegah duplikat (quiz+group, materi+group unique)",
    () => read("prisma/schema.prisma").includes("@@unique([quizId, groupId])") && read("prisma/schema.prisma").includes("@@unique([materiId, groupId])"));

  // 14. Notification deep-link
  console.log("\n── 14. Notifikasi ──");
  check("14. penugasan kini mengirim notifikasi murid (deep-link /arena/tugas)",
    () => penugasanRoute.includes("notifikasi.createMany") && penugasanRoute.includes('link: "/arena/tugas"'));
  check("14. quiz assign mengirim notifikasi murid (deep-link /murid/tugasku)",
    () => quizAssignRoute.includes("notifikasi.createMany") && quizAssignRoute.includes('link: "/murid/tugasku"'));
  check("14. materi kirim notifikasi murid (deep-link /arena/materi)",
    () => read("app/api/guru/materi/[id]/kirim/route.ts").includes('link: "/arena/materi"'));

  // 15. Mobile flow
  console.log("\n── 15-17. Mobile & theme ──");
  check("15. CTA penuh lebar di mobile (w-full) — satu aksi per kartu",
    () => page.includes("w-full text-sm") && page.includes("bc-btn-primary mt-3 w-full"));
  check("16. token student light (violet accent)", () => css.includes(".bc-classroom.bc-student") && css.includes("--clr-accent: #7c3aed"));
  check("17. token student dark", () => css.includes(".dark .bc-classroom.bc-student") && css.includes("--clr-accent: #a78bfa"));

  // 18-19. Empty & error states
  console.log("\n── 18-19. States ──");
  check("18. empty state: 'Belum ada aktivitas' + pesan manusiawi",
    () => page.includes("Belum ada aktivitas") && page.includes("Guru akan mengirim materi, tugas, atau latihan di sini."));
  check("19. error state manusiawi + Coba Lagi (tanpa error teknis)",
    () => page.includes("Belum dapat memuat kelas.") && page.includes("Coba Lagi") && !page.includes("Prisma"));

  // 20. Existing APIs reused
  console.log("\n── 20. Reuse API ──");
  check("20. API baru murid/kelasku HANYA satu; halaman memakai endpoint existing lain",
    () => {
      const diff = execSync(`git diff --name-only HEAD -- app/api/`, { encoding: "utf8", cwd: process.cwd() }).trim().split("\n").filter(Boolean);
      const allowed = ["app/api/murid/kelasku/[id]/route.ts", "app/api/guru/penugasan/route.ts", "app/api/guru/quiz/[id]/assign/route.ts", "app/api/murid/penugasan/[id]/praktik/route.ts", "app/api/guru/pengumuman/route.ts"];
      return diff.every((f) => allowed.includes(f));
    });

  // 21. Protected zones unchanged
  console.log("\n── 21. Protected zones ──");
  check("21. protected zones 0 diff (prisma/gamification/learning-loop/adaptive/diagnostic/arena/coins/apk/player)",
    () => {
      const diff = execSync(`git diff --name-only HEAD -- prisma/ lib/gamification/ lib/learning-loop/ lib/adaptive-practice/ lib/learner-state/ lib/diagnostic/ app/api/player/ engines/ lib/apk.ts lib/coins.ts lib/award-xp.ts`, { encoding: "utf8", cwd: process.cwd() }).trim();
      return diff.length === 0;
    });
  check("21. prisma schema 0 diff (no migration)", () => execSync(`git diff --name-only HEAD -- prisma/`, { encoding: "utf8", cwd: process.cwd() }).trim().length === 0);

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
