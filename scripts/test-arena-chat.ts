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
  console.log("\n📋 OBROLAN 4.0 TEST — Student Shell Class Chat Workspace (T.1–T.30)");
  console.log("=".repeat(60));

  const page = read("app/arena/chat/page.tsx");
  const layout = read("app/arena/layout.tsx");
  // FIX FIRST-PAINT (5.x): keputusan lebar konten (isChatWeb/isAiWorkspace +
  // ternary container + banner boost) pindah dari layout.tsx ke client
  // container — strings berikut dibaca dari file baru, identik verbatim.
  const container = read("components/arena/workspace-container.tsx");
  const client = read("app/arena/chat/chat-client.tsx");
  const getRoute = read("app/api/chat/[groupId]/route.ts");
  const sendRoute = read("app/api/chat/send/route.ts");
  const delRoute = read("app/api/chat/message/[messageId]/route.ts");
  const lockRoute = read("app/api/chat/[groupId]/lock/route.ts");
  const schema = read("prisma/schema.prisma");
  const sql = read("prisma/migrations/manual/2026-08-12_obrolan4_chat_lock.sql");
  const pkg = read("package.json");

  // ── T.1 — Test & Script Exists ──
  console.log("\n── T.1 — Test & Script Exists ──");
  test("package.json punya test:arena-chat",
    () => pkg.includes('"test:arena-chat"') && pkg.includes("scripts/test-arena-chat.ts"));
  test("file test ini memuat cakupan 4.0 (moderasi, lock, Student Shell)",
    () => fs.existsSync("app/api/chat/message/[messageId]/route.ts") && fs.existsSync("app/api/chat/[groupId]/lock/route.ts"));

  // ── T.2 — Web Chat Tanpa Navigasi Arena (Student Shell) ──
  console.log("\n── T.2 — Web Chat: Header Global Kanonik (bukan header produk) ──");
  test("isChatWeb = !apk && pathname.startsWith('/arena/chat') (Web saja, APK tidak) — kini di ArenaWorkspaceContainer (usePathname, first-paint aman)",
    () => container.includes("!apk && pathname.startsWith(\"/arena/chat\")") && container.includes("usePathname()"));
  test("web chat memakai header GLOBAL kanonik (BackHome + Bell + Theme) — TIDAK ada top bar 'Obrolan' tersendiri",
    () => layout.includes("<BackHome") && layout.includes("<NotificationBell />") && layout.includes("<ThemeToggle />") && !layout.includes("Ruang komunikasi kelas"));
  test("TIDAK ada identitas/header produk di layout untuk chat (tanpa navbar/subnav Arena, tanpa MessageCircle header)",
    () => !layout.includes("<MessageCircle") && !layout.includes("isChatWeb ? (") && !layout.includes("navItems") && !layout.includes("aria-label=\"Navigasi Arena\"") && !layout.includes("rounded-full border border-gray-200 bg-slate-50 p-1"));
  test("ActiveBoostBanner tidak tampil di web chat ({!isChatWeb && <ActiveBoostBanner />}) — banner kini dirender di ArenaWorkspaceContainer",
    () => container.includes("!isChatWeb && !isAiWorkspace && <ActiveBoostBanner />"));
  test("toolbar INTERNAL workspace chat tetap ada di chat-client (judul 'Obrolan' di pane class list — konten, bukan header global)",
    () => read("app/arena/chat/chat-client.tsx").includes(">Obrolan</h2>") && read("app/arena/chat/chat-client.tsx").includes("Kelas Aktif"));
  test("navbar Arena dihapus total (Misi/Liga/Badges dll. bukan item layout — chat & arena lain menuju via Student Shell)",
    () => !layout.includes('href: "/arena/misi"') && !layout.includes('href: "/arena/league"') && !layout.includes('href: "/arena/player/badges"') && !layout.includes('label: "Obrolan"'));

  // ── T.3 — APK Compat Tetap ──
  console.log("\n── T.3 — APK Compat (TWA) ──");
  test("apk = await isApk() + BottomNav hanya untuk APK tetap ({apk && <BottomNav />})",
    () => layout.includes("await isApk()") && layout.includes("{apk && <BottomNav />}"));
  test("auth gate RUTE_TANPA_GERBANG tetap utuh",
    () => layout.includes("redirect(RUTE_TANPA_GERBANG)") && layout.includes("RUTE_TANPA_GERBANG"));
  test("APK memakai chrome Arena biasa (isChatWeb false saat apk) — bottom-nav tidak berubah; apk kini dari server (isApk() → prop, bukan document.cookie di useEffect) agar first paint stabil",
    () => client.includes('apk: boolean') && client.includes("bc_apk") && page.includes("await isApk()"));

  // ── T.4–T.5 — Kelas Aktif Saja (Server Page) ──
  console.log("\n── T.4–T.5 — Data Integrity: Hanya Kelas AKTIF ──");
  test("membership query memfilter group.isActive: true (kelas arsip tak tampil)",
    () => page.includes("group: { isActive: true }"));
  test("kelas yang diampu guru (teacherId) juga difilter isActive: true (ownedGroups)",
    () => page.includes("teacherId: user.id, isActive: true"));
  test("sidebar menggabungkan 2 sumber: GroupMember + ownedGroups (guru bukan member)",
    () => page.includes("db.groupMember.findMany") && page.includes("db.group.findMany") && page.includes("isPotentialTeacher"));
  test("dedupe kelas via seen Set (guru yang juga member tidak dobel)",
    () => page.includes("new Set<string>()") && page.includes("seen.has"));
  test("auth gate getUser + redirect /arena/login tetap ada",
    () => page.includes("await getUser()") && page.includes('redirect("/arena/login")'));

  // ── T.6–T.7 — Kelas Inaktif Diblokir di API ──
  console.log("\n── T.6–T.7 — API: Kelas Inaktif Diblokir ──");
  test("GET /api/chat/[groupId] memakai isActive: true (404 untuk kelas arsip)",
    () => getRoute.includes("isActive: true") && getRoute.includes("CLASS_NOT_FOUND"));
  test("POST /api/chat/send memakai isActive: true (404 untuk kelas arsip)",
    () => sendRoute.includes("isActive: true") && sendRoute.includes("CLASS_NOT_FOUND"));
  test("DELETE message & POST lock juga menolak kelas inaktif (404)",
    () => delRoute.includes("isActive: true") && lockRoute.includes("isActive: true"));

  // ── T.8 — URL Langsung Kelas Mati → Unavailable ──
  console.log("\n── T.8 — Direct URL Protection (Client) ──");
  test("404/403 di client → convState unavailable + tombol 'Kembali ke Obrolan' + router.refresh()",
    () => client.includes("res.status === 404 || res.status === 403") && client.includes("Kembali ke Obrolan") && client.includes("router.refresh()"));
  test("empty state 'Obrolan tidak tersedia' + 'Kelas ini sudah tidak aktif.'",
    () => client.includes("Obrolan tidak tersedia") && client.includes("Kelas ini sudah tidak aktif"));

  // ── T.9–T.12 — Akses Membaca/Menulis ──
  console.log("\n── T.9–T.12 — Member & Teacher: Baca + Kirim ──");
  test("GET mengizinkan member kelas (pengecekan GroupMember) tanpa role khusus",
    () => getRoute.includes("db.groupMember.findUnique") && getRoute.includes("allowed = !!membership"));
  test("GET mengizinkan guru kelas (teacherId === user.id) + admin/founder",
    () => getRoute.includes("group.teacherId === user.id") && getRoute.includes('user.role === "ADMIN"'));
  test("SEND mengizinkan member (GroupMember) + guru/admin/founder — tanpa gerbang role yang menghalangi murid",
    () => sendRoute.includes("allowed = !!membership") && sendRoute.includes("group.teacherId === user.id"));
  test("validasi konten tetap: 1000 karakter + strip HTML",
    () => sendRoute.includes("1000") && (sendRoute.includes("strip") || sendRoute.includes("replace")));

  // ── T.13–T.14 — Moderasi Guru ──
  console.log("\n── T.13–T.14 — Teacher Moderation (Soft-Delete) ──");
  test("DELETE /api/chat/message/[messageId] ada (soft-delete, deletedAt/deletedBy)",
    () => delRoute.includes("deletedAt: new Date()") && delRoute.includes("deletedBy: user.id"));
  test("guru kelas (admin/founder) boleh hapus pesan apa pun — student-only gate tidak ada",
    () => delRoute.includes("message.group.teacherId === user.id") && delRoute.includes("user.isFounder"));
  test("murid TIDAK bisa hapus pesan orang lain (CHAT_DELETE_FORBIDDEN, hanya owner/teacher)",
    () => delRoute.includes("if (!isOwner && !isTeacher)") && delRoute.includes("CHAT_DELETE_FORBIDDEN"));
  test("soft-delete idempotent (pesan sudah dihapus → sukses tanpa error)",
    () => delRoute.includes("if (message.deletedAt)"));
  test("klien: menu hapus hanya muncul untuk pesan milik sendiri / guru kelas (canDelete)",
    () => client.includes("const canDelete = m.userId === userId || selected.isTeacher") && client.includes("menuFor"));
  test("pesan terhapus dirender placeholder 'Pesan telah dihapus' (MessageCircleOff) — isi tidak bocor",
    () => client.includes("Pesan telah dihapus") && client.includes("MessageCircleOff"));
  test("GET menyembunyikan isi pesan terhapus (sanitizeMessages → content null + user null)",
    () => getRoute.includes("m.deletedAt") && getRoute.includes("deleted: true") && getRoute.includes("content: null") && getRoute.includes("user: null"));

  // ── T.15–T.16 — Chat Lock: Guru Bisa, Murid Tidak ──
  console.log("\n── T.15–T.16 — Chat Lock (Authorization) ──");
  test("POST /api/chat/[groupId]/lock ada (guru kelas/admin/founder only)",
    () => lockRoute.includes("group.teacherId === user.id") && lockRoute.includes('user.role === "ADMIN"'));
  test("murid yang mencoba lock ditolak 403 CHAT_LOCK_FORBIDDEN",
    () => lockRoute.includes("if (!isTeacher)") && lockRoute.includes("CHAT_LOCK_FORBIDDEN"));
  test("klien: tombol kunci/buka hanya di panel MODERASI yang dirender untuk guru (selected.isTeacher)",
    () => client.includes("MODERASI") && client.includes("selected.isTeacher") && client.includes("toggleLock"));

  // ── T.17 — Locked Blokir Kirim Murid ──
  console.log("\n── T.17 — Locked: Kirim Murid Diblokir ──");
  test("server: SEND menolak murid saat chatLocked (403 CLASS_CHAT_LOCKED)",
    () => sendRoute.includes("group.chatLocked && !isTeacher") && sendRoute.includes("CLASS_CHAT_LOCKED"));
  test("server: guru tetap boleh kirim saat terkunci (isTeacher bypass)",
    () => sendRoute.includes("group.chatLocked && !isTeacher"));
  test("klien: composer murid menampilkan 'Obrolan sedang dikunci oleh guru.' tanpa input kirim",
    () => client.includes("Obrolan sedang dikunci oleh guru."));
  test("klien: cek lock sebelum kirim (locked && !selected.isTeacher → batalkan)",
    () => client.includes("locked") && client.includes("selected.isTeacher"));

  // ── T.18 — Teacher Unlock ──
  console.log("\n── T.18 — Teacher Unlock ──");
  test("lock route menerima locked:false (unlock) dan mengembalikan { success, locked }",
    () => lockRoute.includes("locked = Boolean(body?.locked)") && lockRoute.includes("chatLocked: locked"));
  test("klien: guru punya tombol 'Buka Kembali' saat chat terkunci",
    () => client.includes("Buka Kembali"));

  // ── T.19 — Tanpa Data Palsu ──
  console.log("\n── T.19 — Tanpa Mock/Fake Data ──");
  test("tidak ada String.fromCharCode / avatar stack fiktif di server page",
    () => !page.includes("String.fromCharCode") && !page.includes("chat-mstack") && !page.includes("chat-mav"));
  test("client avatar = img src asli ATAU gradient inisial (tanpa String.fromCharCode)",
    () => client.includes("return <img src={src}") && client.includes("INITIALS_COLORS") && !client.includes("String.fromCharCode"));
  test("badge online = hitungan DB asli (lastActiveAt window 5 menit), bukan angka acak",
    () => page.includes("ONLINE_WINDOW_MS = 5 * 60 * 1000") && page.includes("lastActiveAt") && page.includes("onlineCount"));

  // ── T.20 — Member Preview Asli ──
  console.log("\n── T.20 — Real Member Preview ──");
  test("pratinjau anggota maks 12 dari DB (MEMBER_PREVIEW_LIMIT + take)",
    () => page.includes("MEMBER_PREVIEW_LIMIT = 12") && page.includes("take: MEMBER_PREVIEW_LIMIT"));
  test("memberCount dihitung real (db.groupMember.count per grup)",
    () => page.includes("db.groupMember.count"));
  test("klien menampilkan jumlah anggota asli + guru kelas (teacherId dari server)",
    () => client.includes("memberCount") && client.includes("teacherId") && client.includes("GURU"));

  // ── T.21 — Last Message Asli di Sidebar ──
  console.log("\n── T.21 — Real Last Message (Sidebar) ──");
  test("server mengambil lastMessage asli (findFirst orderBy createdAt desc + user.fullName)",
    () => page.includes("db.chatMessage.findFirst") && page.includes("createdAt: \"desc\""));
  test("klien sidebar menampilkan '{pengirim}: {isi}' dari data asli",
    () => client.includes("lastMessage") && client.includes("fullName"));

  // ── T.22 — Empty States ──
  console.log("\n── T.22 — Empty States ──");
  test("kelas kosong: 'Belum ada kelas untuk diajak ngobrol.' + CTA gabung kelas",
    () => client.includes("Belum ada kelas untuk diajak ngobrol") && client.includes("Gabung ke kelas untuk mulai berdiskusi"));
  test("percakapan kosong: 'Belum ada percakapan.' + 'Jadilah yang pertama menyapa teman sekelasmu.'",
    () => client.includes("Belum ada percakapan") && client.includes("Jadilah yang pertama menyapa"));
  test("kelas tidak tersedia: 'Obrolan tidak tersedia' + tombol kembali",
    () => client.includes("Obrolan tidak tersedia"));
  test("anggota online kosong: 'Belum ada anggota lain yang online.'",
    () => client.includes("Belum ada anggota lain yang online"));

  // ── T.23 — Responsive ──
  console.log("\n── T.23 — Responsive (Mobile-First) ──");
  test("3 pane desktop ≥1280: sidebar clamp(300px,25vw,360px), percakapan flex-1 min-w-0, konteks hidden xl:flex w-[300px]",
    () => client.includes('aria-label="Daftar kelas"') && client.includes("md:w-[clamp(300px,25vw,360px)]") && client.includes("flex-1 min-w-0") && client.includes("hidden xl:flex w-[300px]"));
  test("768–1023: sidebar toggleable (listToggle + tombol List, md:flex, lg:flex)",
    () => client.includes("listToggle") && client.includes('aria-label={listToggle ? "Sembunyikan daftar kelas"'));
  test("mobile <768: daftar kelas jadi layar penuh + back chevron 'Kembali ke daftar kelas'",
    () => client.includes("md:hidden") && client.includes('aria-label="Kembali ke daftar kelas"'));
  test("konteks drawer <1280: role=dialog w-80 max-w-[85vw] + backdrop bg-black/40",
    () => client.includes('role="dialog"') && client.includes("w-80 max-w-[85vw]") && client.includes("bg-black/40"));
  test("shell workspace: chat FULL-WIDTH w-full (3 pane, tanpa cap 1440px) vs halaman Arena lain 1280px desktop-first (tanpa max-w-lg md:max-w-4xl legacy) — ternary kini di ArenaWorkspaceContainer",
    () => container.includes('pathname.startsWith("/arena/chat")') && container.includes('? "w-full py-0 md:px-6"') && container.includes("max-w-[1280px] py-0 md:py-6 md:px-6") && !layout.includes("max-w-lg md:max-w-4xl"));
  test("tinggi shell APK-aware: APK md:h-[calc(100dvh-7rem)] vs web md:h-[calc(100dvh-3.5rem)] (top bar sendiri)",
    () => client.includes("md:h-[calc(100dvh-7rem)]") && client.includes("md:h-[calc(100dvh-3.5rem)]"));

  // ── T.24 — Dark Mode ──
  console.log("\n── T.24 — Dark Mode ──");
  const darkCount = (client.match(/dark:/g) || []).length;
  test(`theme-aware: ≥25 token dark: di workspace (ada ${darkCount})`, () => darkCount >= 25);

  // ── T.25 — No Overflow ──
  console.log("\n── T.25 — No Overflow (Layar Sempit) ──");
  test("tidak ada fixed min-w-[1200px]/min-w-[1440px] di client",
    () => !client.includes("min-w-[1200") && !client.includes("min-w-[1440"));
  test("percakapan flex-1 min-w-0 (text panjang tidak meledakkan layout)",
    () => client.includes("flex-1 min-w-0") && client.includes("break-words"));

  // ── T.26 — BottomNav Tidak Berubah ──
  console.log("\n── T.26 — BottomNav APK Tidak Disentuh ──");
  test("app/arena/bottom-nav.tsx 0 diff (APK navigation tetap)",
    () => execSync(`git diff --name-only HEAD -- app/arena/bottom-nav.tsx`, { encoding: "utf8", cwd: process.cwd() }).trim().length === 0);

  // ── T.27 — Protected Zones ──
  console.log("\n── T.27 — Protected Zones (dengan pengecualian prisma yang didokumentasikan) ──");
   test("prisma/ berubah HANYA pada additive schema/migration yang diizinkan",
     () => {
       const diff = execSync(`git diff --name-only HEAD -- prisma/`, { encoding: "utf8", cwd: process.cwd() }).trim();
       const lines = diff.split("\n").filter(Boolean);
       return lines.every((l) => l === "prisma/schema.prisma" || l === "prisma/migrations/manual/2026-08-15_learning_evidence.sql" || l === "prisma/migrations/manual/2026-08-15_question_metadata.sql");
    });
  test("migrasi manual idempoten ada: 2026-08-12_obrolan4_chat_lock.sql (ADD COLUMN IF NOT EXISTS + index)",
    () => sql.includes("ADD COLUMN IF NOT EXISTS") && sql.includes("chatLocked") && sql.includes("deletedAt") && sql.includes("deletedBy") && sql.includes("ChatMessage_groupId_deletedAt_idx"));
  test("schema.prisma: Group.chatLocked Boolean @default(false) setelah isActive",
    () => /chatLocked\s+Boolean\s+@default\(false\)/.test(schema) && schema.indexOf("chatLocked") > schema.indexOf("isActive"));
  test("schema.prisma: ChatMessage.deletedAt DateTime? + deletedBy String?",
    () => /deletedAt\s+DateTime\?/.test(schema) && /deletedBy\s+String\?/.test(schema));
  test("protected Arena zones tetap utuh kecuali evidence/coin boundary yang diizinkan",
    () => {
      const diff = execSync(
        `git diff --name-only HEAD -- lib/apk.ts lib/gamification/ lib/learning-loop/ engines/ app/api/player/ app/api/group/`,
        { encoding: "utf8", cwd: process.cwd() }
      ).trim().split("\n").filter(Boolean);
      return diff.every((file) => file === "app/api/player/coin/route.ts" || file === "lib/learning-loop/evidence.ts");
    });
  test("MuridMobileNav & murid layout: global nav /arena/chat tidak berubah",
    () => {
      // 4.2.1 menambah BackButton/toggle tema di kedua file — yang wajib
      // dipertahankan adalah invariant navigasi: drawer tetap 6 item &
      // Obrolan tetap menuju /arena/chat (bukan tab Arena baru).
      // Fase 5.1: nav sidebar pindah ke canonical STUDENT_NAV (nav-config.ts)
      // via <ShellNavList /> — 6 item & href diperiksa di config.
      const mobileNav = fs.readFileSync("components/dashboard/MuridMobileNav.tsx", "utf8");
      const layout = fs.readFileSync("app/(dashboard)/murid/layout.tsx", "utf8");
      const navConfig = fs.readFileSync("components/shell/nav-config.ts", "utf8");
      const drawerHrefs = ["/murid/beranda", "/murid/profile", "/arena", "/murid/karya", "/arena/chat", "/murid/pengaturan"];
      const okDrawer = drawerHrefs.every((h) => mobileNav.includes(`href: "${h}"`) || mobileNav.includes(`href="${h}"`));
      const okNav = layout.includes("<ShellNavList />") && (navConfig.match(/label: "/g) || []).length === 6;
      const okChat = mobileNav.includes("/arena/chat") && navConfig.includes('href: "/arena/chat"');
      return okDrawer && okNav && okChat;
    });

  // ── T.28 — Moderation Stats API ──
  console.log("\n── T.28 — Moderation Stats (GET, guru saja) ──");
  test("GET mengirim moderation { messagesToday, messagesDeleted } hanya untuk isTeacher",
    () => getRoute.includes("moderation: isTeacher ? await moderationStats(db, groupId) : undefined"));
  test("messagesToday dihitung WIB (UTC+7, start of day)",
    () => getRoute.includes("7 * 60 * 60 * 1000") && getRoute.includes("setUTCHours(0, 0, 0, 0)"));
  test("respons GET memuat locked (state chat lock) di kedua jalur (polling + initial)",
    () => getRoute.split("locked: group.chatLocked").length >= 3);
  test("klien panel MODERASI: 'Pesan hari ini', 'Pesan dihapus', status Aktif/Terkunci + tombol kunci/buka",
    () => client.includes("Pesan hari ini") && client.includes("Pesan dihapus") && client.includes("Terkunci") && client.includes("Aktif"));

  // ── T.29 — Lock State Sync Client ──
  console.log("\n── T.29 — Lock State Sync (server → client) ──");
  test("lock state diinisialisasi dari data server (lockedMap dari groups[].chatLocked)",
    () => client.includes("chatLocked") && client.includes("lockedMap"));
  test("lock state disinkron dari polling GET (respons data.locked)",
    () => client.includes("locked") && client.includes("data.locked") || client.includes("data?.locked") || client.includes("data.locked !== undefined"));
  test("locked diubah lewat toggleLock → POST lock → update lockedMap (state tunggal)",
    () => client.includes("toggleLock") && client.includes("lockedMap") && client.includes("fetch(\"/api/chat/"));

  // ── T.30 — Sidebar: Kelas Real + Guru ──
  console.log("\n── T.30 — Sidebar Kelas (real) + Badge Guru ──");
  test("server page mengirim isTeacher per kelas (g.teacherId === user.id) + data teacher asli",
    () => page.includes("isTeacher: g.teacherId === user.id") && page.includes("teacher: { select: { id: true, fullName: true, avatar: true } }"));
  test("klien sidebar menampilkan nama guru kelas (teacher.fullName) di bawah nama kelas",
    () => client.includes("teacher?.fullName") || client.includes("teacher.fullName") || client.includes("teacher?.fullName ||"));
  test("badge GURU di pesan guru (m.userId === selected.teacherId) dan di daftar anggota",
    () => client.includes("isGuruMsg") && client.includes("GURU"));
  test("icon kunci tampil di sidebar untuk kelas terkunci (lock icon per kelas)",
    () => client.includes("chatLocked") && (client.includes("Lock") || client.includes("LockOpen")));
  test("data real (tanpa mock): tidak ada array kelas hardcoded/fiktif di client",
    () => !client.includes("fromCharCode") && !client.includes("dummy") && !client.includes("mockData"));

  // ── REGRESSION — Server Page Data Integrity ──
  console.log("\n── REGRESSION — Server Page (3.0) ──");
  test("enriched groups memuat memberCount/onlineCount/lastMessage/members asli",
    () => page.includes("memberCount") && page.includes("onlineCount") && page.includes("lastMessage") && page.includes("members"));

  // ── REGRESSION — Chat API Contract ──
  console.log("\n── REGRESSION — Chat API Contract ──");
  test("GET tetap mengembalikan { messages } + mendukung limit/before/after (polling lama dipertahankan)",
    () => getRoute.includes("messages") && getRoute.includes("limit") && getRoute.includes("before") && getRoute.includes("after"));
  test("error code CLASS_NOT_FOUND / CLASS_MESSAGE_FORBIDDEN tetap ada (kontrak error sama)",
    () => getRoute.includes("CLASS_NOT_FOUND") && sendRoute.includes("CLASS_MESSAGE_FORBIDDEN"));

  // ── REGRESSION — Client Workspace & Fitur ──
  console.log("\n── REGRESSION — Client Workspace & Fitur ──");
  test("convState idle/loading/ok/unavailable (mekanisme existing dipertahankan)",
    () => client.includes("type ConvState") && client.includes("\"unavailable\""));
  test("polling `after` + backoff 4s→15s + pause visibilityState",
    () => client.includes("after=") && client.includes("delay + 2000, 15000") && client.includes("visibilityState"));
  test("kirim pesan: temp-id optimistik + rollback + restore input saat gagal",
    () => client.includes("temp-${Date.now()}") && client.includes("setInput(text)") && client.includes("Pesan belum terkirim"));
  test("grouping pesan per 5 menit (GROUP_WINDOW_MS) + label nama hanya di pesan baru",
    () => client.includes("GROUP_WINDOW_MS") && client.includes("compact"));
  test("APK: join kelas modal inline (POST /api/group/join) + web: href /murid/gabung-kelas",
    () => client.includes('fetch("/api/group/join"') && client.includes('href="/murid/gabung-kelas"'));
  test("APK modal punya kode akses + Batal/Gabung + aria-modal (a11y)",
    () => client.includes('aria-label="Gabung Kelas"') && client.includes("Kode akses kelas") && client.includes('placeholder="Contoh: ABC123"'));
  test("a11y: aria-current kelas aktif + aria-label Tulis pesan/Cari kelas + role=listitem",
    () => client.includes('aria-current={aktif ? "true" : undefined}') && client.includes('aria-label="Tulis pesan"') && client.includes('aria-label="Cari kelas"') && client.includes('role="listitem"'));
  test("focus-visible outline violet konsisten (≥5 di client)",
    () => (client.match(/focus-visible:outline-violet-500/g) || []).length >= 5);

  // ── REGRESSION — CSS Dead Styles ──
  console.log("\n── REGRESSION — CSS Dead Styles ──");
  const css = read("app/arena/arena.css");
  test("arena.css TIDAK memuat .chat-header / .chat-online-scroll / typing dots / chat-group-card / chat-mstack / chat-mav",
    () => !css.includes(".chat-header") && !css.includes(".chat-online-scroll") && !css.includes(".typing-dots") && !css.includes(".chat-group-card") && !css.includes(".chat-mstack") && !css.includes(".chat-mav"));

  // ── REGRESSION — Cleanup ──
  console.log("\n── REGRESSION — Cleanup ──");
  test("Crown tidak lagi diimport di chat-client (unused import dibersihkan)",
    () => !client.includes("Crown"));

  // ── Summary ──
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  if (failed > 0) process.exit(1);
  console.log("✅ ALL OBROLAN 4.0 TESTS PASSED\n");
}

main();
