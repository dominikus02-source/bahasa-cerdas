/**
 * test-game-question-quality.ts
 *
 * Menjaga kualitas + progresi level soal di game solo:
 *  1. Katastra (Lari Kata): opsi unik, kunci valid, bank minimal per tier,
 *     level diambil server-side (getUser), campuran tier progresif (getTierMix).
 *  2. Menara Cerdas: panen SEMUA unit Jalur Cerdas (tanpa take:50) + ramp
 *     kesulitan (stratified bands + sort by lvl).
 *  3. Tebak Kata: bank >= 250 kata unik, 3 petunjuk per kata, seleksi
 *     berdasarkan band panjang kata (wordBandForLevel).
 *  4. Susun Kata: bank >= 165 kata unik + makna, band panjang kata aktif.
 *
 * Statis (baca file, tanpa DB). Jalankan: npm run test:game-question-quality
 */
import * as fs from "fs";
import * as path from "path";

const ROOT = path.join(__dirname, "..");
let pass = 0;
let fail = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// ---------- 1. Katastra ----------
console.log("\n[1] Katastra questions route");
const katastra = read("app/api/katastra/questions/route.ts");

type Parsed = { text: string; options: string[]; correct: number; line: number };
function parseTier(src: string, tier: string): Parsed[] {
  const start = src.indexOf(`${tier}: [`);
  const next = tier === "SD" ? src.indexOf("SMP: [") : tier === "SMP" ? src.indexOf("SMA: [") : src.indexOf("};");
  const body = src.slice(start, next);
  const out: Parsed[] = [];
  const re = /text: "([^"]*)", options: \[([^\]]*)\], correct: (\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const options = [...m[2].matchAll(/"([^"]*)"/g)].map((x) => x[1]);
    out.push({ text: m[1], options, correct: parseInt(m[3]), line: 0 });
  }
  return out;
}

const tiers: Record<string, Parsed[]> = {
  SD: parseTier(katastra, "SD"),
  SMP: parseTier(katastra, "SMP"),
  SMA: parseTier(katastra, "SMA"),
};
const minPerTier: Record<string, number> = { SD: 90, SMP: 75, SMA: 80 };

for (const [tier, qs] of Object.entries(tiers)) {
  check(`${tier}: bank >= ${minPerTier[tier]} soal`, qs.length >= minPerTier[tier], `hanya ${qs.length}`);
  const dupOpts = qs.filter((q) => new Set(q.options).size !== q.options.length);
  check(`${tier}: tidak ada opsi kembar dalam satu soal`, dupOpts.length === 0, dupOpts.map((q) => q.text.slice(0, 40)).join("; "));
  const badKey = qs.filter((q) => q.correct < 0 || q.correct >= q.options.length);
  check(`${tier}: semua kunci jawaban dalam rentang opsi`, badKey.length === 0, badKey.map((q) => q.text.slice(0, 40)).join("; "));
  const shortOpts = qs.filter((q) => q.options.length < 4);
  check(`${tier}: semua soal punya 4 opsi`, shortOpts.length === 0, shortOpts.map((q) => q.text.slice(0, 40)).join("; "));
  const texts = qs.map((q) => q.text.trim().toLowerCase());
  check(`${tier}: tidak ada soal duplikat`, new Set(texts).size === texts.length);
}

check("Level diambil server-side (getUser + db.user)", katastra.includes("getUser") && katastra.includes("db.user.findUnique"));
check("Ada campuran tier progresif (getTierMix)", katastra.includes("getTierMix"));
check("Threshold lama getLevelForGrade sudah dihapus", !katastra.includes("getLevelForGrade"));

// ---------- 2. Menara + lib panen bersama ----------
console.log("\n[2] Menara Cerdas + lib/game/harvest");
const menara = read("app/api/game/menara/route.ts");
const harvest = read("lib/game/harvest.ts");
check("Menara memakai lib panen bersama", menara.includes("harvestJalurQuestions") && menara.includes("pickRampedQuestions"));
check("Panen semua unit (tidak ada take: 50)", !harvest.includes("take: 50") && !menara.includes("take: 50"));
check("Soal ditandai level unit (lvl)", harvest.includes("lvl: u.level?.level"));
check("Ramp kesulitan: sort naik berdasarkan lvl", harvest.includes(".sort((a, b) => a.lvl - b.lvl)"));
check("Stratified bands mudah/menengah/sulit", harvest.includes("q.lvl <= 4") && harvest.includes("q.lvl > 8"));
check("Quality gate isValidQuestion aktif", harvest.includes("function isValidQuestion"));

