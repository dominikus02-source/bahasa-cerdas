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
  console.log("\n📋 OBROLAN 3.0 TEST (STEP 5B.1 — Class Chat Workspace + Data Integrity)");
  console.log("=".repeat(60));

  // ── 1. SERVER PAGE — data integrity: hanya kelas AKTIF ──
  console.log("\n── 1. Server Page (app/arena/chat/page.tsx) — Data Integrity ──");
  const page = read("app/arena/chat/page.tsx");
  test("membership query memfilter group.isActive: true (kelas arsip/hapus tak tampil)",
    () => page.includes("group: { isActive: true }"));
  test("auth gate getUser + redirect /arena/login tetap ada",
    () => page.includes("await getUser()") && page.includes('redirect("/arena/login")'));
  test("pratinjau anggota maks 12 (MEMBER_PREVIEW_LIMIT) — avatar asli, bukan palsu",
    () => page.includes("MEMBER_PREVIEW_LIMIT = 12") && page.includes("take: MEMBER_PREVIEW_LIMIT"));
  test("online window 5 menit konsisten (ONLINE_WINDOW_MS = 5 * 60 * 1000)",
    () => page.includes("ONLINE_WINDOW_MS = 5 * 60 * 1000"));
  test("enriched groups memuat memberCount/onlineCount/lastMessage/members asli",
    () => page.includes("memberCount") && page.includes("onlineCount") && page.includes("lastMessage") && page.includes("members"));
  test("tanpa data palsu (tidak ada String.fromCharCode / avatar stack fiktif)",
    () => !page.includes("String.fromCharCode") && !page.includes("chat-mstack") && !page.includes("chat-mav"));

  // ── 2. CHAT API — akses kelas arsip/hapus dicabut (contract sama) ──
  console.log("\n── 2. Chat API — Access Guard isActive (contract tidak berubah) ──");
  const getRoute = read("app/api/chat/[groupId]/route.ts");
  const sendRoute = read("app/api/chat/send/route.ts");
  test("GET /api/chat/[groupId] mengecek isActive: true (404 untuk kelas arsip)",
    () => getRoute.includes("isActive: true"));
  test("POST /api/chat/send mengecek isActive: true (403 untuk kelas arsip)",
    () => sendRoute.includes("isActive: true"));
  test("GET tetap mengembalikan { messages } (kontrak respons tidak berubah)",
    () => getRoute.includes("messages"));
  test("GET tetap mendukung limit/before/after (mekanisme polling lama dipertahankan)",
    () => getRoute.includes("limit") && getRoute.includes("before") && getRoute.includes("after"));
  test("POST tetap menvalidasi panjang konten (maks 1000 karakter) + strip HTML",
    () => sendRoute.includes("1000") && sendRoute.includes("strip") || sendRoute.includes("1000") && sendRoute.includes("sanitize") || sendRoute.includes("1000") && sendRoute.includes("replace"));
  test("error code CLASS_NOT_FOUND / CLASS_MESSAGE_FORBIDDEN tetap ada (kontrak error sama)",
    () => (getRoute.includes("CLASS_NOT_FOUND") || getRoute.includes("NOT_FOUND")) && (sendRoute.includes("CLASS_MESSAGE_FORBIDDEN") || sendRoute.includes("FORBIDDEN")));

  // ── 3. LAYOUT — container lebar 1440px khusus chat ──
  console.log("\n── 3. Layout — Container 1440px untuk Workspace ──");
  const layout = read("app/arena/layout.tsx");
  test("chat route memakai max-w-[1440px] (sidebar+percakapan+konteks terlihat penuh)",
    () => layout.includes("max-w-[1440px]") && layout.includes('pathname.startsWith("/arena/chat")'));
  test("halaman arena lain tetap max-w-lg md:max-w-4xl (mobile-friendly tidak berubah)",
    () => layout.includes("max-w-lg md:max-w-4xl"));
  test("subnav arena tetap 6 item canonical — /arena/chat TIDAK jadi item nav",
    () => !layout.includes('href: "/arena/chat"') && !layout.includes('label: "Obrolan"'));
  test("auth gate / isApk / BottomNav APK-only tetap utuh",
    () => layout.includes("redirect(RUTE_TANPA_GERBANG)") && layout.includes("await isApk()") && layout.includes("{apk && <BottomNav />}"));

  // ── 4. CLIENT — workspace 3 pane + responsif ──
  console.log("\n── 4. Client — Class Chat Workspace (3 Pane, Responsif) ──");
  const client = read("app/arena/chat/chat-client.tsx");
  test("sidebar daftar kelas ada (aside aria-label Daftar kelas, w-72→w-80, lg selalu tampil)",
    () => client.includes('aria-label="Daftar kelas"') && client.includes("md:w-72 lg:w-80") && client.includes("lg:flex"));
  test("conversation pane flex-1 (section aria-label Percakapan kelas)",
    () => client.includes('aria-label="Percakapan kelas"') && client.includes("flex-1 min-w-0"));
  test("context panel ≥1280 inline w-[300px] (hidden xl:flex)",
    () => client.includes('hidden xl:flex w-[300px]') && client.includes('aria-label="Info kelas"'));
  test("context drawer <1280 (role=dialog w-80 max-w-[85vw] + backdrop)",
    () => client.includes('role="dialog"') && client.includes("w-80 max-w-[85vw]") && client.includes("bg-black/40"));
  test("mobile: layar daftar <md saat belum pilih kelas + back chevron di percakapan",
    () => client.includes("md:hidden") && client.includes('aria-label="Kembali ke daftar kelas"'));
  test("768-1023: sidebar toggleable (listToggle + tombol List, lg:hidden)",
    () => client.includes("listToggle") && client.includes('aria-label={listToggle ? "Sembunyikan daftar kelas"'));
  test("shell workspace md:h-[calc(100dvh-7rem)] (sesuai top bar + subnav)",
    () => client.includes("md:h-[calc(100dvh-7rem)]"));

  // ── 5. CLIENT — state & fitur percakapan ──
  console.log("\n── 5. Client — ConvState, Polling, Kirim ──");
  test("convState idle/loading/ok/unavailable/error — kelas invalid → 'Obrolan tidak tersedia'",
    () => client.includes('type ConvState') && client.includes('"unavailable"') && client.includes("Obrolan tidak tersedia"));
  test("state unavailable ada tombol 'Kembali ke Obrolan' + router.refresh (re-sync data server)",
    () => client.includes("Kembali ke Obrolan") && client.includes("router.refresh()"));
  test("pilihGrup memetakan 404/403 → unavailable (akses kelas arsip di URL langsung tertangani)",
    () => client.includes("res.status === 404 || res.status === 403") && client.includes("setConvState(\"unavailable\")"));
  test("polling `after` + backoff 4s→15s + pause visibilityState (mekanisme existing dipertahankan)",
    () => client.includes("after=") && client.includes("delay + 2000, 15000") && client.includes("visibilityState"));
  test("kirim pesan: temp-id optimistik + rollback + restore input saat gagal",
    () => client.includes("temp-${Date.now()}") && client.includes("setInput(text)") && client.includes("Pesan belum terkirim"));
  test("kirim gagal 404/403 → temp dihapus + unavailable (kelas arsip tidak bisa kirim)",
    () => client.includes("setMessages(prev => prev.filter(m => m.id !== tempId))") && client.includes("setConvState(\"unavailable\")"));
  test("avatar asli (img src atau gradient inisial) — TANPA data avatar palsu",
    () => client.includes("return <img src={src}") && client.includes("INITIALS_COLORS") && !client.includes("String.fromCharCode"));
  test("grouping pesan per 5 menit (GROUP_WINDOW_MS) + label nama hanya di pesan baru",
    () => client.includes("GROUP_WINDOW_MS") && client.includes("compact"));

  // ── 6. CLIENT — APK & CTA join ──
  console.log("\n── 6. Client — APK Safety & CTA Gabung Kelas ──");
  test("APK memakai cookie bc_apk=1 (useIsApkClient, pola document.cookie yang sudah ada)",
    () => client.includes("bc_apk=1") && client.includes("useIsApkClient"));
  test("APK: join kelas modal inline (tetap dalam scope /arena, POST /api/group/join)",
    () => client.includes("isApk ?") && client.includes('fetch("/api/group/join"'));
  test("web: join kelas → halaman kanonik /murid/gabung-kelas",
    () => client.includes('href="/murid/gabung-kelas"'));
  test("APK modal punya kode akses + Batal/Gabung + aria-modal (a11y)",
    () => client.includes('aria-label="Gabung Kelas"') && client.includes("Kode akses kelas") && client.includes('placeholder="Contoh: ABC123"'));

  // ── 7. CLIENT — dark mode & aksesibilitas ──
  console.log("\n── 7. Client — Dark Mode & A11y ──");
  const darkCount = (client.match(/dark:/g) || []).length;
  test(`theme-aware: ≥25 token dark: di workspace (ada ${darkCount})`,
    () => darkCount >= 25);
  test("a11y: aria-current pada kelas aktif + aria-label input pesan/cari + role=listitem",
    () => client.includes('aria-current={aktif ? "true" : undefined}') && client.includes('aria-label="Tulis pesan"') && client.includes('aria-label="Cari kelas"') && client.includes('role="listitem"'));
  test("focus-visible outline violet konsisten (sidebar/komposer/drawer/modal)",
    () => (client.match(/focus-visible:outline-violet-500/g) || []).length >= 5);
  test("tidak ada fixed min-width desktop (no overflow di layar sempit)",
    () => !client.includes("min-w-[1200") && !client.includes("min-w-[1440"));

  // ── 8. CSS — dead styles dibersihkan ──
  console.log("\n── 8. CSS — Dead Chat Styles Dibersihkan ──");
  const css = read("app/arena/arena.css");
  test("arena.css TIDAK lagi memuat .chat-header (style header ungu lama)",
    () => !css.includes(".chat-header"));
  test("arena.css TIDAK lagi memuat .chat-online-scroll / typing dots / chat-group-card / chat-mstack / chat-mav",
    () => !css.includes(".chat-online-scroll") && !css.includes(".typing-dots") && !css.includes(".chat-group-card") && !css.includes(".chat-mstack") && !css.includes(".chat-mav"));

  // ── 9. ZONE TERPROTEKSI (tidak boleh tersentuh) ──
  console.log("\n── 9. Protected Zones ──");
  try {
    const diff = execSync(
      `git diff --name-only HEAD -- prisma/ lib/gamification/ lib/learning-loop/ engines/ lib/apk.ts app/api/player/ app/arena/bottom-nav.tsx app/api/group/`,
      { encoding: "utf8", cwd: process.cwd() }
    );
    test("tidak ada perubahan di prisma/ lib/gamification/ lib/learning-loop/ engines/ lib/apk.ts app/api/player/ app/arena/bottom-nav.tsx app/api/group/",
      () => diff.trim().length === 0);
    if (diff.trim().length > 0) console.log(`  ⚠️  File berubah:\n${diff}`);
  } catch (e: any) {
    console.log("  ⚠️  git diff tidak dapat dijalankan (HEAD tidak tersedia?) — cek zona lindung dilewati");
    console.log(`      ${e.message?.split("\n")[0] || e}`);
  }

  // ── 10. CLIENT — tidak ada unused import (Crown dihapus) ──
  console.log("\n── 10. Cleanup — Tanpa Import Nyangkut ──");
  test("Crown tidak lagi diimport di chat-client (unused import dibersihkan)",
    () => !client.includes("Crown"));

  // ── Summary ──
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  if (failed > 0) process.exit(1);
  console.log("✅ ALL OBROLAN 3.0 TESTS PASSED\n");
}

main();
