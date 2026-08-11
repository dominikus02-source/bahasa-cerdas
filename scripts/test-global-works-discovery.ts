/**
 * test-global-works-discovery.ts — regresi GLOBAL STUDENT WORKS DISCOVERY.
 *
 * Membuktikan pemisahan scope feed karya murid:
 *   global   — Guru A (Sekolah A) dapat melihat karya public Murid B (Sekolah B)
 *   school   — Guru A hanya melihat karya sekolahnya sendiri (Sekolah B TIDAK tampil)
 *   students — Guru A tidak melihat Murid B (bukan muridnya)
 *   default  — GURU tanpa param scope = students (backward-compatible);
 *              MURID/anon tanpa param = global (perilaku lama);
 *              MURID memaksa students = global (filter tidak meniadakan feed)
 *   guru tanpa murid → scope global TETAP discovery (bukan kosong)
 *   private  — StudentKarya TIDAK punya field visibility/status: seluruh karya
 *              bersifat public by-design; karya terhapus hard-delete (bukan
 *              soft-delete) sehingga tidak pernah muncul.
 *
 * Bagian 1: unit test logika murni (lib/karya/feed-scope.ts) — tanpa DB.
 * Bagian 2: asersi statis file route & halaman (konvensi repo, tanpa DB).
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  resolveKaryaFeedScope,
  buildKaryaScopeWhere,
} from "../lib/karya/feed-scope";

const root = process.cwd();
let failures = 0;
const checks: { name: string; pass: boolean; detail?: string }[] = [];

function check(name: string, pass: boolean, detail?: string) {
  checks.push({ name, pass, detail });
  if (!pass) failures++;
}

// ─────────────────────────── 1. Logika murni ───────────────────────────

// [1.1] Guru A (Sekolah A), scope=global → TANPA filter userId.
// Murid B (Sekolah B) tidak pernah dikecualikan: tidak ada restriksi sama sekali.
check(
  "1.1 Guru global melihat semua karya (where=null)",
  buildKaryaScopeWhere("global", []) === null &&
    buildKaryaScopeWhere("global", ["murid-b"], "Sekolah A") === null
);

// [1.2] School scope: fragment memfilter sekolah PENONTON, bukan penonton lain.
const schoolWhere = buildKaryaScopeWhere("school", [], "Sekolah A");
check(
  "1.2 School = filter Profile.school penonton (case-insensitive)",
  schoolWhere !== null &&
    typeof schoolWhere === "object" &&
    (schoolWhere as any).user?.profile?.school?.equals === "Sekolah A" &&
    (schoolWhere as any).user?.profile?.school?.mode === "insensitive"
);
// Murid B dari Sekolah B TIDAK lolos filter school Sekolah A.
check(
  "1.3 School A tidak memuat Sekolah B (semantik equals)",
  schoolWhere !== null &&
    typeof schoolWhere === "object" &&
    (schoolWhere as any).user?.profile?.school?.equals !== "Sekolah B"
);

// [1.4] School tanpa sekolah penonton → EMPTY (feed kosong, bukan global).
check(
  "1.4 School tanpa sekolah penonton = EMPTY",
  buildKaryaScopeWhere("school", [], null) === "EMPTY" &&
    buildKaryaScopeWhere("school", [], "  ") === "EMPTY"
);

// [1.5] Students scope: HANYA userId milik murid guru. Murid B (di luar daftar)
// tidak pernah masuk fragment.
const studentsWhere = buildKaryaScopeWhere("students", ["murid-a1", "murid-a2"], undefined);
check(
  "1.5 Students = userId in memberIds saja",
  studentsWhere !== null &&
    typeof studentsWhere === "object" &&
    JSON.stringify((studentsWhere as any).userId) === JSON.stringify({ in: ["murid-a1", "murid-a2"] })
);
check(
  "1.6 Students tidak memuat Murid B",
  studentsWhere !== null &&
    typeof studentsWhere === "object" &&
    !JSON.stringify((studentsWhere as any).userId).includes("murid-b")
);

// [1.7] Guru tanpa murid di scope students → EMPTY (monitoring kosong).
check("1.7 Students tanpa murid = EMPTY", buildKaryaScopeWhere("students", []) === "EMPTY");

// [1.8] Default backward-compatible.
check("1.8 GURU tanpa param scope = students (lama)", resolveKaryaFeedScope(null, "GURU") === "students");
check("1.9 MURID tanpa param scope = global (lama)", resolveKaryaFeedScope(null, "MURID") === "global");
check("1.10 anon tanpa param scope = global", resolveKaryaFeedScope(null, null) === "global");

// [1.11] MURID memaksa students → global (filter tidak meniadakan feed murid).
check("1.11 MURID paksa students = global", resolveKaryaFeedScope("students", "MURID") === "global");
check("1.12 GURU scope=global eksplisit = global", resolveKaryaFeedScope("global", "GURU") === "global");
check("1.13 GURU scope=school = school", resolveKaryaFeedScope("school", "GURU") === "school");

// [1.14] Guru TANPA MURID tetap discovery: global tidak pernah EMPTY.
check(
  "1.14 Guru tanpa murid, scope global tetap null (discovery hidup)",
  buildKaryaScopeWhere("global", []) === null
);

// [1.15] Private: tidak ada konsep private — global = null (semua public).
// "Karya private" tidak ada di model; yang dihapus hilang permanen (hard delete).
check(
  "1.15 Global tanpa field visibility (tidak ada filter deleted/status)",
  buildKaryaScopeWhere("global", [], null) === null
);

// ─────────────────────────── 2. Asersi statis ───────────────────────────

const ROUTE = join(root, "app/api/siswa/karya/route.ts");
const ARENA_FEED = join(root, "app/arena/feed/page.tsx");
const GURU_FEED = join(root, "app/(dashboard)/guru/feed-karya/page.tsx");
const SCHEMA = join(root, "prisma/schema.prisma");

for (const [label, p] of Object.entries({ route: ROUTE, arenaFeed: ARENA_FEED, guruFeed: GURU_FEED, schema: SCHEMA })) {
  if (!existsSync(p)) { check(`file ada: ${label}`, false, `${p} tidak ditemukan`); process.exit(1); }
}

const route = readFileSync(ROUTE, "utf8");
const arenaFeed = readFileSync(ARENA_FEED, "utf8");
const guruFeed = readFileSync(GURU_FEED, "utf8");
const schema = readFileSync(SCHEMA, "utf8");

// [2.1] Route memakai scope engine baru.
check("2.1 Route mengimpor resolveKaryaFeedScope", /resolveKaryaFeedScope/.test(route));
check("2.2 Route mengimpor buildKaryaScopeWhere", /buildKaryaScopeWhere/.test(route));
check("2.3 Route membaca param scope", /searchParams\.get\("scope"\)/.test(route));

// [2.4] Guru branch TIDAK lagi hardcode empty-return tanpa scope:
// early-return `karya: []` hanya terjadi lewat scopeWhere === "EMPTY".
check("2.4 Early-return kosong hanya lewat EMPTY scope", /scopeWhere === "EMPTY"/.test(route));

// [2.5] Cache key memuat scope (tidak ada cross-scope cache).
check("2.5 Cache key memuat scope", /\$\{scope\}/.test(route));

// [2.6] Arena feed: default scope guru = global (discovery).
check("2.6 Arena feed default scope global", /useState<"global" \| "school" \| "students">\("global"\)/.test(arenaFeed));
check("2.7 Arena feed mengirim scope untuk guru", /isGuruViewer\) params\.set\("scope", scopeRef\.current\)/.test(arenaFeed));
check("2.8 Arena feed: nav scope 3 pilihan", /Semua Indonesia/.test(arenaFeed) && /Sekolahku/.test(arenaFeed) && /Muridku/.test(arenaFeed));

// [2.9] Pusat Literasi: dua tab + scope param + CTA ajak murid (flow existing).
check("2.9 Pusat Literasi tab Jelajah Indonesia", /Jelajah Indonesia/.test(guruFeed));
check("2.10 Pusat Literasi tab Karya Muridku", /Karya Muridku/.test(guruFeed));
check("2.11 Pusat Literasi kirim scope=global", /params\.set\("scope", "global"\)/.test(guruFeed));
check("2.12 Empty state murid tidak misleading", /Belum ada karya dari muridmu\./.test(guruFeed));
check("2.13 CTA jelajah karya Indonesia", /Jelajahi karya murid Indonesia/.test(guruFeed));
check("2.14 CTA ajak murid → flow existing /guru/kelasku", /href="\/guru\/kelasku"/.test(guruFeed));

// [2.15] Privacy: StudentKarya TIDAK memiliki field visibility/status baru —
// tidak ada schema change (additive-only, tanpa migration baru).
const karyaModel = schema.slice(schema.indexOf("model StudentKarya"), schema.indexOf("model StudentKaryaLike"));
check("2.15 Tanpa field visibility baru", !/visibility|isPublic|published|deletedAt/i.test(karyaModel));
check("2.16 Tanpa schema baru", !/model KaryaReport|model KaryaVisibility/i.test(schema));

// ─────────────────────────── Ringkasan ───────────────────────────

console.log(`\nTest Global Works Discovery: ${checks.length - failures}/${checks.length} lulus`);
for (const c of checks) {
  if (!c.pass) console.log(`  ✗ ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
}
if (failures > 0) {
  console.log(`\n${failures} GAGAL ❌`);
  process.exit(1);
}
console.log("SEMUA LULUS ✅");
process.exit(0);
