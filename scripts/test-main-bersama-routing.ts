/**
 * Test Routing & Auth Integrasi Main Bersama — post-Tahap 7 (§7 audit).
 *
 * Pola QA repo: tsx standalone, pemeriksaan sumber (source-scanning)
 * — tanpa DB, tanpa server. Jalankan:
 *   npx tsx scripts/test-main-bersama-routing.ts
 *
 * Cakupan (§7 1-10):
 *   1. GURU → allowed (guard konvensi guru layout).
 *   2. ADMIN → sesuai konvensi existing (ADMIN hanya lewat isFounder —
 *      persis seperti `app/(dashboard)/guru/layout.tsx`).
 *   3. MURID → redirect /murid/beranda.
 *   4. Unauthenticated → /login?redirect=...
 *   5. CTA /guru/game → /guru/game/main-bersama, DI ATAS section solo.
 *   6. Ownership room (teacherId === user.id) tetap bekerja.
 *   7. Student join tetap publik.
 *   8. Projector tetap publik read-only.
 *   9. Tidak ada duplicate teacher implementation.
 *  10. Link Gim solo existing tetap utuh (termasuk "Ruang Gim & Tanding").
 *
 *  Plus regresi akar bug: pola `supabaseId: user.id` (getUser sudah
 *  mengembalikan Prisma User — query itu selalu null) TIDAK boleh
 *  muncul lagi di halaman Main Bersama.
 */

import fs from "fs";
import path from "path";

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const read = (p: string): string =>
  fs.readFileSync(path.join(process.cwd(), p), "utf8");

const SETUP_PAGE = "app/(dashboard)/guru/game/main-bersama/page.tsx";
const ROOM_PAGE =
  "app/(dashboard)/guru/game/main-bersama/ruang/[sessionId]/page.tsx";
const OLD_ROOT = "app/main-bersama/page.tsx";
const JOIN_PAGE = "app/main-bersama/join/page.tsx";
const LAYAR_PAGE = "app/main-bersama/layar/page.tsx";
const GAME_HUB = "app/(dashboard)/guru/game/page.tsx";
const GURU_LAYOUT = "app/(dashboard)/guru/layout.tsx";
const SETUP_CLIENT = "components/main-bersama/teacher/setup-client.tsx";
const ROOM_CLIENT = "components/main-bersama/teacher/room-client.tsx";

