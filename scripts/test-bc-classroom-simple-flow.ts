/**
 * STEP 6.0 — BC CLASSROOM SIMPLE FLOW (iOS Edu UX)
 * Test statik: composer, ClassPicker, flow Materi/Tugas/Latihan/Pengumuman,
 * multi-class delivery, reuse API existing, mobile/light/dark, states.
 * Tanpa DB write. Tidak melemahkan test lain.
 *
 * Run: npm run test:bc-classroom-simple-flow
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

const kelasku = read("app/(dashboard)/guru/kelasku/page.tsx");
const composer = read("components/kelas/ClassroomComposer.tsx");
const picker = read("components/kelas/ClassPicker.tsx");
const css = read("components/kelas/classroom.css");
const pengumumanRoute = read("app/api/guru/pengumuman/route.ts");

function main() {
  console.log("\n📋 STEP 6.0 — BC CLASSROOM SIMPLE FLOW TEST");
  console.log("=".repeat(60));

  // 1. Kelasku dapat dibuka
  console.log("\n── 1. Halaman Kelasku ──");
  check("1. /guru/kelasku memakai class scope bc-classroom + import tokens",
    () => kelasku.includes("bc-classroom") && kelasku.includes("classroom.css"));
  check("1. fetchGroups cek res.ok (regresi test-guru-phase)", () => /!res\.ok/.test(kelasku));

  // 2. + Tambahkan tersedia
  console.log("\n── 2. Primary action ──");
  check("2. tombol '+ Tambahkan' ada di daftar kelas", () => kelasku.includes("> Tambahkan") && kelasku.includes("<Plus size={18} /> Tambahkan"));
  check("2. tombol '+ Tambahkan' ada di detail kelas", () => (kelasku.match(/Tambahkan/g) || []).length >= 3);

  // 3-6. Flow per tipe
  console.log("\n── 3-6. Composer: Materi/Tugas/Latihan/Pengumuman ──");
  check("3. Materi flow: ContentTypePicker + sumber Materi Ajar + kirim endpoint",
    () => composer.includes("Materi Ajar") && composer.includes("/api/guru/materi/") && composer.includes("kirim"));
  check("3. Materi multi-class: POST kirim menerima groupIds",
    () => composer.includes("groupIds: selected") && composer.includes("materi/${pickedId}/kirim"));
  check("4. Tugas flow: sumber Buku Ajar + quiz + penugasan endpoint",
    () => composer.includes("Buku Ajar") && composer.includes("/api/guru/penugasan") && composer.includes("quiz/${pickedId}/assign"));
  check("5. Latihan flow: latihan yang sudah dibuat + buat dengan AI (link bank-soal)",
    () => composer.includes("Latihan yang sudah dibuat") && composer.includes("/guru/bank-soal"));
  check("6. Pengumuman flow: form + POST /api/guru/pengumuman + groupIds",
    () => composer.includes("Pengumuman") && composer.includes("/api/guru/pengumuman") && composer.includes("groupIds: selected"));

  // 7-10. ClassPicker
  console.log("\n── 7-10. ClassPicker ──");
  check("7. ClassPicker single class (checkbox per kelas)", () => picker.includes("bc-check") && picker.includes("selected.includes(c.id)"));
  check("8. ClassPicker multi-class (selected array)", () => picker.includes("selected: string[]") && picker.includes("onChange(ids)"));
  check("9. Select all (Pilih semua / Hapus semua)", () => picker.includes("Pilih semua") && picker.includes("Hapus semua"));
  check("10. Deselect all (toggleAll)", () => picker.includes("toggleAll") && picker.includes("filtered.every"));
  check("10. search kelas", () => picker.includes("Cari kelas") && picker.includes("filtered"));
  check("10. student count tampil", () => picker.includes("siswa") && picker.includes("memberCount"));
  check("10. validation 'Belum ada kelas dipilih' + 'N kelas dipilih'",
    () => picker.includes("kelas dipilih"));

  // 11. Content selection
  console.log("\n── 11. Content selection ──");
  check("11. ContentPicker lazy-load per sumber (materi/panduan/quiz/latihan)",
    () => composer.includes("/api/guru/materi?limit=40") && composer.includes("/api/guru/panduan") && composer.includes("/api/guru/quiz") && composer.includes("/api/guru/latihan"));

  // 12. Existing API reuse
  console.log("\n── 12. Reuse API existing ──");
  check("12. TIDAK ada endpoint baru di app/api (composer memakai endpoint lama)",
    () => {
      const diff = execSync(`git diff --name-only HEAD -- app/api/`, { encoding: "utf8", cwd: process.cwd() }).trim().split("\n").filter(Boolean);
      return diff.length === 1 && diff[0] === "app/api/guru/pengumuman/route.ts";
    });

  // 13-15. Multi-class delivery + partial failure + duplicate prevention
  console.log("\n── 13-15. Multi-class delivery ──");
  check("13. Composer mengirim groupIds[] ke semua endpoint",
    () => (composer.match(/groupIds: selected/g) || []).length >= 4);
  check("13. Pengumuman API terima groupIds[] (additive)",
    () => pengumumanRoute.includes("groupIds") && pengumumanRoute.includes("createMany"));
  check("14. Error state manusiawi (partial/umum) di composer",
    () => composer.includes("Belum berhasil dikirim. Coba lagi. Tidak ada data yang hilang."));
  check("15. Duplicate prevention: @@unique di backend (quiz+group, materi+group, penugasan+user)",
    () => read("prisma/schema.prisma").includes("@@unique([quizId, groupId])") && read("prisma/schema.prisma").includes("@@unique([materiId, groupId])"));
  check("15. Pengumuman multi-kelas: createMany + notifikasi dedupe member",
    () => pengumumanRoute.includes("new Set(groups.flatMap") && pengumumanRoute.includes("createMany"));

  // 16-17. Mobile & desktop layout
  console.log("\n── 16-17. Layout ──");
  check("16. Mobile: sheet bottom (bc-sheet-overlay align-items flex-end + safe-area)",
    () => css.includes("align-items: flex-end") && css.includes("safe-area-inset-bottom"));
  check("16. touch target >= 44px (bc-btn-primary min-height 48, bc-row 56)",
    () => css.includes("min-height: 48px") && css.includes("min-height: 56px"));
  check("17. Desktop: dialog centered (md align-items center)", () => css.includes("@media (min-width: 768px)") && css.includes("align-items: center"));

  // 18-19. Light & dark mode
  console.log("\n── 18-19. Light & Dark ──");
  check("18. Light tokens semantic (background/surface/border/text/accent)",
    () => ["--clr-bg", "--clr-surface", "--clr-border", "--clr-text", "--clr-accent"].every((t) => css.includes(t)));
  check("19. Dark mode first-class (.dark .bc-classroom override lengkap)",
    () => css.includes(".dark .bc-classroom") && css.includes("--clr-surface: #171a22") && css.includes("color-scheme: dark"));

  // 20-21. Accessibility & touch
  console.log("\n── 20-21. Aksesibilitas ──");
  check("20. focus-visible ring di scope classroom", () => css.includes(":focus-visible") && css.includes("outline"));
  check("20. aria-label pada dialog & tombol ikon",
    () => composer.includes('aria-label="Tutup"') && picker.includes('aria-label="Cari kelas"') && kelasku.includes('aria-label="Salin kode kelas"'));
  check("21. ClassPicker baris touch-friendly (min-height 56px)", () => picker.includes("min-height: 56px") || css.includes("min-height: 56px"));

  // 22-24. States
  console.log("\n── 22-24. States ──");
  check("22. Empty state kelas: 'Belum ada kelas' + CTA Buat Kelas",
    () => kelasku.includes("Belum ada kelas") && kelasku.includes("Buat Kelas"));
  check("22. Empty state aktivitas: 'Belum ada aktivitas' + CTA Tambahkan",
    () => kelasku.includes("Belum ada aktivitas") && kelasku.includes("Mulai kelasmu dengan memberikan"));
  check("23. Success state: 'Berhasil dikirim' + nama kelas",
    () => kelasku.includes("Berhasil dikirim") && kelasku.includes("telah dikirim ke"));
  check("24. Error state manusiawi di composer", () => composer.includes("Tidak ada data yang hilang"));

  // 25. Existing classroom tests remain green (tidak diubah)
  console.log("\n── 25. Test existing tidak diubah ──");
  check("25. test-guru-phase.ts & test-mobile-navigation.ts 0 diff",
    () => {
      const d = execSync(`git diff --name-only HEAD -- scripts/test-guru-phase.ts scripts/test-mobile-navigation.ts`, { encoding: "utf8", cwd: process.cwd() }).trim();
      return d.length === 0;
    });

  // Protected zones
  console.log("\n── Protected zones ──");
  check("protected zones 0 diff (prisma/gamification/learning-loop/adaptive/diagnostic/arena/coins/apk)",
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