// ---------- 3. Tebak Kata ----------
console.log("\n[3] Tebak Kata");
const tebak = read("components/game/TebakKata.tsx");
const tebakWords = [...tebak.matchAll(/\{ word: "([A-Z ]+)", clues: \[([^\]]*)\]/g)].map((m) => ({
  word: m[1],
  clues: [...m[2].matchAll(/"([^"]*)"/g)].map((x) => x[1]),
}));
check("Bank >= 250 kata", tebakWords.length >= 250, `hanya ${tebakWords.length}`);
check("Tidak ada kata duplikat", new Set(tebakWords.map((w) => w.word)).size === tebakWords.length);
check("Setiap kata punya 3 petunjuk", tebakWords.every((w) => w.clues.length === 3 && w.clues.every((c) => c.length > 0)));
check("Band panjang kata per level (wordBandForLevel)", tebak.includes("function wordBandForLevel"));
check("nextWord memakai band level", tebak.includes("wordBandForLevel(getLevel(xp))"));
check("Tidak ada kata Inggris PENCIL", !tebak.includes('"PENCIL"'));

// ---------- 4. Susun Kata ----------
console.log("\n[4] Susun Kata");
const susun = read("components/game/SusunKata.tsx");
const susunWords = [...susun.matchAll(/\{ word: "([A-Z]+)", meaning: "([^"]*)"/g)].map((m) => ({ word: m[1], meaning: m[2] }));
check("Bank >= 165 kata", susunWords.length >= 165, `hanya ${susunWords.length}`);
check("Tidak ada kata duplikat", new Set(susunWords.map((w) => w.word)).size === susunWords.length);
check("Setiap kata punya makna", susunWords.every((w) => w.meaning.trim().length > 0));
check("Band panjang kata per level (wordBandForLevel)", susun.includes("function wordBandForLevel"));
check("nextWord memakai band level", susun.includes("wordBandForLevel(getLevel(xp))"));
check("Kata palsu DUBLING sudah diganti", !susun.includes('"DUBLING"'));

// ---------- 5. Tantang Teman ----------
console.log("\n[5] Tantang Teman (duel asinkron)");
const tantangCreate = read("app/api/game/tantang/route.ts");
const tantangDetail = read("app/api/game/tantang/[id]/route.ts");
const tantangSubmit = read("app/api/game/tantang/[id]/submit/route.ts");
check("Kunci jawaban disimpan server-side saat buat", tantangCreate.includes("correctAnswer: String(q.jawaban)"));
check("Lawan wajib teman sekelas", tantangCreate.includes("menantang teman sekelasmu"));
check("Anti-spam tantangan terbuka", tantangCreate.includes("MAX_TANTANGAN_TERBUKA"));
check("Notifikasi ke lawan saat ditantang", tantangCreate.includes('type: "TANTANGAN"'));
check("Detail: kunci HANYA setelah selesai (select kondisional)", tantangDetail.includes("select: iFinished"));
check("Detail: skor lawan disembunyikan sebelum keduanya selesai", tantangDetail.includes("done ? other!.score : null"));
check("Submit: dinilai server-side dari kunci DB", tantangSubmit.includes("parseInt(q.correctAnswer)"));
check("Submit: XP dibatasi (maks 50)", tantangSubmit.includes("Math.min(correct * 5, 50)"));
check("Submit: idempoten (tidak bisa main ulang)", tantangSubmit.includes("sudahSelesai: true"));
check("Submit: tanpa hadiah koin (anti farming antar teman)", !tantangSubmit.includes("coins"));

// ---------- 6. Irama Kata ----------
console.log("\n[6] Irama Kata (ritme bahasa)");
const irama = read("components/game/IramaKata.tsx");
function bank(name: string): string[] {
  const m = irama.match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`));
  return m ? [...m[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]) : [];
}
const bBaku = bank("BAKU"), bNon = bank("NONBAKU"), bBenda = bank("BENDA"), bKerja = bank("KERJA"), bSifat = bank("SIFAT");
check("Bank baku & nonbaku berpasangan (>= 25, sama panjang)", bBaku.length >= 25 && bBaku.length === bNon.length, `${bBaku.length}/${bNon.length}`);
check("Baku dan nonbaku tidak tumpang tindih", bBaku.every((w) => !bNon.includes(w)));
check("Bank benda/kerja/sifat cukup (>= 18 masing-masing)", bBenda.length >= 18 && bKerja.length >= 18 && bSifat.length >= 18, `${bBenda.length}/${bKerja.length}/${bSifat.length}`);
const kelasKata = [...bBenda, ...bKerja, ...bSifat];
check("Benda/kerja/sifat saling eksklusif", new Set(kelasKata).size === kelasKata.length);
const semua = [...bBaku, ...bNon, ...kelasKata];
check("Semua kata muat di jalur (<= 10 huruf)", semua.every((w) => w.length <= 10), semua.filter((w) => w.length > 10).join(", "));
check("XP dibatasi (maks 60)", irama.includes("Math.min(Math.floor(g.score / 40), 60)"));
check("Progresi level terkunci (unlocked)", irama.includes("unlocked.includes"));

// ---------- Ringkasan ----------
console.log(`\n${"=".repeat(50)}`);
console.log(`Hasil: ${pass} lulus, ${fail} gagal`);
if (fail > 0) process.exit(1);
process.exit(0);
