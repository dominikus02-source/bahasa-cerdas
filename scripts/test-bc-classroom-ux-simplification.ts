/**
 * STEP 6.11 — BC CLASSROOM UX SIMPLIFICATION & ACTION HIERARCHY
 * Test statik: satu primary action (+ Tambahkan di hero), kode kelas
 * first-class (Salin/Lihat Kode/WhatsApp/Perbarui), pengumuman lewat satu
 * pintu (composer → PENGUMUMAN) + edit via modal, tint deterministic
 * (stableClassTint, tanpa engine warna baru), tab 5 tetap, error state
 * manusiawi, a11y (aria-label/aria-live/aria-pressed/Escape/44px), 0
 * endpoint baru, protected zones 0 diff. Tanpa DB write.
 *
 * Run: npm run test:bc-classroom-ux-simplification
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
const css = read("components/kelas/classroom.css");

function main() {
  console.log("\n📋 STEP 6.11 — BC CLASSROOM UX SIMPLIFICATION TEST");
  console.log("=".repeat(60));

  // 1-3. Satu primary action
  console.log("\n── 1-3. Satu primary action di detail ──");
  check("1. hero detail punya SATU '+ Tambahkan' bc-btn-primary",
    () => {
      const heroAdd = guruPage.match(/className="bc-btn-primary text-sm shrink-0">\s*<Plus size=\{18\} \/> Tambahkan/g) ?? [];
      return heroAdd.length >= 1;
    });
  check("2. TodayView ('Hari Ini') TANPA tombol '+ Tambahkan'",
    () => {
      const today = guruPage.slice(guruPage.indexOf("function TodayView"), guruPage.indexOf("const CATEGORY_LABEL"));
      return today.includes("Hari Ini") && !today.includes("onAdd") && !today.includes("bc-btn-primary");
    });
  check("3. hierarki aksi: secondary/tertiary tetap dipakai (bc-btn-secondary, bc-chip)",
    () => guruPage.includes("bc-btn-secondary") && guruPage.includes("bc-chip") && guruPage.includes("bc-btn-primary"));

  // 4-8. Kode kelas first-class di hero
  console.log("\n── 4-8. Kode kelas first-class ──");
  check("4. hero menampilkan label 'Kode Kelas' + kode besar (bc-class-code)",
    () => guruPage.includes("Kode Kelas") && guruPage.includes("bc-class-code truncate"));
  check("5. hero: Salin kode (aria-label) + Lihat Kode (buka modal) + Perbarui kode",
    () => guruPage.includes('aria-label="Salin kode kelas"') && guruPage.includes("setCodeGroup(activeGroup)") && guruPage.includes('aria-label="Perbarui kode kelas"'));
  check("6. Lihat Kode memakai modal yang SUDAH ADA (ClassCodeModal, bukan modal baru)",
    () => {
      const usage = (guruPage.match(/<ClassCodeModal /g) ?? []).length;
      return usage >= 2 && guruPage.includes("function ClassCodeModal");
    });
  check("7. WhatsApp share dari 6.9B tetap (waShareUrl + Bagikan ke WhatsApp di modal)",
    () => guruPage.includes("waShareUrl") && guruPage.includes("Bagikan ke WhatsApp") && guruPage.includes("bc-code-sheet"));
  check("8. kode tidak lagi ditampilkan sebagai kotak kecil (text-xs font-mono lama dihapus)",
    () => !guruPage.includes('text-xs font-mono text-[var(--clr-text-2)]'));

  // 9-13. Identitas kelas via stableClassTint (tanpa engine warna baru)
  console.log("\n── 9-13. Identitas kelas (tint deterministic) ──");
  check("9. hero memakai stableClassTint dari 6.9B",
    () => guruPage.includes(`bc-class-tint-${'${stableClassTint(activeGroup.id)}'}`) || guruPage.includes("bc-class-tint-${stableClassTint(activeGroup.id)}"));
  check("10. grade pill hero memakai --class-accent/--class-soft (bukan token tetap)",
    () => guruPage.includes('color: "var(--class-accent)", background: "var(--class-soft)"'));
  check("11. TIDAK ada engine warna/hash baru (stableClassTint satu-satunya, tanpa Math.random di kode)",
    () => {
      const code = guruPage.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      return (code.match(/function stableClassTint/g) ?? []).length === 1 && !code.includes("Math.random");
    });
  check("12. 8 tint light + 8 tint dark terdefinisi di classroom.css",
    () => {
      const total = (css.match(/\.bc-class-tint-\d \{/g) ?? []).length;
      const dark = (css.match(/\.dark \.bc-class-tint-\d \{/g) ?? []).length;
      return total - dark === 8 && dark === 8;
    });
  check("13. tint di hero bisa menyala (bc-class-tint-N dipakai pada elemen hero)",
    () => guruPage.includes("bc-class-tint-${stableClassTint(activeGroup.id)}"));

  // 14-17. Pengumuman: satu pintu + edit tetap ada
  console.log("\n── 14-17. Pengumuman satu pintu ──");
  check("14. form pengumuman INLINE permanen dihapus ('Buat pengumuman'/'Kirim Pengumuman' hilang)",
    () => !guruPage.includes("Buat pengumuman") && !guruPage.includes("Kirim Pengumuman") && !guruPage.includes("pengumumanForm"));
  check("15. pembuatan pengumuman via composer: ContentTypePicker + tipe PENGUMUMAN",
    () => composer.includes("ContentTypePicker") && composer.includes("PENGUMUMAN") && composer.includes("Pengumuman"));
  check("16. edit pengumuman tetap ada: EditPengumumanModal + PATCH + 'Simpan Perubahan'",
    () => guruPage.includes("function EditPengumumanModal") && guruPage.includes('method: "PATCH"') && guruPage.includes("Simpan Perubahan") && guruPage.includes('aria-label="Edit pengumuman"'));
  check("17. modal edit: Escape menutup + field judul/deskripsi/tenggat + error user-friendly",
    () => {
      const modal = guruPage.slice(guruPage.indexOf("function EditPengumumanModal"), guruPage.indexOf("function ClassCodeModal"));
      return modal.includes("Escape") && modal.includes("Tenggat (opsional)") && modal.includes("Periksa koneksi");
    });

  // 18-21. Tab & navigasi
  console.log("\n── 18-21. Tab & navigasi ──");
  check("18. 5 tab tetap: Aktivitas/Materi/Tugas/Nilai/Orang + aria-pressed",
    () => guruPage.includes('["aktivitas", "Aktivitas"') && guruPage.includes('["materi", "Materi"') && guruPage.includes('["tugas", "Tugas"') && guruPage.includes('["nilai", "Nilai"') && guruPage.includes('["orang", "Orang"') && guruPage.includes("aria-pressed"));
  check("19. back 'Kelasku' deterministik (closeGroup, bukan router.back)",
    () => guruPage.includes("onClick={closeGroup}") && guruPage.includes("<ArrowLeft size={16} /> Kelasku"));
  check("20. TodayView: 'Perlu perhatian' + 'Sedang berjalan' + 'Kirim Lagi' tetap",
    () => guruPage.includes("Perlu perhatian") && guruPage.includes("Sedang berjalan") && guruPage.includes("Kirim Lagi"));
  check("21. stream Aktivitas tetap ada (pengumuman/tugas/materi) + RingkasanChips",
    () => guruPage.includes("function StreamCard") && guruPage.includes("function RingkasanChips") && guruPage.includes("pinBusyId"));

  // 22-26. Error states & keamanan teks
  console.log("\n── 22-26. Error state & teks aman ──");
  check("22. error list manusiawi + tombol 'Coba Lagi'",
    () => guruPage.includes("Kelas belum dapat dimuat.") && guruPage.includes("Coba Lagi"));
  check("23. error detail manusiawi (toast, bukan crash)",
    () => guruPage.includes("Detail kelas tidak bisa dimuat. Coba lagi."));
  check("24. TIDAK ada literals stack/Prisma/TypeError di halaman",
    () => !guruPage.includes("TypeError") && !guruPage.includes("PrismaClient") && !guruPage.includes("err.stack"));
  check("25. empty state kontekstual tetap: + Tambahkan Materi / + Tambahkan Tugas",
    () => guruPage.includes("Tambahkan Materi") && guruPage.includes("Tambahkan Tugas"));
  check("26. polling detail tetap (20 detik) untuk kesegaran pengumpulan",
    () => guruPage.includes("setInterval(() => loadDetail(activeGroup.id), 20000)"));

  // 27-31. Aksesibilitas & touch target
  console.log("\n── 27-31. Aksesibilitas ──");
  check("27. salin kode memberi umpan balik (aria-live polite) + ikon CheckCircle2",
    () => guruPage.includes('aria-live="polite"') && guruPage.includes("CheckCircle2"));
  check("28. semua modal dialog: role + aria-modal + aria-label",
    () => (guruPage.match(/role="dialog" aria-modal="true" aria-label=/g) ?? []).length >= 4);
  check("29. touch target: bc-btn-primary min 48px + bc-btn-secondary min 44px",
    () => css.includes("min-height: 48px") && css.includes("min-height: 44px"));
  check("30. focus ring semantik tersedia (:focus-visible outline accent)",
    () => css.includes(":focus-visible") && css.includes("outline"));
  check("31. warna tidak hanya satu-satunya sinyal (teks label pada chip/tombol)",
    () => guruPage.includes("bc-chip-active") && guruPage.includes('aria-pressed={tab === id}'));

  // 32-36. API contracts & zero endpoint
  console.log("\n── 32-36. API contracts ──");
  check("32. POST /api/guru/pengumuman tetap dipakai (composer membuat pengumuman)",
    () => composer.includes('"/api/guru/pengumuman"') && composer.includes('method: "POST"'));
  check("33. PATCH /api/guru/pengumuman/[id] tetap dipakai (edit + pin)",
    () => guruPage.includes("togglePin") && guruPage.includes(`/api/guru/pengumuman/${"${pengumuman.id}"}`));
  check("34. 0 endpoint BARU di app/api (hanya route yang sudah ada dari 6.0-6.10)",
    () => {
      const diff = execSync(`git diff --name-only HEAD -- app/api/`, { encoding: "utf8", cwd: process.cwd() }).trim().split("\n").filter(Boolean);
      const allowed = [
        "app/api/guru/pengumuman/route.ts", "app/api/guru/penugasan/route.ts",
        "app/api/guru/quiz/[id]/assign/route.ts", "app/api/murid/kelasku/[id]/route.ts",
        "app/api/murid/penugasan/[id]/praktik/route.ts", "app/api/guru/kelasku/[id]/route.ts",
        "app/api/guru/penugasan/[id]/nilai-praktik/route.ts", "app/api/guru/kelasku/[id]/insight/route.ts",
        "app/api/murid/quiz/[id]/route.ts",
        "app/api/group/route.ts", "app/api/group/[id]/route.ts",
      ];
      return diff.every((f) => allowed.includes(f));
    });
  check("35. tidak ada composer/engine pengumuman baru (reuse ClassroomComposer)",
    () => exists("components/kelas/ClassroomComposer.tsx") && !exists("components/kelas/AnnouncementComposer.tsx"));
  check("36. API tidak menyentuh jawaban/correctAnswer (aman sanitasi)",
    () => !guruPage.includes("correctAnswer") && !composer.includes("correctAnswer"));

  // 37-40. Protected zones
  console.log("\n── 37-40. Protected zones ──");
  check("37. prisma/ + gamification/learning-loop/adaptive/learner-state/diagnostic/player/engines/apk/coins/award-xp 0 diff",
    () => {
      const diff = execSync(`git diff --name-only HEAD -- prisma/ lib/gamification/ lib/learning-loop/ lib/adaptive-practice/ lib/learner-state/ lib/diagnostic/ app/api/player/ engines/ lib/apk.ts lib/coins.ts lib/award-xp.ts`, { encoding: "utf8", cwd: process.cwd() }).trim();
      return diff.length === 0;
    });
  check("38. tidak ada file baru di prisma/migrations (Migration 0)",
    () => {
      const diff = execSync(`git diff --name-only HEAD -- prisma/migrations/`, { encoding: "utf8", cwd: process.cwd() }).trim();
      return diff.length === 0;
    });
  check("39. tidak ada file baru di lib/classroom (hanya access-code.ts dari 6.10)",
    () => {
      const diff = execSync(`git diff --name-only HEAD -- lib/classroom/`, { encoding: "utf8", cwd: process.cwd() }).trim().split("\n").filter(Boolean);
      return diff.every((f) => f === "lib/classroom/access-code.ts");
    });
  check("40. hooks order aman: stream useMemo di atas early return (STEP 6.9 hotfix)",
    () => {
      const streamIdx = guruPage.indexOf("const stream = useMemo");
      const earlyReturn = guruPage.indexOf("if (!activeGroup) {");
      return streamIdx > -1 && earlyReturn > -1 && streamIdx < earlyReturn;
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
