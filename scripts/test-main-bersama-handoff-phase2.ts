/**
 * Phase 2 — Handoff test: Bank Soal modern ↔ Main Bersama setup.
 *
 * Statik (source-level assertions) + kontrak normalizer.
 * Cakupan §13 (A–L). Exit 0 = lulus, 1 = gagal.
 * Tanpa kredensial; hanya membaca source di dalam repo.
 */
import fs from "fs";
import path from "path";

const ROOT = process.env.MB_INTEGRATION_ROOT ?? "/Users/user/bc-integration-main-bersama";
const bsPath = path.join(ROOT, "app/(dashboard)/guru/bank-soal/page.tsx");
const setupPagePath = path.join(ROOT, "app/(dashboard)/guru/game/main-bersama/page.tsx");
const clientPath = path.join(ROOT, "components/main-bersama/teacher/setup-client.tsx");
const refPath = path.join(ROOT, "src/main-bersama/adapters/bank-soal/package-ref.ts");

let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  ❌ ${name}`);
  }
}

const bs = fs.readFileSync(bsPath, "utf8");
const setupPage = fs.readFileSync(setupPagePath, "utf8");
const client = fs.readFileSync(clientPath, "utf8");
const ref = fs.readFileSync(refPath, "utf8");

console.log("\n── A. Normal Bank Soal tanpa `untuk` ──");
test("hero 'Perpustakaan Konten' tetap dirender tanpa syarat picker", bs.includes("Perpustakaan Konten"));
test("judul modal normal tetap 'Siapkan Latihan'", bs.includes('title={pickerMode ? "Gunakan Tema" : "Siapkan Latihan"}'));
test("banner picker TIDAK dirender saat mode normal (guarded)", /pickerMode && \(/.test(bs));

console.log("\n── B. Deteksi mode picker ──");
test("membaca useSearchParams", bs.includes("useSearchParams"));
test("deteksi `?untuk=main-bersama`", bs.includes('searchParams.get("untuk") === "main-bersama"'));

console.log("\n── C. Pemilihan tema valid ──");
test("aksi 'Gunakan untuk Main Bersama' ada", bs.includes("Gunakan untuk Main Bersama"));
test("handler mengirim tema = nama tema Bank Soal", /tema: selectedTheme\.name/.test(bs));
test("jumlah soal dibawa", /jumlah: String\(sendJumlah\)/.test(bs));

console.log("\n── D. Setup menerima tema terpilih ──");
test("setup page parse `untuk=main-bersama` + `tema`", setupPage.includes('first(sp.untuk) === "main-bersama"'));
test("setup lewat normalizePackageRef (validasi sama dgn create-session)", setupPage.includes("normalizePackageRef"));
test("setup-client menerima preselectedTheme", client.includes("preselectedTheme"));

console.log("\n── E. Picker: direct URL / refresh ──");
test("deteksi picker dari URL (bukan ephemeral state)", /searchParams\.get\("untuk"\)/.test(bs));

console.log("\n── F. Cancel / back ──");
test("tombol 'Kembali ke Main Bersama' tersedia di banner", bs.includes("Kembali ke Main Bersama"));
test("tombol Batal modal tetap ada", bs.includes(">Batal<") || bs.includes(">Batal</Button>") || /Batal\s*<\/Button>/.test(bs));

console.log("\n── G/H. Tema invalid / tidak accessible ──");
test("BANK_THEME dinormalisasi ketat (normalizer menolak topic kosong/panjang)", ref.includes("trimmedTopic.length === 0"));
test("count dibatasi MAX (invalid → null → tanpa preselection)", ref.includes("MAX_BANK_THEME_COUNT"));
test("gagal validasi = tanpa preselection, bukan crash (guard di setup page)", setupPage.includes('preselectedRef && preselectedRef.kind === "BANK_THEME"'));

console.log("\n── I. Perilaku normal ThemeCard tak berubah ──");
test("ThemeCard onOpen tetap handleOpenSend di semua shelf/grid", (bs.match(/onOpen={handleOpenSend}/g) ?? []).length >= 2);
test("FeaturedCollection onExplore tetap handleOpenByName", bs.includes("onExplore={handleOpenByName}"));
test("alur 'Kirim Latihan' utuh di mode normal", bs.includes('"Kirim Latihan"') || bs.includes("Kirim Latihan"));

console.log("\n── J. Pemilihan duplikat tidak merusak state ──");
test("seed MB baru per pembukaan modal (bukan menumpuk)", /if \(pickerMode\) setMbSeed\(Math\.random\(\)/.test(bs));

console.log("\n── K. contentTitle dipertahankan ──");
test("setup-client menyimpan topic sebagai contentTitle source", client.includes("themeSel.topic"));
test("BANK_THEME topic → contentTitle (create-session)", fs.readFileSync(path.join(ROOT, "src/main-bersama/application/use-cases/create-main-session.ts"), "utf8").includes("contentTitle"));

console.log("\n── L. Tidak ada dependensi modal/legacy lama ──");
test("TIDAK ada duplikasi halaman Bank Soal lama", !fs.existsSync(path.join(ROOT, "app/(dashboard)/guru/bank-soal/page-legacy.tsx")));
test("modal masih satu (sistem modal tidak digandakan)", (bs.match(/<Modal/g) ?? []).length === 2); // send + preview
test("query string TIDAK membawa isi soal (hanya identitas)", !/tema=[^&]*(jawaban|answer|correct)/i.test(bs));

console.log(`\n${"═".repeat(46)}`);
console.log(`TOTAL: ${passed} lulus, ${failed} gagal`);
if (failures.length) {
  console.log("Gagal:");
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
process.exit(0);