function main(): void {
  console.log("\n=== MAIN BERSAMA — ROUTING & AUTH (post-Tahap 7) ===\n");

  const setup = read(SETUP_PAGE);
  const room = read(ROOM_PAGE);
  const oldRoot = read(OLD_ROOT);
  const join = read(JOIN_PAGE);
  const layar = read(LAYAR_PAGE);
  const gameHub = read(GAME_HUB);
  const guruLayout = read(GURU_LAYOUT);
  const setupClient = read(SETUP_CLIENT);
  const roomClient = read(ROOM_CLIENT);

  // ── 1/2/3/4: guard konvensi guru (GURU + isFounder) ─────────
  const guard =
    'if (user.role !== "GURU" && !user.isFounder) {\n    redirect("/murid/beranda");\n  }';
  const guardRoom = guard.replace(/\n {4}/g, "\n  ");
  check(
    "1. setup page: GURU allowed (guard konvensi guru layout)",
    setup.includes('user.role !== "GURU" && !user.isFounder') &&
      setup.includes('redirect("/murid/beranda")'),
  );
  check(
    "2. ADMIN sesuai konvensi existing — kondisi sama persis dengan guru/layout.tsx (ADMIN hanya lewat isFounder)",
    guruLayout.includes('user.role !== "GURU" && !user.isFounder') &&
      setup.includes('user.role !== "GURU" && !user.isFounder'),
  );
  check(
    "3. MURID → redirect /murid/beranda (setup + room + layout guru)",
    setup.includes('redirect("/murid/beranda")') &&
      room.includes('redirect("/murid/beranda")') &&
      guruLayout.includes('redirect("/murid/beranda")'),
  );
  check(
    "4. unauthenticated → /login?redirect=... (setup + room)",
    setup.includes('/login?redirect=/guru/game/main-bersama') &&
      room.includes('/login?redirect=/guru/game/main-bersama/ruang/'),
  );

  // ── Akar bug lama TIDAK boleh kembali ───────────────────────
  check(
    "1b. akar redirect salah hilang: tidak ada pola `supabaseId: user.id` di halaman Main Bersama (getUser sudah Prisma User)",
    !setup.includes("supabaseId: user.id") &&
      !room.includes("supabaseId: user.id") &&
      !oldRoot.includes("supabaseId: user.id"),
  );

  // ── 5: entry section di /guru/game ──────────────────────────
  const ctaIdx = gameHub.indexOf('href="/guru/game/main-bersama"');
  const soloIdx = gameHub.indexOf("MAIN GAME");
  check(
    "5. CTA /guru/game → /guru/game/main-bersama, DI ATAS section Mainkan Gim SOLO",
    ctaIdx !== -1 && soloIdx !== -1 && ctaIdx < soloIdx,
    `cta=${ctaIdx} solo=${soloIdx}`,
  );
  check(
    "5b. copy entry: Main Bersama + Jelajah Kata + Kota Cahaya + Mulai Bersama",
    gameHub.includes("Main Bersama") &&
      gameHub.includes("Jelajah Kata") &&
      gameHub.includes("Kota Cahaya") &&
      gameHub.includes("Mulai Bersama"),
  );

  // ── 6: ownership room ───────────────────────────────────────
  check(
    "6. room ownership: session.teacherId !== user.id → redirect setup",
    room.includes("session.teacherId !== user.id") &&
      room.includes('redirect("/guru/game/main-bersama")'),
  );

  // ── 7/8: student + projector tetap publik ───────────────────
  check(
    "7. student join tetap publik (tanpa getUser/guard di page)",
    !join.includes("getUser") && !join.includes("redirect("),
  );
  check(
    "8. projector tetap publik read-only (tanpa auth, tanpa POST)",
    !layar.includes("getUser") &&
      !layar.includes("redirect(") &&
      !fs
        .readFileSync(
          path.join(process.cwd(), "components/main-bersama/projector/projector-client.tsx"),
          "utf8",
        )
        .includes("postTeacherCommand"),
  );

  // ── 9: tidak ada duplicate teacher implementation ───────────
  check(
    "9a. root /main-bersama kini redirect murni (tanpa SetupClient)",
    oldRoot.includes('redirect("/guru/game/main-bersama")') &&
      !oldRoot.includes("SetupClient") &&
      !oldRoot.includes("db."),
  );
  check(
    "9b. hanya SATU teacher setup implementation (folder ruang lama dihapus)",
    !fs.existsSync(path.join(process.cwd(), "app/main-bersama/ruang")) &&
      fs.existsSync(path.join(process.cwd(), SETUP_PAGE)),
  );

  // ── 10: link Gim solo existing tetap utuh ───────────────────
  const soloHrefs = [
    "/guru/game/kuis-tempur",
    "/guru/game/lari-kata",
    "/guru/game/benar-salah",
    "/guru/game/susun-kata",
    "/guru/game/tebak-kata",
  ];
  check(
    "10a. kartu gim solo existing tetap ada (href tidak berubah)",
    soloHrefs.every((h) => gameHub.includes(`"${h}"`)),
  );
  check(
    "10b. link \"Ruang Gim & Tanding\" tetap ada (tidak di-rename/hapus)",
    gameHub.includes("Ruang Gim &amp; Tanding") && gameHub.includes('"/guru/game/lobby"'),
  );

  // ── Konsistensi navigasi client guru ────────────────────────
  check(
    "11. setup-client → push ruang guru route baru",
    setupClient.includes("/guru/game/main-bersama/ruang/${sessionId}"),
  );
  check(
    "12. room-client tombol Selesai → kembali ke setup guru",
    roomClient.includes("router.push('/guru/game/main-bersama')"),
  );

  // ── Kesimpulan ──────────────────────────────────────────────
  console.log("\n══════════════════════════════════════");
  console.log(`TOTAL: ${passed} lulus, ${failed} gagal`);
  console.log("══════════════════════════════════════\n");
  process.exit(failed > 0 ? 1 : 0);
}

main();
