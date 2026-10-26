/**
 * Dasbor UMUM "ready to go" — regression tests (tanpa DB; DB & Supabase di-mock).
 *
 * Membuktikan:
 *   1. Kategori sah di server hanya Mahasiswa/Dosen/Umum; INVESTOR/TAMU internal.
 *      UI tidak lagi menanyakan kategori: kosong → UMUM (bawaan server).
 *   2. Allowlist server parseRoleSelection + flag ENABLE_ROLE_UMUM (default mati).
 *   3. Intent v2 UMUM: roundtrip saat flag hidup; ditolak saat flag mati; v1 tak berubah.
 *   4. GET /api/auth/role-options menyembunyikan UMUM saat flag mati.
 *   5. Konstanta produk (8 kartu, href, BIGT eksternal, AKU SASTRAWAN satu konstanta).
 *   6. Guard halaman /umum (logged-out → /login?next=, peran lain → dasbornya).
 *   7. Dasbor /umum: header Akun (bukan "Masuk"), nav, gim, aktivitas tanpa data palsu.
 *   8. Tidak ada "Investor" di UI pilihan peran / dasbor umum.
 *   9. Alat AI guru → 403 "Fitur khusus guru." untuk UMUM SEBELUM kuota (bukan 402).
 *  10. Presence menghitung UMUM terpisah; Toko Karya jual → 403 UMUM; laporan premium.
 *  11. Migrasi DOSEN aditif.
 *
 * Usage: npx tsx scripts/test-umum-ready.ts
 */
import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve } from "path";
import Module from "module";

let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) { passed++; console.log(`  ✅ ${label}`); }
  else { failed++; console.log(`  ❌ ${label}`); }
}
const ROOT = process.cwd();
const has = (p: string) => existsSync(resolve(ROOT, p));
const src = (p: string) => (has(p) ? readFileSync(resolve(ROOT, p), "utf8") : "");
const code = (p: string) => src(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

// ─── Mocks ───
type MockUser = { id: string; role: string; isFounder: boolean; [k: string]: unknown };
let currentUser: MockUser | null = null;
const dbCalls: string[] = [];
const dbMock: any = new Proxy({}, {
  get(_t, model: string) {
    return new Proxy({}, {
      get(_m, op: string) {
        return (..._a: unknown[]) => { dbCalls.push(`${model}.${op}`); return Promise.reject(new Error(`db not allowed: ${model}.${op}`)); };
      },
    });
  },
});
const supabaseMock = {
  getUser: async () => currentUser,
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser ? { id: "sb-" + currentUser.id } : null } }) } }),
};
const redisMock = { get: async () => null, set: async () => undefined, del: async () => undefined, incr: async () => 1, expire: async () => 1, getOrSet: async (_k: string, fn: () => Promise<unknown>) => fn() };
class RedirectSignal extends Error { constructor(public url: string) { super("NEXT_REDIRECT " + url); } }
const navMock = { redirect: (url: string) => { throw new RedirectSignal(url); }, notFound: () => { throw new Error("NOT_FOUND"); } };
const M = Module as any;
const MOCKS: Record<string, unknown> = {
  [resolve(ROOT, "lib/db.ts")]: { db: dbMock, prisma: dbMock, default: dbMock },
  [resolve(ROOT, "lib/supabase/server.ts")]: supabaseMock,
  [resolve(ROOT, "lib/redis.ts")]: { default: redisMock, cache: redisMock, redis: redisMock, __esModule: true },
};
const origLoad = M._load;
M._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === "next/navigation") return navMock;
  try { const f = M._resolveFilename(request, parent, isMain); if (f in MOCKS) return MOCKS[f]; } catch { /* */ }
  return origLoad.apply(this, arguments as any);
};
const MISSING: any = new Proxy(function () { return undefined; }, { get: (_t, k) => (k === Symbol.iterator ? [][Symbol.iterator] : k === "length" ? 0 : MISSING), apply: () => undefined });
/** Modul yang belum ada (mis. di main) → stub, supaya baseline merah melapor ❌ alih-alih crash. */
const R = (p: string) => (has(p) ? require(resolve(ROOT, p)) : MISSING);
const setFlag = (on: boolean) => { if (on) process.env.ENABLE_ROLE_UMUM = "true"; else delete process.env.ENABLE_ROLE_UMUM; };

