import { readFileSync } from "fs";
import { join } from "path";

interface Article {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string[];
  authorEmail: string;
  authorName: string;
  authorRole: string;
  articleType: string;
  status: string;
  publishedAt: string;
  source: string;
  featured: boolean;
  coverImageUrl?: string;
  coverImageCredit?: string;
  coverImageLicense?: string;
}

interface ArticleResult {
  title: string;
  slug: string;
  authorName: string;
  score: number;
  label: string;
  problems: string[];
  wordCount: number;
  dupParagraphs: number;
  aiPhrases: { phrase: string; count: number }[];
  wordRepetition: { word: string; count: number }[];
  promoCount: number;
  hasExamples: boolean;
  voiceIssues: string[];
  hasUkbiTkaDisclaimer: boolean;
  hasCoverImage: boolean;
  hasImageCredit: boolean;
  isCtaTemplate: boolean;
}

// ========== HELPERS ==========

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter(Boolean);
}

function wordSet(text: string): Set<string> {
  return new Set(tokenize(text));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const w of a) {
    if (b.has(w)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function normalizePara(p: string): string {
  return p
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function countOccurrences(text: string, phrases: string[]): { phrase: string; count: number }[] {
  const lower = text.toLowerCase();
  return phrases
    .map((p) => {
      const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matches = lower.match(new RegExp(escaped, "gi"));
      return { phrase: p, count: matches ? matches.length : 0 };
    })
    .filter((x) => x.count > 0);
}

function countWordFreq(text: string, words: string[]): { word: string; count: number }[] {
  const tokens = tokenize(text);
  return words
    .map((w) => ({
      word: w,
      count: tokens.filter((t) => t === w).length,
    }))
    .filter((x) => x.count > 0);
}

function countSentencesContaining(text: string, phrases: string[]): number {
  const lower = text.toLowerCase();
  const sentences = lower.split(/[.!?]+/).filter(Boolean);
  let count = 0;
  for (const s of sentences) {
    for (const p of phrases) {
      if (s.includes(p)) {
        count++;
        break;
      }
    }
  }
  return count;
}

function hasConcreteExamples(text: string): boolean {
  const patterns = /\b(misalnya|contoh|seperti|salah satu|pada suatu)\b/i;
  return patterns.test(text);
}

function checkVoiceMatch(authorName: string, text: string): string[] {
  const issues: string[] = [];
  const lower = text.toLowerCase();

  if (authorName === "Washadi") {
    const literaryWords = ["puisi", "cerpen", "sastra", "cerita", "novel", "komunitas", "mgmp", "berbagi", "kolaborasi", "tumbuh"];
    const found = literaryWords.filter((w) => lower.includes(w));
    if (found.length < 2) {
      issues.push("Washadi: kurang kata sastra/komunitas");
    }
  }

  if (authorName === "Alexander Suryanta" || authorName === "Alexander") {
    const pedagogyWords = ["kelas", "siswa", "pembelajaran", "mengajar", "asesmen", "modul", "rpp", "tujuan pembelajaran", "kurikulum", "materi"];
    const found = pedagogyWords.filter((w) => lower.includes(w));
    if (found.length < 2) {
      issues.push("Alexander: kurang kata pedagogi/kelas");
    }
  }

  if (authorName === "Dominikus Wahyu" || authorName === "Dominikus") {
    const productWords = ["platform", "digital", "fitur", "ekosistem", "teknologi", "bahasacerdas", "aplikasi", "simulasi", "personal", "masa depan"];
    const found = productWords.filter((w) => lower.includes(w));
    if (found.length < 2) {
      issues.push("Dominikus: kurang kata produk/visi");
    }
  }

  return issues;
}

function checkUkbiTkaDisclaimer(article: Article): boolean {
  const isUkbiTka = /\b(ukbi|tka)\b/i.test(article.slug);
  if (!isUkbiTka) return true;
  const content = article.content.toLowerCase();
  return content.includes("bukan sertifikat resmi") || content.includes("bukan sertifikat resmi ukbi") || content.includes("bukan sertifikat resmi tka");
}

function hasTemplateEnding(article: Article, allEndings: Map<string, string[]>): boolean {
  const content = article.content.trim();
  const last200 = content.slice(-200).toLowerCase();
  const templatePhrases = [
    "unduh bahasacerdas",
    "mari bergabung",
    "mari kita bangun",
    "bergabunglah",
    "download sekarang",
  ];
  for (const t of templatePhrases) {
    if (last200.includes(t)) return true;
  }
  return false;
}

function getEnding(text: string): string {
  const trimmed = text.trim();
  return trimmed.slice(-150).toLowerCase().replace(/\s+/g, " ").trim();
}

function computeLabel(score: number): string {
  if (score <= 40) return "perlu tulis ulang total";
  if (score <= 70) return "perlu revisi besar";
  if (score <= 85) return "perlu polish";
  return "siap terbit";
}

// ========== LOAD DATA ==========

const DATA_PATH = join(__dirname, "..", "data", "articles", "founder-archive-2026-05-06.json");

let articles: Article[];
try {
  const raw = readFileSync(DATA_PATH, "utf-8");
  articles = JSON.parse(raw) as Article[];
} catch (err) {
  console.error("GAGAL: Tidak bisa membaca data artikel —", (err as Error).message);
  process.exit(1);
}

if (!Array.isArray(articles) || articles.length === 0) {
  console.error("GAGAL: Data artikel kosong atau bukan array");
  process.exit(1);
}

if (articles.length !== 30) {
  console.error(`GAGAL: Diharapkan 30 artikel, ditemukan ${articles.length}`);
  process.exit(1);
}

// ========== DETECT SIMILAR PARAGRAPHS (all articles, grouped by author) ==========

interface SimilarPara {
  articleId: number;
  paragraph: string;
}

interface ParaPair {
  a1: number;
  a2: number;
  similarity: number;
}

// Author -> list of articles by that author
const byAuthor: Map<string, number[]> = new Map();
articles.forEach((a, i) => {
  const name = a.authorName;
  if (!byAuthor.has(name)) byAuthor.set(name, []);
  byAuthor.get(name)!.push(i);
});

function findSimilarParasAcrossArticles(): ParaPair[] {
  const pairs: ParaPair[] = [];
  for (const [, indices] of byAuthor) {
    const paraSets: Map<number, string[]> = new Map();
    for (const idx of indices) {
      const content = articles[idx]?.content || "";
      const paras = splitParagraphs(content).map(normalizePara).filter((p) => p.length > 20);
      paraSets.set(idx, paras);
    }
    const idxList = indices;
    for (let i = 0; i < idxList.length; i++) {
      for (let j = i + 1; j < idxList.length; j++) {
        const p1 = paraSets.get(idxList[i]) || [];
        const p2 = paraSets.get(idxList[j]) || [];
        // Greedy one-to-one matching: each paragraph from A can match at most one from B
        const matchedB = new Set<number>();
        for (let pi = 0; pi < p1.length; pi++) {
          let bestSim = 0;
          let bestPj = -1;
          const setA = wordSet(p1[pi]);
          for (let pj = 0; pj < p2.length; pj++) {
            if (matchedB.has(pj)) continue;
            const setB = wordSet(p2[pj]);
            const sim = jaccardSimilarity(setA, setB);
            if (sim > bestSim) {
              bestSim = sim;
              bestPj = pj;
            }
          }
          if (bestSim > 0.7 && bestPj >= 0) {
            matchedB.add(bestPj);
            pairs.push({ a1: idxList[i], a2: idxList[j], similarity: bestSim });
          }
        }
      }
    }
  }
  return pairs;
}

function findOverlySimilarOpenings(): { a1: number; a2: number }[] {
  const pairs: { a1: number; a2: number }[] = [];
  for (const [, indices] of byAuthor) {
    const openings: Map<number, string> = new Map();
    for (const idx of indices) {
      const content = articles[idx]?.content || "";
      openings.set(idx, content.slice(0, 100).toLowerCase().replace(/\s+/g, " ").trim());
    }
    const idxList = indices;
    for (let i = 0; i < idxList.length; i++) {
      for (let j = i + 1; j < idxList.length; j++) {
        const o1 = openings.get(idxList[i]) || "";
        const o2 = openings.get(idxList[j]) || "";
        if (o1 && o2 && o1 === o2) {
          pairs.push({ a1: idxList[i], a2: idxList[j] });
        }
      }
    }
  }
  return pairs;
}

function findOverlySimilarClosings(): { a1: number; a2: number }[] {
  const pairs: { a1: number; a2: number }[] = [];
  for (const [, indices] of byAuthor) {
    const closings: Map<number, string> = new Map();
    for (const idx of indices) {
      const content = articles[idx]?.content || "";
      closings.set(idx, content.slice(-150).toLowerCase().replace(/\s+/g, " ").trim());
    }
    const idxList = indices;
    for (let i = 0; i < idxList.length; i++) {
      for (let j = i + 1; j < idxList.length; j++) {
        const c1 = closings.get(idxList[i]) || "";
        const c2 = closings.get(idxList[j]) || "";
        if (c1 && c2 && c1 === c2) {
          pairs.push({ a1: idxList[i], a2: idxList[j] });
        }
      }
    }
  }
  return pairs;
}

// ========== SCORING ==========

const GENERIC_AI_PHRASES = [
  "di era digital ini",
  "sangat penting untuk",
  "tidak dapat dipungkiri",
  "menjadi solusi inovatif",
  "mari bersama-sama",
  "platform yang revolusioner",
  "dengan demikian",
  "pada akhirnya",
  "memberikan dampak positif",
  "perlu kita sadari",
  "tidak bisa dipungkiri",
  "seiring dengan perkembangan",
  "dalam era globalisasi",
];

const KEY_WORDS = ["guru", "literasi", "pembelajaran", "bahasacerdas", "platform", "digital", "teknologi"];

const PROMO_PHRASES = ["solusi terbaik", "platform terdepan", "jawaban atas", "satu-satunya", "paling lengkap", "paling inovatif"];

// Phase 1: detect problems
const results: ArticleResult[] = [];
const allEndings: Map<string, string[]> = new Map();

articles.forEach((a, idx) => {
  const content = a.content || "";
  const problems: string[] = [];
  let score = 100;

  // a. Duplicate paragraphs within article
  const paras = splitParagraphs(content).map(normalizePara).filter((p) => p.length > 20);
  const seen = new Map<string, number>();
  let dupCount = 0;
  for (const p of paras) {
    const count = (seen.get(p) || 0) + 1;
    seen.set(p, count);
    if (count === 2) dupCount++;
  }
  if (dupCount > 0) {
    problems.push(`paragraf duplikat (${dupCount})`);
    score -= Math.min(dupCount * 15, 30);
  }

  // b. Similar paragraphs across articles by same author — handled globally

  // d. Similar closings — handled globally
  // ending used for CTA check
  const ending = getEnding(content);
  if (!allEndings.has(a.authorName)) allEndings.set(a.authorName, []);
  allEndings.get(a.authorName)!.push(ending);

  // e. Generic AI phrases
  const aiPhrases = countOccurrences(content, GENERIC_AI_PHRASES);
  const totalAi = aiPhrases.reduce((s, x) => s + x.count, 0);
  if (totalAi > 0) {
    problems.push(`frasa AI (${totalAi})`);
    score -= Math.min(totalAi * 5, 25);
  }

  // f. Word repetition density
  const wordFreqs = countWordFreq(content, KEY_WORDS);
  const repeatedWords = wordFreqs.filter((wf) => wf.count > 15);
  const anyRepetition = repeatedWords.length > 0;
  if (anyRepetition) {
    for (const rw of repeatedWords) {
      problems.push(`repetisi "${rw.word}" (${rw.count}x)`);
    }
    score -= 10;
  }

  // g. Promotional tone
  const promoCount = countSentencesContaining(content, PROMO_PHRASES);
  if (promoCount > 0) {
    problems.push(`promosi (${promoCount})`);
    score -= Math.min(promoCount * 5, 15);
  }

  // h. Concrete examples
  const hasExamples = hasConcreteExamples(content);
  if (!hasExamples) {
    problems.push("tanpa contoh konkret");
    score -= 5;
  }

  // i. Founder voice match
  const voiceIssues = checkVoiceMatch(a.authorName, content);
  if (voiceIssues.length > 0) {
    problems.push(...voiceIssues);
    score -= 5;
  }

  // j. UKBI/TKA disclaimer
  const hasDisclaimer = checkUkbiTkaDisclaimer(a);
  const isUkbiTkaSlug = /\b(ukbi|tka)\b/i.test(a.slug);
  if (isUkbiTkaSlug && !hasDisclaimer) {
    problems.push("tanpa disclaimer UKBI/TKA");
    score -= 10;
  }

  // k. Cover image
  const hasCover = !!a.coverImageUrl;
  if (!hasCover) {
    problems.push("tanpa cover image");
    score -= 5;
  }

  // l. Image credit/license
  const hasCredit = !!a.coverImageCredit && !!a.coverImageLicense;
  if (hasCover && !hasCredit) {
    problems.push("tanpa kredit/lisensi gambar");
    score -= 3;
  }

  // m. Word count
  const wordCount = tokenize(content).length;

  // n. CTA variation (check globally later)
  // placeholder
  const result: ArticleResult = {
    title: a.title,
    slug: a.slug,
    authorName: a.authorName,
    score: Math.max(0, score),
    label: computeLabel(Math.max(0, score)),
    problems,
    wordCount,
    dupParagraphs: dupCount,
    aiPhrases,
    wordRepetition: wordFreqs,
    promoCount,
    hasExamples,
    voiceIssues,
    hasUkbiTkaDisclaimer: hasDisclaimer,
    hasCoverImage: hasCover,
    hasImageCredit: hasCredit,
    isCtaTemplate: false,
  };

  results.push(result);
});

// c. Overly similar openings
const similarOpenings = findOverlySimilarOpenings();
for (const p of similarOpenings) {
  results[p.a1].problems.push("pembukaan identik dengan artikel lain");
  results[p.a2].problems.push("pembukaan identik dengan artikel lain");
  results[p.a1].score = Math.max(0, results[p.a1].score - 5);
  results[p.a2].score = Math.max(0, results[p.a2].score - 5);
  results[p.a1].label = computeLabel(results[p.a1].score);
  results[p.a2].label = computeLabel(results[p.a2].score);
}

// b. Similar paragraphs across articles
const similarParas = findSimilarParasAcrossArticles();
const articlesWithSimParas = new Set<number>();
for (const p of similarParas) {
  articlesWithSimParas.add(p.a1);
  articlesWithSimParas.add(p.a2);
}
for (const idx of articlesWithSimParas) {
  const count = similarParas.filter((p) => p.a1 === idx || p.a2 === idx).length;
  results[idx].problems.push(`paragraf mirip lintas artikel (${count} pasang)`);
  results[idx].score = Math.max(0, results[idx].score - Math.min(count * 10, 50));
  results[idx].label = computeLabel(results[idx].score);
}

// n. CTA variation — detect if ending is same template as any other by same author
for (const [, indices] of byAuthor) {
  const endings = indices.map((idx) => getEnding(articles[idx]?.content || ""));
  for (let i = 0; i < indices.length; i++) {
    for (let j = i + 1; j < indices.length; j++) {
      if (endings[i].length > 20 && endings[i] === endings[j]) {
        if (!results[indices[i]].problems.includes("CTA template (akhir identik)")) {
          results[indices[i]].problems.push("CTA template (akhir identik)");
          results[indices[i]].score = Math.max(0, results[indices[i]].score - 3);
          results[indices[i]].label = computeLabel(results[indices[i]].score);
          results[indices[i]].isCtaTemplate = true;
        }
        if (!results[indices[j]].problems.includes("CTA template (akhir identik)")) {
          results[indices[j]].problems.push("CTA template (akhir identik)");
          results[indices[j]].score = Math.max(0, results[indices[j]].score - 3);
          results[indices[j]].label = computeLabel(results[indices[j]].score);
          results[indices[j]].isCtaTemplate = true;
        }
      }
    }
  }
}

// Check generic template endings
for (let i = 0; i < results.length; i++) {
  if (!results[i].isCtaTemplate && hasTemplateEnding(articles[i], allEndings)) {
    results[i].problems.push("CTA template (frasa umum)");
    results[i].score = Math.max(0, results[i].score - 3);
    results[i].label = computeLabel(results[i].score);
    results[i].isCtaTemplate = true;
  }
}

// ========== COMPUTE STATS ==========

const avgScore = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
const siapTerbit = results.filter((r) => r.score >= 86).length;
const perluPolish = results.filter((r) => r.score >= 71 && r.score <= 85).length;
const perluRevisi = results.filter((r) => r.score >= 41 && r.score <= 70).length;
const perluTulisUlang = results.filter((r) => r.score <= 40).length;

// Per founder
const founderScores = new Map<string, number[]>();
for (let i = 0; i < results.length; i++) {
  const name = articles[i].authorName;
  if (!founderScores.has(name)) founderScores.set(name, []);
  founderScores.get(name)!.push(i);
}

// AI phrases ranking
const aiPhraseCount = new Map<string, number>();
for (const r of results) {
  for (const ap of r.aiPhrases) {
    aiPhraseCount.set(ap.phrase, (aiPhraseCount.get(ap.phrase) || 0) + ap.count);
  }
}

// Duplicate paragraphs ranking
const dupRanking = results
  .filter((r) => r.dupParagraphs > 0)
  .sort((a, b) => b.dupParagraphs - a.dupParagraphs);

// Articles without cover
const noCover = results.filter((r) => !r.hasCoverImage);

// ========== OUTPUT ==========

console.log("=== AUDIT KUALITAS ARTIKEL FOUNDER ===\n");

console.log("RINGKASAN:");
console.log(`Total artikel: ${articles.length}`);
console.log(`Skor rata-rata: ${avgScore}`);
console.log(`Artikel siap terbit (≥86): ${siapTerbit}`);
console.log(`Artikel perlu polish (71-85): ${perluPolish}`);
console.log(`Artikel perlu revisi besar (41-70): ${perluRevisi}`);
console.log(`Artikel perlu tulis ulang (0-40): ${perluTulisUlang}`);
console.log("");

console.log("HASIL PER ARTIKEL:");
results.forEach((r, i) => {
  const nums = i + 1;
  const problemStr = r.problems.length > 0 ? r.problems.join("; ") : "tidak ada masalah";
  console.log(`[${nums}] ${r.title} — Skor: ${r.score} — [${r.label}]`);
  console.log(`    Masalah: ${problemStr}`);
});
console.log("");

// Per founder
for (const [name, indices] of founderScores) {
  const sc = indices.map((i) => results[i].score);
  const avg = Math.round(sc.reduce((a, b) => a + b, 0) / sc.length);
  const strongest = indices.reduce((best, i) => (results[i].score > results[best].score ? i : best), indices[0]);
  const weakest = indices.reduce((worst, i) => (results[i].score < results[worst].score ? i : worst), indices[0]);
  console.log(`FOUNDER ${name.toUpperCase()}:`);
  console.log(`  Rata-rata skor: ${avg}`);
  console.log(`  Terkuat: ${articles[strongest].title} (${results[strongest].score})`);
  console.log(`  Terlemah: ${articles[weakest].title} (${results[weakest].score})`);
  console.log("");
}

console.log("FRASA AI GENERIK TERBANYAK:");
if (aiPhraseCount.size === 0) {
  console.log("  (tidak ada)");
} else {
  const sorted = [...aiPhraseCount.entries()].sort((a, b) => b[1] - a[1]);
  for (const [phrase, count] of sorted.slice(0, 10)) {
    console.log(`  "${phrase}" — ${count} artikel`);
  }
}
console.log("");

console.log("DUPLIKAT PARAGRAF TERBANYAK:");
if (dupRanking.length === 0) {
  console.log("  (tidak ada)");
} else {
  for (const r of dupRanking.slice(0, 5)) {
    console.log(`  ${r.title} — ${r.dupParagraphs} paragraf duplikat`);
  }
}
console.log("");

console.log("ARTIKEL TANPA COVER IMAGE:");
if (noCover.length === 0) {
  console.log("  (semua punya cover)");
} else {
  const titles = noCover.map((r) => r.title).join(", ");
  console.log(`  ${titles}`);
}
console.log("");

console.log("REKOMENDASI:");
const perluTulis = results.filter((r) => r.score <= 40);
const perluRev = results.filter((r) => r.score >= 41 && r.score <= 70);
const noCoverRec = results.filter((r) => !r.hasCoverImage);

if (perluTulis.length > 0) {
  console.log(`  1. Tulis ulang total: ${perluTulis.map((r) => r.title).join(", ")}`);
}
if (perluRev.length > 0) {
  console.log(`  2. Revisi besar: ${perluRev.map((r) => r.title).join(", ")}`);
}
if (noCoverRec.length > 0) {
  console.log(`  3. Tambah cover image: ${noCoverRec.map((r) => r.title).join(", ")}`);
}
console.log("");

process.exit(0);
