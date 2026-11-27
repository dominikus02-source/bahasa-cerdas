/**
 * Tautan pendek QR buku teks — `/b/{KODE}`.
 *
 * Memastikan:
 *   1. setiap kode yang tercetak di buku (fixture) dikenali, tidak peka huruf;
 *   2. tidak ada kode di tabel yang tidak ada di buku;
 *   3. jumlah kode per kelas sesuai Daftar Kode Platform;
 *   4. setiap halaman tujuan (murid/guru/publik) benar-benar ada di app/;
 *   5. unitId bab ada di data/buku-panduan;
 *   6. pemilahan tamu/murid/guru/peran lain, dan kode tak dikenal → null;
 *   7. proxy tidak lagi melempar /b/ ke /login tanpa `next`.
 *
 * Catatan: tujuan diperiksa terhadap page.tsx/route.ts di app/. Tujuan yang
 * berupa route.ts pengalih (mis. /murid/ai → /arena/ai) sengaja dihindari.
 *
 *   npx tsx scripts/test-qr-short-links.ts
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { QR_CHAPTERS } from "../data/qr-codes";
import { getChapterById } from "../data/buku-panduan";
import { allQrCodes, findQrCode, resolveQrDestination, targetFor } from "../lib/qr/resolve";

const ROOT = resolve(__dirname, "..");
let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`PASS ${name}`);
  else {
    failed++;
    console.log(`FAIL ${name}${detail ? `\n     -> ${detail}` : ""}`);
  }
}

// ── Fixture ────────────────────────────────────────────────────────────────
const fixture = readFileSync(join(ROOT, "scripts/fixtures/qr-codes-buku-v5.txt"), "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"));

console.log("\n== 1. Semua kode buku dikenali ==");
const missing = fixture.filter((k) => !findQrCode(k));
check(`${fixture.length} kode buku dikenali`, missing.length === 0, missing.join(", "));
const caseFail = fixture.filter((k) => findQrCode(k.toLowerCase())?.kode !== k);
check("tidak peka huruf besar/kecil", caseFail.length === 0, caseFail.slice(0, 5).join(", "));
check("spasi & URI-encoded dirapikan", findQrCode(" bc-smp7-deskripsi-video ")?.kode === "BC-SMP7-DESKRIPSI-VIDEO" && findQrCode("BC%2DSMP7%2DDESKRIPSI%2DVIDEO")?.kode === "BC-SMP7-DESKRIPSI-VIDEO");

console.log("\n== 2. Tidak ada kode di luar buku ==");
const fixtureSet = new Set(fixture);
const extra = allQrCodes().filter((k) => !fixtureSet.has(k));
check("tabel ⊆ buku", extra.length === 0, extra.join(", "));

console.log("\n== 3. Jumlah per kelas ==");
const expected: Record<string, number> = { SMP7: 99, SMP8: 100, SMP9: 86, SMA10: 34 };
for (const [kelas, n] of Object.entries(expected)) {
  const got = allQrCodes().filter((k) => k.startsWith(`BC-${kelas}-`)).length;
  check(`${kelas}: ${n} kode`, got === n, `dapat ${got}`);
}

// ── Rute app/ ──────────────────────────────────────────────────────────────
function collectRoutes(dir: string, segs: string[], out: string[][]) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name.startsWith("_") || name.startsWith("@")) continue;
      const next = name.startsWith("(") && name.endsWith(")") ? segs : [...segs, name];
      collectRoutes(full, next, out);
    } else if (/^(page|route)\.(tsx|ts|jsx|js)$/.test(name)) {
      out.push(segs);
    }
  }
}
const routes: string[][] = [];
collectRoutes(join(ROOT, "app"), [], routes);
function routeExists(path: string): boolean {
  const parts = path.split("?")[0].split("/").filter(Boolean);
  return routes.some(
    (r) => r.length === parts.length && r.every((seg, i) => (seg.startsWith("[") && seg.endsWith("]")) || seg === parts[i]),
  );
}

console.log("\n== 4. Halaman tujuan ada ==");
const badTargets: string[] = [];
for (const kode of allQrCodes()) {
  const entry = findQrCode(kode)!;
  const targets = [targetFor(entry, "murid"), targetFor(entry, "guru"), entry.rule.tamu ?? null];
  for (const t of targets) {
    if (t && (t.includes("{") || !routeExists(t))) badTargets.push(`${kode} → ${t}`);
  }
}
check("semua tujuan punya page.tsx/route.ts", badTargets.length === 0, badTargets.slice(0, 10).join("\n     -> "));
check("route /b/[kode] ada", routeExists("/b/BC-SMP7-DESKRIPSI-VIDEO") && routeExists("/b/BC-SMP7-DESKRIPSI-BACA/info"));

console.log("\n== 5. unitId bab ada di Panduan Guru ==");
const badUnits = QR_CHAPTERS.filter((c) => !getChapterById(c.unitId)).map((c) => `${c.prefix} → ${c.unitId}`);
check(`${QR_CHAPTERS.length} bab terhubung ke data/buku-panduan`, badUnits.length === 0, badUnits.join(", "));

console.log("\n== 6. Pemilahan audiens ==");
const murid = { role: "MURID", isFounder: false };
const guru = { role: "GURU", isFounder: false };
const founder = { role: "ADMIN", isFounder: true };
const umum = { role: "UMUM", isFounder: false };
const lho = findQrCode("BC-SMP7-LHO-KONFIRMASI")!;
check("tamu → login dengan next", resolveQrDestination(lho, null).href === "/login?next=%2Fb%2FBC-SMP7-LHO-KONFIRMASI");
check("murid → Jalur Cerdas", resolveQrDestination(lho, murid).href === "/arena/jalur-cerdas");
check("guru → Panduan Guru bab", resolveQrDestination(lho, guru).href === "/guru/panduan-guru/vii-lho");
check("founder dianggap guru", resolveQrDestination(lho, founder).href === "/guru/panduan-guru/vii-lho");
check("UMUM tanpa halaman publik → info", resolveQrDestination(lho, umum).href === "/b/BC-SMP7-LHO-KONFIRMASI/info");
const video = findQrCode("bc-smp9-artikel-video")!;
check("VIDEO publik → langsung untuk tamu", resolveQrDestination(video, null).href === "/video-belajar");
const game = findQrCode("BC-SMP8-DRAMA-GAME")!;
check("GAME: guru → layar, murid → join", resolveQrDestination(game, guru).href === "/main-bersama/layar" && resolveQrDestination(game, murid).href === "/main-bersama/join");
const baca = findQrCode("BC-SMP8-BERITA-BACA")!;
check("BACA murid → Segera hadir", resolveQrDestination(baca, murid).href === "/b/BC-SMP8-BERITA-BACA/info");
const eyd = findQrCode("BC-SMP9-CERPEN-EYD")!;
check("EYD guru → alat EYD, murid → info", resolveQrDestination(eyd, guru).href === "/guru/ai-tools/eyd" && resolveQrDestination(eyd, murid).kind === "info");
const sumatif = findQrCode("BC-SMP7-SUMATIF-GANJIL")!;
check("SUMATIF guru → evaluasi-simulasi", resolveQrDestination(sumatif, guru).href === "/guru/evaluasi-simulasi");
check("SUMATIF SMA alias urutan", findQrCode("BC-SMA10-SUMATIF-GENAP")?.kode === "BC-SMA10-GENAP-SUMATIF");
const smaBab = findQrCode("BC-SMA10-HIKAYAT-BAB")!;
check("SMA BAB guru → x-hikayat", resolveQrDestination(smaBab, guru).href === "/guru/panduan-guru/x-hikayat");
check("kode tak dikenal → null", findQrCode("BC-SMP7-TIDAKADA-VIDEO") === null && findQrCode("") === null);
check("kode Giat Literasi v4 → null", findQrCode("BC-SMP7-FIKSI-VIDEO") === null && findQrCode("BC-SMP9-NOVEL-VIDEO") === null);

console.log("\n== 7. Proxy ==");
const proxy = readFileSync(join(ROOT, "lib/supabase/proxy.ts"), "utf8");
check("/b/ di selfAuthPaths", /selfAuthPaths = \[[^\]]*"\/b\/"/.test(proxy));
check("sesi kedaluwarsa di /b/ → login dengan next", proxy.includes('pathname.startsWith("/b/") ? `/login?next=${encodeURIComponent(pathname)}`'));
check("not-found khusus /b ada", existsSync(join(ROOT, "app/b/[kode]/info/not-found.tsx")) && existsSync(join(ROOT, "app/b/[kode]/route.ts")));

console.log(failed ? `\n${failed} gagal` : "\nSemua lulus");
process.exit(failed ? 1 : 0);