async function main() {
  process.env.BC_ROLE_INTENT_SECRET = "test-intent-secret-umum-ready";

  // ═══ 1. Kategori ═══
  console.log("\n1. Kategori UMUM yang terlihat");
  const kat = has("lib/auth/kategori-umum.ts") ? R("lib/auth/kategori-umum.ts") : {};
  assert(JSON.stringify(kat.KATEGORI_UMUM_PILIHAN) === JSON.stringify(["MAHASISWA", "DOSEN", "UMUM"]), "pilihan = Mahasiswa, Dosen, Umum (urutan tetap)");
  assert(typeof kat.kategoriUmumLabel === "function" && kat.kategoriUmumLabel("INVESTOR") === null && kat.kategoriUmumLabel("TAMU") === null, "INVESTOR/TAMU tidak punya label publik (internal)");
  assert(typeof kat.kategoriUmumLabel === "function" && kat.kategoriUmumLabel("DOSEN") === "Dosen", "label DOSEN = Dosen");
  assert(/DOSEN/.test(src("prisma/schema.prisma").match(/enum KategoriUmum \{[\s\S]*?\}/)?.[0] ?? ""), "enum KategoriUmum memuat DOSEN");
  const migDir = resolve(ROOT, "prisma/migrations");
  const dosenMig = readdirSync(migDir).filter((d) => d.includes("kategori_umum_dosen"));
  const dosenSql = dosenMig[0] ? src(`prisma/migrations/${dosenMig[0]}/migration.sql`).replace(/--.*$/gm, "") : "";
  assert(/ALTER TYPE "KategoriUmum" ADD VALUE IF NOT EXISTS 'DOSEN'/.test(dosenSql) && !/DROP|RENAME/i.test(dosenSql), "migrasi DOSEN aditif (ADD VALUE, tanpa DROP/RENAME)");
  assert(/'INVESTOR'/.test(src("prisma/migrations/20261025000100_profile_kategori_umum/migration.sql")) || /INVESTOR/.test(src("prisma/schema.prisma")), "INVESTOR tetap ada di DB (data lama terbaca)");

  // ═══ 2. Allowlist server + flag ═══
  console.log("\n2. parseRoleSelection + flag");
  const ri = R("lib/auth/role-intent.ts");
  setFlag(false);
  assert(typeof ri.parseRoleSelection === "function" && ri.parseRoleSelection("UMUM", "MAHASISWA") === null, "flag MATI: UMUM ditolak server");
  assert(ri.parseRoleSelection?.("GURU", null)?.role === "GURU" && ri.parseRoleSelection?.("MURID", "DOSEN")?.kategoriUmum === null, "flag MATI: GURU/MURID tetap (kategori diabaikan)");
  setFlag(true);
  for (const k of ["MAHASISWA", "DOSEN", "UMUM"]) assert(ri.parseRoleSelection?.("UMUM", k)?.kategoriUmum === k, `flag HIDUP: UMUM+${k} diterima`);
  for (const k of [undefined, null]) assert(ri.parseRoleSelection?.("UMUM", k)?.role === "UMUM" && ri.parseRoleSelection?.("UMUM", k)?.kategoriUmum === "UMUM", `flag HIDUP: UMUM tanpa kategori (${String(k)}) → bawaan UMUM`);
  // Kategori tidak wajib, tetapi nilai yang DIKIRIM tetap divalidasi ketat.
  for (const k of ["INVESTOR", "TAMU", "", "mahasiswa", "ADMIN", 1, {}]) assert(ri.parseRoleSelection?.("UMUM", k) === null, `flag HIDUP: UMUM+${JSON.stringify(k)} ditolak`);
  assert(kat.resolveKategoriUmumInput?.(undefined) === "UMUM" && kat.resolveKategoriUmumInput?.(null) === "UMUM" && kat.resolveKategoriUmumInput?.("DOSEN") === "DOSEN" && kat.resolveKategoriUmumInput?.("INVESTOR") === null, "resolveKategoriUmumInput: kosong → UMUM, sah → dirinya, lain → tolak");
  for (const r of ["ADMIN", "INVESTOR", "umum", "", null]) assert(ri.parseRoleSelection?.(r, "UMUM") === null, `peran ${JSON.stringify(r)} ditolak`);

  // ═══ 3. Intent v2 ═══
  console.log("\n3. Intent v1/v2");
  const v2 = ri.signRoleSelectionIntent?.({ role: "UMUM", kategoriUmum: "DOSEN" });
  assert(typeof v2 === "string" && v2.startsWith("v2."), "flag HIDUP: intent UMUM disegel v2");
  const back = ri.verifyRoleSelectionIntent?.(v2);
  assert(back?.role === "UMUM" && back?.kategoriUmum === "DOSEN", "v2 roundtrip UMUM/DOSEN");
  const tampered = typeof v2 === "string" ? v2.replace(".DOSEN.", ".INVESTOR.") : "";
  assert(ri.verifyRoleSelectionIntent?.(tampered) === null, "v2 dimanipulasi → INVESTOR ditolak");
  const tampered2 = typeof v2 === "string" ? v2.replace(".DOSEN.", ".UMUM.") : "";
  assert(ri.verifyRoleSelectionIntent?.(tampered2) === null, "v2 kategori ditukar → signature gagal");
  const v1 = ri.signRoleIntent?.("MURID");
  assert(typeof v1 === "string" && v1.startsWith("v1.") && ri.verifyRoleIntent(v1) === "MURID" && ri.verifyRoleSelectionIntent?.(v1)?.role === "MURID", "v1 GURU/MURID tidak berubah");
  setFlag(false);
  assert(ri.verifyRoleSelectionIntent?.(v2) === null, "flag dimatikan → intent v2 yang sudah tersegel tidak sah");
  assert(ri.signRoleSelectionIntent?.({ role: "UMUM", kategoriUmum: "DOSEN" }) === null, "flag MATI: tidak bisa menyegel UMUM");
  assert(ri.verifyRoleIntent(v2) === null, "verifyRoleIntent (v1) tetap menolak v2");

  // ═══ 4. role-options ═══
  console.log("\n4. GET /api/auth/role-options");
  if (has("app/api/auth/role-options/route.ts")) {
    const ro = R("app/api/auth/role-options/route.ts");
    setFlag(false);
    const off = await (await ro.GET()).json();
    assert(JSON.stringify(off.roles) === JSON.stringify(["GURU", "MURID"]), "flag MATI: hanya GURU/MURID");
    setFlag(true);
    const on = await (await ro.GET()).json();
    assert(on.roles.includes("UMUM") && on.kategoriUmum === undefined, "flag HIDUP: UMUM tampil, tanpa daftar kategori (tidak ditanyakan)");
    assert(!JSON.stringify(on).toLowerCase().includes("investor") && !JSON.stringify(on).includes("TAMU"), "role-options tidak pernah mengirim INVESTOR/TAMU");
  } else assert(false, "role-options route ada");
  for (const p of ["app/api/auth/role-intent/route.ts", "app/api/auth/complete-role/route.ts", "app/api/auth/create-user/route.ts"]) {
    assert(/parseRoleSelection/.test(code(p)), `${p} memvalidasi via parseRoleSelection (allowlist server)`);
  }
  assert(!/NEXT_PUBLIC_ENABLE_ROLE_UMUM/.test(src("lib/auth/umum-flag.ts") + src("app/(auth)/register/page.tsx") + src("app/auth/pilih-peran/page.tsx")), "flag tidak diekspos sebagai NEXT_PUBLIC_*");

  // ═══ 5. Produk ═══
  console.log("\n5. Konstanta produk");
  const prod = has("lib/umum/products.ts") ? R("lib/umum/products.ts") : { UMUM_PRODUCTS: [] };
  const byKey = Object.fromEntries((prod.UMUM_PRODUCTS as any[]).map((p) => [p.key, p]));
  assert((prod.UMUM_PRODUCTS as any[]).length === 8, "tepat 8 kartu produk");
  assert(byKey.NARA?.href === "/arena/ai", "NARA → /arena/ai");
  // JUMPA siap: tanpa label pengembangan saat flag build JUMPA hidup;
  // bila flag mati (/jumpa = 404) kartu kembali ke status pengembangan.
  {
    const prodPath = resolve(ROOT, "lib/umum/products.ts");
    const featPath = resolve(ROOT, "lib/features.ts");
    const load = (on: boolean) => {
      const prev = process.env.NEXT_PUBLIC_JUMPA_ENABLED;
      if (on) process.env.NEXT_PUBLIC_JUMPA_ENABLED = "true"; else delete process.env.NEXT_PUBLIC_JUMPA_ENABLED;
      delete require.cache[prodPath]; delete require.cache[featPath];
      const j = (require(prodPath).UMUM_PRODUCTS as any[]).find((x) => x.key === "JUMPA");
      if (prev === undefined) delete process.env.NEXT_PUBLIC_JUMPA_ENABLED; else process.env.NEXT_PUBLIC_JUMPA_ENABLED = prev;
      delete require.cache[prodPath]; delete require.cache[featPath];
      return j;
    };
    const on = load(true), off = load(false);
    assert(on?.status === undefined && on?.href === "/jumpa", "JUMPA siap (flag JUMPA hidup): tanpa status pengembangan, → /jumpa");
    assert(off?.status === "dev", "flag JUMPA mati: kartu tidak menautkan ke 404 (status pengembangan)");
  }
  assert(byKey.NARA?.status === undefined, "NARA siap: tanpa status pengembangan");
  assert(byKey.MAIN_BERSAMA?.status === "dev" && byKey.AKU_SASTRAWAN?.status === "dev", "MAIN BERSAMA & AKU SASTRAWAN tetap berstatus pengembangan");
  assert(byKey.JALUR_CERDAS?.href === "/arena/jalur-cerdas", "JALUR CERDAS → /arena/jalur-cerdas");
  assert(byKey.BIGT?.external === true && /^https:\/\//.test(byKey.BIGT?.href ?? ""), "BIGT = tautan eksternal https");
  assert(byKey.AKSARA?.href === "/artikel" && byKey.TOKO_KARYA?.href === "/marketplace", "AKSARA → /artikel, TOKO KARYA → /marketplace");
  assert(prod.AKU_SASTRAWAN_HREF === "/umum/aku-sastrawan" && byKey.AKU_SASTRAWAN?.href === prod.AKU_SASTRAWAN_HREF, "AKU SASTRAWAN memakai satu konstanta /umum/aku-sastrawan");
  assert((code("app/umum/page.tsx").match(/aku-sastrawan/g) ?? []).length === 0, "halaman /umum tidak meng-hardcode tautan AKU SASTRAWAN");
  const roles = R("lib/auth/roles.ts");
  for (const p of prod.UMUM_PRODUCTS as any[]) {
    if (p.external || p.href.startsWith("/umum") || p.href === "/jumpa" || p.href === "/main-bersama" || p.href === "/artikel" || p.href === "/marketplace") continue;
    assert(roles.isUmumArenaPath(p.href), `kartu ${p.key} (${p.href}) dapat diakses UMUM di Arena`);
  }

  // ═══ 6. Guard halaman ═══
  console.log("\n6. requireUmumPage");
  if (has("lib/auth/umum-page.ts")) {
    const { requireUmumPage } = R("lib/auth/umum-page.ts");
    const tryGuard = async (u: MockUser | null) => { currentUser = u; try { const r = await requireUmumPage("/umum"); return { ok: r }; } catch (e) { return { redirect: (e as RedirectSignal).url }; } };
    assert((await tryGuard(null)).redirect === "/login?next=%2Fumum", "logged-out → /login?next=%2Fumum");
    assert((await tryGuard({ id: "g", role: "GURU", isFounder: false })).redirect === "/guru/beranda", "GURU → /guru/beranda");
    assert((await tryGuard({ id: "m", role: "MURID", isFounder: false })).redirect === "/murid/beranda", "MURID → /murid/beranda");
    assert((await tryGuard({ id: "a", role: "ADMIN", isFounder: false })).redirect === "/admin", "ADMIN → /admin");
    assert((await tryGuard({ id: "f", role: "UMUM", isFounder: true })).redirect === "/guru/beranda", "founder → dasbor founder (tanpa loop)");
    const ok = await tryGuard({ id: "u", role: "UMUM", isFounder: false });
    assert((ok as any).ok?.id === "u", "UMUM → halaman tampil");
  } else assert(false, "lib/auth/umum-page.ts ada");
  for (const p of ["app/umum/page.tsx", "app/umum/koleksi/page.tsx", "app/umum/notifikasi/page.tsx", "app/umum/pengaturan/page.tsx", "app/umum/aktivitas/page.tsx"]) {
    assert(/requireUmumPage\(/.test(code(p)), `${p} dijaga requireUmumPage`);
  }

  // ═══ 7. Dasbor ═══
  console.log("\n7. Dasbor /umum");
  const shell = code("components/umum/UmumShell.tsx");
  const page = code("app/umum/page.tsx");
  const nav = code("components/umum/UmumDashboardNav.tsx");
  const topbar = code("components/umum/UmumTopBar.tsx");
  const aktLib = code("lib/umum/aktivitas.ts");
  assert(/UmumAccountMenu/.test(shell) && /Akun/.test(topbar) && !/>\s*Masuk\s*</.test(shell + topbar + page), "header memakai avatar/menu Akun, bukan tombol Masuk");
  assert(/>Umum</.test(topbar) && !/Mahasiswa|Investor/i.test(topbar), "subjudul header = Umum (bukan Mahasiswa/Investor)");
  assert(/db\.notifikasi\s*\.count/.test(shell) && /unread > 0/.test(shell), "badge notifikasi = jumlah nyata, hanya bila > 0");
  assert(/name="q"/.test(topbar) && /searchParams/.test(page) && /cocok\(/.test(page), "pencarian header benar-benar memfilter /umum?q=");
  for (const l of ["Beranda", "Semua Produk", "Jelajahi", "Koleksi Saya", "Notifikasi", "Akun"]) assert(nav.includes(`"${l}"`), `nav memuat "${l}"`);
  assert(/UmumMobileBottomNav/.test(nav) && /lg:hidden/.test(nav) && /aria-current/.test(nav), "bottom nav mobile (lg:hidden, aria-current)");
  assert(/id="produk"/.test(page) && /id="gim"/.test(page), "seksi #produk & #gim ada");
  assert(/isUmumGameId/.test(page) && /unpublished/.test(page) && /premiumOnly/.test(page), "gim difilter allowlist UMUM, tanpa unpublished/premiumOnly");
  assert(/loadAktivitas/.test(page) && /xpLedger/.test(aktLib) && /pembelian/.test(aktLib) && /aktivitas-kosong/.test(page), "Aktivitas dari data nyata (XpLedger/Pembelian) + empty state");
  assert(!/Math\.random|faker|lorem|dummy|contoh aktivitas/i.test(page + aktLib), "tanpa data palsu di dasbor");
  assert(/Sedang dalam pengembangan/.test(page), "badge 'Sedang dalam pengembangan' untuk kartu dev");
  assert(/noopener noreferrer/.test(page) && /_blank/.test(page), "tautan eksternal rel=noopener noreferrer");
  assert(/href="#konten-umum"|#konten-umum/.test(shell), "skip link ke konten");
  assert(/UMUM_HOME/.test(code("app/jumpa/page.tsx")) && /Kembali ke dasbor/.test(src("app/main-bersama/page.tsx")), "JUMPA (dasbor /umum) / MAIN BERSAMA tidak lagi 'Kembali ke NARA'");
  assert(!/ComingSoon|Sedang dalam pengembangan/.test(code("app/jumpa/page.tsx")), "/jumpa tidak lagi menampilkan status pengembangan untuk UMUM");
  // Sentuhan warna merek: token tema saja (bg-bc-brand, buttonClass), tanpa palet mentah.
  assert(/var\(--bc-tile-nara\)/.test(page) && /bg-bc-navy/.test(page) && /buttonClass\(\{ variant: "primary"/.test(page), "kartu & CTA /umum memakai token tema (ubin --bc-tile-*, tombol navy, ui-btn primary)");
  assert(/next\/image/.test(page) && /umum-hero\.webp/.test(page) && /umum-jelajahi\.webp/.test(page), "hero & kartu Jelajahi memakai gambar WebP via next/image");
  assert(!/\b(?:bg|text|border|from|to|via)-(?:sky|blue|violet|emerald|teal|indigo)-\d/.test(page), "dasbor /umum tanpa kelas palet Tailwind mentah");

  // ═══ 8. Investor ═══
  console.log("\n8. Tanpa 'Investor' di UI");
  const visible = ["app/(auth)/register/page.tsx", "app/auth/pilih-peran/page.tsx", "components/auth/useRoleUmumAvailable.ts", "app/umum/page.tsx", "app/umum/pengaturan/page.tsx", "app/umum/aktivitas/page.tsx", "components/umum/UmumShell.tsx", "components/umum/UmumTopBar.tsx", "components/umum/AktivitasList.tsx", "lib/umum/aktivitas.ts", "components/umum/UmumDashboardNav.tsx", "lib/umum/products.ts", "app/api/auth/role-options/route.ts"];
  for (const p of visible) assert(has(p) && !/investor/i.test(code(p)), `${p} ada & tanpa kata Investor`);
  assert(/UMUM/.test(code("app/(auth)/register/page.tsx")) && /UMUM/.test(code("app/auth/pilih-peran/page.tsx")), "register & pilih-peran punya opsi UMUM");
  assert(!/Investor|Mahasiswa|Dosen/.test(src("app/umum/page.tsx")), "dasbor /umum tanpa label kategori (Investor/Mahasiswa/Dosen)");

  // ═══ 8b. Langkah kategori dihapus ═══
  console.log("\n8b. Tanpa langkah kategori");
  assert(!has("components/auth/KategoriUmumPicker.tsx"), "KategoriUmumPicker dihapus");
  for (const p of ["app/(auth)/register/page.tsx", "app/auth/pilih-peran/page.tsx", "app/umum/page.tsx", "app/umum/pengaturan/page.tsx"]) {
    const c = code(p);
    assert(!/KategoriUmumPicker|kategoriUmum|KATEGORI_UMUM|kategoriUmumLabel|Mahasiswa|Dosen/.test(c), `${p}: tanpa pemilih/label kategori`);
  }
  for (const p of ["app/(auth)/register/page.tsx", "app/auth/pilih-peran/page.tsx"]) {
    const c = code(p);
    assert(/useRoleUmumAvailable/.test(c), `${p}: opsi Umum tetap mengikuti flag server`);
    const umumStyle = c.slice(c.indexOf("UMUM: {"), c.indexOf("},", c.indexOf("UMUM: {")));
    assert(/bg-bc-brand/.test(umumStyle) && /border-bc-info/.test(umumStyle) && !/sky-\d/.test(umumStyle), `${p}: opsi Umum memakai token merek (tanpa sky-*)`);
  }
  assert(/disabled=\{!role\}/.test(code("app/(auth)/register/page.tsx")) && /canContinue = !!role;/.test(code("app/auth/pilih-peran/page.tsx")), "Lanjut aktif cukup dengan memilih peran");
  assert(/kategoriUmum \?\? KATEGORI_UMUM_DEFAULT/.test(code("lib/auth/google-provision.ts")), "provisioning Google: kategori kosong → UMUM");

  // ═══ 9. AI guru tools ═══
  console.log("\n9. Alat AI guru → 403 untuk UMUM");
  const guard = has("lib/auth/umum-guard.ts") ? R("lib/auth/umum-guard.ts") : { isUmumBlockedFromGuruTools: () => false, umumGuruToolForbidden: () => null };
  assert(guard.isUmumBlockedFromGuruTools({ role: "UMUM", isFounder: false }) === true, "UMUM diblok");
  for (const r of ["GURU", "MURID", "ADMIN"]) assert(guard.isUmumBlockedFromGuruTools({ role: r, isFounder: false }) === false, `${r} tidak terpengaruh`);
  assert(guard.isUmumBlockedFromGuruTools({ role: "UMUM", isFounder: true }) === false, "founder tidak terpengaruh");
  const resp = guard.umumGuruToolForbidden({ role: "UMUM", isFounder: false });
  const body = resp ? await resp.json() : {};
  assert(resp?.status === 403 && body.code === "FORBIDDEN_ROLE" && /khusus guru/i.test(body.error), "respons 403 FORBIDDEN_ROLE 'Fitur khusus guru.'");
  const aiRoutes = ["grading", "eyd", "feedback", "text-analysis", "rpp", "soal", "ilustrasi", "agents/export/pdf", "agents/export/docx", "agents/stream"];
  for (const r of aiRoutes) {
    const c = code(`app/api/ai/${r}/route.ts`);
    const gi = c.indexOf("umumGuruToolForbidden(user)");
    const qi = c.search(/checkAndPrepareDeduction\(|ensureMonthlyLedger\(|checkDailyExportLimit\(|checkAIQuota\(|checkQuota\(/);
    assert(gi > 0 && (qi === -1 || gi < qi), `/api/ai/${r}: guard UMUM dipanggil sebelum kuota`);
  }
  assert(/ALLOWED_ROLES|GURU/.test(code("app/api/ai/agents/run/route.ts")) && /403/.test(code("app/api/ai/agents/run/route.ts")), "/api/ai/agents/run tetap 403 non-guru");
  assert(!/umumGuruToolForbidden/.test((code("app/api/ai/bc/chat/route.ts") || "MISSING umumGuruToolForbidden")), "NARA (/api/ai/bc) tidak diblok");
  // Fungsional: eyd untuk UMUM → 403 tanpa query kuota/DB
  try {
    const eyd = R("app/api/ai/eyd/route.ts");
    currentUser = { id: "u1", role: "UMUM", isFounder: false };
    dbCalls.length = 0;
    const req = new Request("http://localhost/api/ai/eyd", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "halo dunia" }) });
    const res = await eyd.POST(req as any);
    assert(res.status === 403, `eyd UMUM → ${res.status} (harus 403, bukan 402)`);
    assert(!dbCalls.some((c) => /ledger|quota|credit/i.test(c)), "eyd UMUM tidak menyentuh kuota/ledger");
  } catch (e) { assert(false, `eyd fungsional dapat dijalankan (${(e as Error).message.slice(0, 80)})`); }

  // ═══ 10. Konsistensi lain ═══
  console.log("\n10. Presence, Toko Karya, laporan premium");
  const presence = code("lib/presence.ts");
  assert(/"UMUM"/.test(presence) && /umum/.test(presence) && /guru \+ .*murid.*admin.*umum|\+ ?umum/.test(presence.replace(/\s+/g, " ")), "presence menghitung umum & total menyertakan umum");
  assert(/role === "UMUM"\) role = "UMUM"|"UMUM"/.test(code("app/api/presence/heartbeat/route.ts")), "heartbeat: UMUM tidak lagi jatuh ke MURID");
  assert(/onlineUmum/.test(code("app/api/analytics/live/route.ts")) && /onlineUmum/.test(code("app/api/admin/monitoring/live/route.ts")), "API live mengirim onlineUmum");
  const karyaPost = code("app/api/karya/route.ts").split("export async function POST")[1] ?? "";
  assert(/role === "UMUM"/.test(karyaPost) && /403/.test(karyaPost) && karyaPost.indexOf("403") < karyaPost.indexOf("karya.create"), "POST /api/karya: UMUM → 403 sebelum create");
  try {
    const karya = R("app/api/karya/route.ts");
    currentUser = { id: "u2", role: "UMUM", isFounder: false };
    dbCalls.length = 0;
    const res = await karya.POST(new Request("http://localhost/api/karya", { method: "POST", body: JSON.stringify({ title: "x" }) }) as any);
    assert(res.status === 403 && !dbCalls.includes("karya.create"), "fungsional: UMUM jual karya → 403, tanpa karya.create");
  } catch (e) { assert(false, `karya fungsional (${(e as Error).message.slice(0, 80)})`); }
  const mp = code("app/api/marketplace/route.ts");
  assert(/role !== "GURU"/.test(mp), "POST /api/marketplace tetap khusus guru");
  assert(!/role === "UMUM"|isUmum/.test(code("app/api/marketplace/purchase/route.ts").split("POST")[1] ?? "") , "pembelian karya tidak memblok UMUM");
  const rep = code("app/api/admin/premium/report/route.ts");
  assert(!/user\.role === "MURID" \? "MURID" : "GURU"/.test(rep), "laporan premium: non-MURID tidak otomatis GURU");
  assert(/user\.role === "GURU" \? "GURU"/.test(rep), "laporan premium: GURU eksplisit");
  assert(!/MURID", "GURU", "UMUM"/.test(rep) && /in: \["MURID", "GURU"\]/.test(rep), "filter laporan premium tetap MURID/GURU (UMUM tidak dihitung)");
  const trial = code("lib/ai-gateway/trial-service.ts");
  assert(/role !== "GURU"\) return false/.test(trial), "Pro trial tetap khusus GURU (Dosen/UMUM tidak dapat trial)");
  const checkout = code("app/api/billing/checkout/route.ts");
  // Premium Umum: UMUM hanya boleh paket UMUM (targetRole cocok) & di balik flag.
  assert(/allowedRoles = \["GURU", "ADMIN", "MURID", "UMUM"\]/.test(checkout) && /plan\.targetRole !== user\.role/.test(checkout) && /isUmumPremiumEnabled\(\)/.test(checkout) && /403/.test(checkout), "checkout paket: UMUM hanya paket UMUM (lintas peran → 403, flag mati → 403)");

  const proxy = code("lib/supabase/proxy.ts");
  assert(/selfAuthPaths = \[[^\]]*"\/umum"/.test(proxy), "proxy: /umum menggerbangi sendiri (login mempertahankan ?next=/umum)");

  console.log(`\nHasil: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
