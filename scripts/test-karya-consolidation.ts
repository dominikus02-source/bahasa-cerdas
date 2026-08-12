import fs from "fs";
import { execSync } from "child_process";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.log(`  ❌ ${name}`);
      failed++;
    }
  } catch (e: any) {
    console.log(`  ❌ ${name} — ${e.message}`);
    failed++;
  }
}

function read(rel: string): string {
  return fs.readFileSync(rel, "utf-8");
}

function main() {
  console.log("\n📋 KARYA CONSOLIDATION TEST (STEP 4C — Canonical /murid/karya)");
  console.log("=".repeat(60));

  const layout = read("app/(dashboard)/murid/layout.tsx");
  const mobileNav = read("components/dashboard/MuridMobileNav.tsx");
  const works = read("components/student-home/RecentWorksSection.tsx");
  const profile = read("app/(dashboard)/murid/profile/page.tsx");
  const feedImpl = read("components/student-karya/KaryaFeed.tsx");
  const arenaFeed = read("app/arena/feed/page.tsx");
  const arenaLayout = read("app/arena/layout.tsx");
  const canonical = read("app/(dashboard)/murid/karya/page.tsx");
  const tulis = read("app/(dashboard)/murid/karya/tulis/page.tsx");
  const arenaTulis = read("app/arena/tulis/page.tsx");

  // ── 1. SIDEBAR — Karya → [CANONICAL KARYA] ──
  console.log("\n── 1. Sidebar Karya → /murid/karya ──");
  test("sidebar Karya menunjuk /murid/karya",
    () => layout.includes('label="Karya" href="/murid/karya"'));
  test("sidebar TIDAK lagi menunjuk /arena/feed",
    () => !layout.includes('label="Karya" href="/arena/feed"'));

  // ── 2. MOBILE NAV — Karya → [CANONICAL KARYA] ──
  console.log("\n── 2. Mobile Nav Karya → /murid/karya ──");
  test("bottom bar Karya menunjuk /murid/karya",
    () => mobileNav.includes('href: "/murid/karya", label: "Karya"'));
  test("drawer Karya menunjuk /murid/karya (2 baris nav)",
    () => (mobileNav.match(/href: "\/murid\/karya", label: "Karya"/g) || []).length === 2);
  test("mobile nav TIDAK lagi menunjuk /arena/feed",
    () => !mobileNav.includes('href: "/arena/feed"'));

  // ── 3. BERANDA PREVIEW CTA → canonical ──
  console.log("\n── 3. Beranda (RecentWorksSection) CTA → canonical ──");
  test("'Semua Karya' → /murid/karya",
    () => works.includes('href="/murid/karya"'));
  test("empty-state 'Tulis Karya Sekarang' → /murid/karya/tulis",
    () => works.includes('href="/murid/karya/tulis"'));
  test("kartu preview tetap → /murid/karya/[id]",
    () => works.includes('href={`/murid/karya/${k.id}`}'));

  // ── 4. PROFIL CTA → canonical ──
  console.log("\n── 4. Profil CTA → canonical ──");
  test("galeri karya profil: titleHref=/murid/karya",
    () => profile.includes('titleHref="/murid/karya"'));
  test("galeri karya profil: tulisHref=/murid/karya/tulis",
    () => profile.includes('tulisHref="/murid/karya/tulis"'));

  // ── 5. ARENA — TIDAK ada Karya sebagai menu ──
  console.log("\n── 5. Arena tanpa menu Karya ──");
  test("arena layout TIDAK memuat nav Karya (/arena/feed)",
    () => !arenaLayout.includes('href: "/arena/feed"') && !arenaLayout.includes('label: "Karya"'));
  test("route lama TIDAK obsolete di primary nav (murid)",
    () => !layout.includes('label="Karya" href="/arena/feed"'));

  // ── 6. ROUTE KANONIK /murid/karya ──
  console.log("\n── 6. Route kanonik /murid/karya ──");
  test("halaman kanonik ada & merender KaryaFeed",
    () => canonical.includes('KaryaFeed') && canonical.includes('Buat Karya'));
  test("header produk: 'Karya' + subtitle + CTA tulis",
    () => canonical.includes('>Karya</h1>') && canonical.includes('href="/murid/karya/tulis"'));

  // ── 7. SATU IMPLEMENTASI FEED (tidak ada duplikat) ──
  console.log("\n── 7. Satu implementasi feed ──");
  test("KaryaFeed = implementasi tunggal (fetch /api/siswa/karya)",
    () => feedImpl.includes('fetch(`/api/siswa/karya?') && feedImpl.includes('handleLike') && feedImpl.includes('handleComment'));
  test("/arena/feed = wrapper tipis (bukan duplikat implementasi)",
    () => arenaFeed.includes('KaryaFeed') && !arenaFeed.includes('useState("SEMUA")') && !arenaFeed.includes('fetchKarya('));
  test("/arena/feed tetap APK-safe (detailBase=/arena/feed)",
    () => arenaFeed.includes('detailBase="/arena/feed"'));

  // ── 8. API CONTRACT TIDAK BERUBAH ──
  console.log("\n── 8. API references preserved ──");
  test("feed memakai /api/siswa/karya (list, count, like, comment, delete)",
    () => feedImpl.includes('/api/siswa/karya?${params}') &&
      feedImpl.includes('/api/siswa/karya/count?type=') &&
      feedImpl.includes('/api/siswa/karya/${id}/like') &&
      feedImpl.includes('/api/siswa/karya/${karyaId}/comment') &&
      feedImpl.includes('/api/siswa/karya/${id}'));

  // ── 9. CREATE/UPLOAD preserved ──
  console.log("\n── 9. Create/upload preserved ──");
  test("tulis kanonik ada & POST /api/siswa/karya",
    () => tulis.includes('fetch("/api/siswa/karya"') && tulis.includes('router.push(`/murid/karya/${data.karya.id}`)'));
  test("tulis arena (mirror APK) tetap ada",
    () => arenaTulis.includes('fetch("/api/siswa/karya"'));

  // ── 10. DISCOVERY preserved ──
  console.log("\n── 10. Discovery preserved ──");
  test("search (q), scope guru, filter jenis, infinite scroll",
    () => feedImpl.includes('searchParams.get("q")') && feedImpl.includes('scopeRef.current') &&
      feedImpl.includes('setFilter(t)') && feedImpl.includes('feed-sentinel'));

  // ── 11. TIDAK ADA MOCK DATA ──
  console.log("\n── 11. Tidak ada mock data ──");
  test("feed tidak memuat karya hardcoded",
    () => !/const karya\s*=\s*\[/.test(feedImpl) && !feedImpl.includes('karya: [{') && !feedImpl.includes('mockKarya'));

  // ── 12. THEME AWARE ──
  console.log("\n── 12. Theme aware ──");
  test("kartu feed punya dark: variant",
    () => feedImpl.includes('dark:bg-slate-900') && feedImpl.includes('dark:border-slate-800'));
  test("badge jenis punya dark: variant",
    () => feedImpl.includes('dark:bg-fuchsia-500/15') && feedImpl.includes('dark:text-fuchsia-300'));

  // ── 13. RESPONSIVE ──
  console.log("\n── 13. Responsive ──");
  test("header kanonik flex dengan gap (mobile-first)",
    () => canonical.includes('flex items-center justify-between gap-3'));

  // ── 14. PROTECTED ZONES ──
  console.log("\n── 14. Protected zones tidak tersentuh ──");
  try {
    const diff = execSync("git diff --name-only HEAD", { encoding: "utf8" });
    const forbidden = diff.split("\n").filter(Boolean).filter(p =>
      p.startsWith("prisma/") || p.startsWith("lib/gamification/") || p.startsWith("lib/learning-loop/") ||
      p.startsWith("engines/") || p.startsWith("app/api/") || p === "lib/apk.ts" ||
      p === "app/arena/bottom-nav.tsx"
    );
    test("diff tidak menyentuh prisma/engine/API/APK/package-lock",
      () => forbidden.length === 0);
    if (forbidden.length > 0) console.log(`     ⚠️ menyentuh: ${forbidden.join(", ")}`);
  } catch {
    test("git diff tersedia", () => false);
  }

  console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

main();
