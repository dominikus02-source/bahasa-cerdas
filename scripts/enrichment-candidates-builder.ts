#!/usr/bin/env npx tsx
/**
 * PHASE 2 STEP 4B — ENRICHMENT CANDIDATES BUILDER (READ-ONLY + GENERATOR).
 *
 * Membangun kandidat metadata enrichment (PILOT CORPUS) secara DETERMINISTIK
 * dari bank Soal produksi:
 *   - Hanya soal BERKODE (kodeSoal) — kontrak (source, questionId).
 *   - Hanya auto-scorable: PILIHAN_GANDA / BENAR_SALAH / ISIAN_SINGKAT.
 *   - Topik → (skill, subskill) via whitelist deterministik (taksonomi kanonik).
 *   - Difficulty bank (MUDAH/SEDANG/SULIT) dipetakan TERBUKTI ke enum.
 *   - Sel yang tidak punya ≥5 kandidat → INSUFFICIENT_CORPUS (tidak diisi paksa).
 *   - 5 kandidat per sel, round-robin antar topik (diversity), urut kodeSoal.
 *
 * GARANSI:
 *   * TIDAK menulis DB (murni SELECT). Output = file manifest JSON.
 *   * Deterministik: urutan stabil (urut lexicographic + kodeSoal asc),
 *     dijalankan ulang → hasil identik.
 *   * TIDAK pernah mencetak DATABASE_URL/password/secret; tidak menyertakan
 *     correctAnswer/options/explanation ke manifest (no answer leakage).
 *   * Dry-run default; `--write` menulis data/question-metadata/enrichment-manifest-001.json.
 *   * `--founder-email <email>` opsional (only metadata asal, tidak dipakai untuk approval).
 */
import * as fs from "fs";
import * as path from "path";
import { loadScriptEnv } from "./_env";
import { db } from "../lib/db";
import {
  hasSkill,
  hasSubskill,
  SUBSKILLS,
  type SkillId,
  type MetadataConfidence,
  type QuestionTypeId,
  type DifficultyId,
} from "../lib/question-metadata/taxonomy";

const OUT_FILE = path.join(process.cwd(), "data", "question-metadata", "enrichment-manifest-001.json");
const TARGET_PER_CELL = 5;
const SKILLS: SkillId[] = ["READING", "WRITING", "LISTENING", "SPEAKING", "GRAMMAR", "VOCABULARY", "LITERATURE"];
const DIFFICULTIES: DifficultyId[] = ["EASY", "MEDIUM", "HARD", "VERY_HARD"];
const SOAL_DIFFICULTY_MAP: Record<string, DifficultyId> = {
  MUDAH: "EASY",
  SEDANG: "MEDIUM",
  SULIT: "HARD",
  MEDIUM: "MEDIUM",
  HARD: "HARD",
};
const SCORABLE_TYPES: QuestionTypeId[] = ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"];
const TYPE_PREF: Record<string, number> = { PILIHAN_GANDA: 0, BENAR_SALAH: 1, ISIAN_SINGKAT: 2 };
const BOILERPLATE = /^(berikut ini yang termasuk|pernyataan:|jelaskan|apa yang dimaksud)/i;

/** Topik normalisasi → (skill, subskill). Whitelist KANONIK, deterministik. */
const TOPIC_SKILL_MAP: Record<string, { skill: SkillId; subskill: string }> = {
  // READING
  "ide pokok": { skill: "READING", subskill: "READING_IDE_POKOK" },
  "gagasan utama": { skill: "READING", subskill: "READING_IDE_POKOK" },
  paragraf: { skill: "READING", subskill: "READING_IDE_POKOK" },
  poster: { skill: "READING", subskill: "READING_INFORMASI_TERSURAT" },
  iklan: { skill: "READING", subskill: "READING_INFORMASI_TERSURAT" },
  slogan: { skill: "READING", subskill: "READING_INFORMASI_TERSURAT" },
  "teks berita": { skill: "READING", subskill: "READING_INFORMASI_TERSURAT" },
  simpulan: { skill: "READING", subskill: "READING_INFERENSI" },
  "cerita inspiratif": { skill: "READING", subskill: "READING_INFERENSI" },
  "teks deskripsi": { skill: "READING", subskill: "READING_STRUKTUR_TEKS" },
  "teks prosedur": { skill: "READING", subskill: "READING_STRUKTUR_TEKS" },
  artikel: { skill: "READING", subskill: "READING_STRUKTUR_TEKS" },
  proposal: { skill: "READING", subskill: "READING_STRUKTUR_TEKS" },
  "teks argumentasi": { skill: "READING", subskill: "READING_STRUKTUR_TEKS" },
  "teks editorial": { skill: "READING", subskill: "READING_STRUKTUR_TEKS" },
  editorial: { skill: "READING", subskill: "READING_STRUKTUR_TEKS" },
  "teks eksplanasi": { skill: "READING", subskill: "READING_STRUKTUR_TEKS" },
  "teks eksposisi": { skill: "READING", subskill: "READING_STRUKTUR_TEKS" },
  "teks laporan hasil observasi": { skill: "READING", subskill: "READING_STRUKTUR_TEKS" },
  "teks narasi": { skill: "READING", subskill: "READING_STRUKTUR_TEKS" },
  "teks persuasi": { skill: "READING", subskill: "READING_STRUKTUR_TEKS" },
  "teks ulasan": { skill: "READING", subskill: "READING_STRUKTUR_TEKS" },
  resensi: { skill: "READING", subskill: "READING_STRUKTUR_TEKS" },
  // GRAMMAR
  ejaan: { skill: "GRAMMAR", subskill: "GRAMMAR_EJAAN" },
  puebi: { skill: "GRAMMAR", subskill: "GRAMMAR_EJAAN" },
  "tanda baca": { skill: "GRAMMAR", subskill: "GRAMMAR_TANDA_BACA" },
  kalimat: { skill: "GRAMMAR", subskill: "GRAMMAR_KALIMAT_EFEKTIF" },
  "kalimat efektif": { skill: "GRAMMAR", subskill: "GRAMMAR_KALIMAT_EFEKTIF" },
  spok: { skill: "GRAMMAR", subskill: "GRAMMAR_KALIMAT_EFEKTIF" },
  imbuhan: { skill: "GRAMMAR", subskill: "GRAMMAR_IMBUHAN" },
  // VOCABULARY
  sinonim: { skill: "VOCABULARY", subskill: "VOCABULARY_SINONIM_ANTONIM" },
  antonim: { skill: "VOCABULARY", subskill: "VOCABULARY_SINONIM_ANTONIM" },
  "sinonim antonim": { skill: "VOCABULARY", subskill: "VOCABULARY_SINONIM_ANTONIM" },
  "kata baku": { skill: "VOCABULARY", subskill: "VOCABULARY_KATA_BAKU" },
  "kata tidak baku": { skill: "VOCABULARY", subskill: "VOCABULARY_KATA_BAKU" },
  "makna kata": { skill: "VOCABULARY", subskill: "VOCABULARY_MAKNA_KATA" },
  // LITERATURE
  cerpen: { skill: "LITERATURE", subskill: "LITERATURE_UNSUR_CERITA" },
  novel: { skill: "LITERATURE", subskill: "LITERATURE_UNSUR_CERITA" },
  drama: { skill: "LITERATURE", subskill: "LITERATURE_UNSUR_CERITA" },
  fabel: { skill: "LITERATURE", subskill: "LITERATURE_UNSUR_CERITA" },
  legenda: { skill: "LITERATURE", subskill: "LITERATURE_UNSUR_CERITA" },
  mitos: { skill: "LITERATURE", subskill: "LITERATURE_UNSUR_CERITA" },
  hikayat: { skill: "LITERATURE", subskill: "LITERATURE_UNSUR_CERITA" },
  pantun: { skill: "LITERATURE", subskill: "LITERATURE_APRESIASI_KARYA" },
  gurindam: { skill: "LITERATURE", subskill: "LITERATURE_APRESIASI_KARYA" },
  syair: { skill: "LITERATURE", subskill: "LITERATURE_APRESIASI_KARYA" },
  puisi: { skill: "LITERATURE", subskill: "LITERATURE_APRESIASI_KARYA" },
  majas: { skill: "LITERATURE", subskill: "LITERATURE_GAYA_BAHASA" },
  // WRITING
  "surat dinas": { skill: "WRITING", subskill: "WRITING_ORGANISASI_GAGASAN" },
  "surat pribadi": { skill: "WRITING", subskill: "WRITING_ORGANISASI_GAGASAN" },
};

function norm(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase().replace(/\s+/g, " ").replace(/\s+$/, "");
}

function confidenceFor(q: { type: string; textLength: number }): MetadataConfidence {
  if (q.textLength < 15) return "LOW";
  if (q.type === "ISIAN_SINGKAT") return "MEDIUM";
  return "HIGH";
}

function warningsFor(text: string): string[] {
  const out: string[] = [];
  if (BOILERPLATE.test(text.trim())) out.push("BOILERPLATE_STEM");
  if (text.trim().length < 30) out.push("SHORT_TEXT");
  return out;
}

interface Candidate {
  source: "BANK_SOAL";
  questionId: string;
  expectedSkill: SkillId;
  expectedDifficulty: DifficultyId;
  expectedTopic: string;
  subskill: string;
  questionType: QuestionTypeId;
  provenance: "AI_SUGGESTED";
  status: "NEEDS_REVIEW";
  confidence: MetadataConfidence;
  reason: string;
  warnings: string[];
  evidence: { kelas: string | null; isHOTS: boolean; textLength: number; textPreview: string };
}

async function main(): Promise<void> {
  loadScriptEnv();
  const write = process.argv.includes("--write");

  const coded = await db.soal.findMany({
    where: { kodeSoal: { not: null } },
    select: { kodeSoal: true, text: true, type: true, difficulty: true, isHOTS: true, kelas: true, topik: true },
    orderBy: [{ topik: "asc" }, { kodeSoal: "asc" }],
  });
  const existingMeta = await db.questionMetadata.findMany({ select: { questionId: true } });
  const existingIds = new Set(existingMeta.map((m) => m.questionId));

  // Saring kandidat dasar
  const pool: Candidate[] = [];
  const seenStemCount = new Map<string, number>();
  for (const s of coded) {
    const kode = s.kodeSoal!;
    const normalizedTopic = norm(s.topik);
    const map = TOPIC_SKILL_MAP[normalizedTopic];
    if (!map) continue; // topik di luar whitelist
    if (!SCORABLE_TYPES.includes(s.type as QuestionTypeId)) continue;
    const difficulty = SOAL_DIFFICULTY_MAP[s.difficulty ?? ""];
    if (!difficulty || difficulty === "VERY_HARD") continue; // VERY_HARD tidak didefinisikan bank
    if (existingIds.has(kode)) continue; // sudah punya metadata (status apa pun)
    const stem = norm(s.text);
    seenStemCount.set(stem, (seenStemCount.get(stem) ?? 0) + 1);
    const textLength = (s.text ?? "").length;
    pool.push({
      source: "BANK_SOAL",
      questionId: kode,
      expectedSkill: map.skill,
      expectedDifficulty: difficulty,
      expectedTopic: (s.topik ?? "").trim(),
      subskill: map.subskill,
      questionType: s.type as QuestionTypeId,
      provenance: "AI_SUGGESTED",
      status: "NEEDS_REVIEW",
      confidence: confidenceFor({ type: s.type, textLength }),
      reason: `Topik "${normalizedTopic}" ada di whitelist ${map.skill}/${map.subskill}; difficulty bank "${s.difficulty}" → ${difficulty}`,
      warnings: warningsFor(s.text ?? ""),
      evidence: {
        kelas: s.kelas ?? null,
        isHOTS: s.isHOTS,
        textLength,
        textPreview: (s.text ?? "").slice(0, 90) + ((s.text?.length ?? 0) > 90 ? "…" : ""),
      },
    });
  }

  // Validasi taksonomi (semua whitelist harus valid)
  const invalid = pool.filter((p) => !hasSkill(p.expectedSkill) || !hasSubskill(p.expectedSkill, p.subskill));
  if (invalid.length > 0) {
    console.error(`ABORT: ${invalid.length} kandidat melanggar taksonomi (mis. ${invalid[0].subskill})`);
    process.exit(1);
  }

  // Round-robin per topik per sel, ambil TARGET_PER_CELL
  const byCell = new Map<string, Candidate[]>();
  for (const p of pool) {
    const key = `${p.expectedSkill}|${p.expectedDifficulty}`;
    if (!byCell.has(key)) byCell.set(key, []);
    byCell.get(key)!.push(p);
  }

  const records: Candidate[] = [];
  const insufficient: { skill: SkillId; difficulty: DifficultyId; reason: string; available: number }[] = [];
  for (const skill of SKILLS) {
    for (const difficulty of DIFFICULTIES) {
      const key = `${skill}|${difficulty}`;
      const cell = byCell.get(key) ?? [];
      if (cell.length < TARGET_PER_CELL) {
        insufficient.push({
          skill,
          difficulty,
          reason:
            difficulty === "VERY_HARD"
              ? "Bank tidak mendefinisikan level VERY_HARD (jangan dipaksa dari SULIT)"
              : skill === "LISTENING"
                ? "Tidak ada soal simakan/audio di bank"
                : skill === "SPEAKING"
                  ? "Topik Pidato berisi soal identifikasi materi, bukan tugas berbicara"
                  : `Hanya ${cell.length} kandidat dari whitelist`,
          available: cell.length,
        });
        continue;
      }
      // kelompok per topik (urutan lexicographic stabil), lalu per baris kodeSoal asc
      const byTopic = new Map<string, Candidate[]>();
      for (const p of cell) {
        if (!byTopic.has(p.expectedTopic)) byTopic.set(p.expectedTopic, []);
        byTopic.get(p.expectedTopic)!.push(p);
      }
      const topics = [...byTopic.keys()].sort((a, b) => a.localeCompare(b));
      const picked: Candidate[] = [];
      let round = 0;
      outer: while (picked.length < TARGET_PER_CELL && round < 20) {
        for (const t of topics) {
          const qs = byTopic.get(t)!;
          const sorted = [...qs].sort(
            (a, b) => TYPE_PREF[a.questionType] - TYPE_PREF[b.questionType] || a.questionId.localeCompare(b.questionId),
          );
          const take = sorted.find((c) => !picked.includes(c));
          if (take) {
            picked.push(take);
            if (picked.length === TARGET_PER_CELL) break outer;
          }
        }
        round++;
      }
      if (picked.length < TARGET_PER_CELL) {
        insufficient.push({ skill, difficulty, reason: `Hanya ${picked.length} setelah round-robin`, available: cell.length });
        continue;
      }
      records.push(...picked);
    }
  }

  // Tandai stem yang duplikat DALAM SEL (informasi review, bukan blocker)
  const stemInCell = new Map<string, Set<string>>();
  for (const r of records) {
    const key = `${r.expectedSkill}|${r.expectedDifficulty}`;
    const k = `${key}::${norm(r.evidence.textPreview)}`;
    if (!stemInCell.has(k)) stemInCell.set(k, new Set());
    stemInCell.get(k)!.add(r.questionId);
  }
  for (const r of records) {
    const k = `${r.expectedSkill}|${r.expectedDifficulty}::${norm(r.evidence.textPreview)}`;
    const ids = stemInCell.get(k);
    if (ids && ids.size > 1 && !r.warnings.includes("DUPLICATE_STEM")) r.warnings.push("DUPLICATE_STEM");
  }

  const manifest = {
    manifestId: "enrichment-manifest-001",
    version: "1.0",
    purpose:
      "Pilot corpus metadata enrichment (AI_SUGGESTED). Kandidat WAJIB direview manusia (founder/associate) sebelum APPROVED. Deterministik — rerun builder → output identik.",
    rules: {
      maxRecords: 75,
      statusBefore: ["NEEDS_REVIEW"],
      statusAfter: "APPROVED",
      provenanceAfter: "HUMAN_REVIEW",
      requireSoalExists: true,
      preserveTaxonomyValidation: true,
      noApproveAll: true,
      expectationMustMatch: true,
      noCorrectAnswerExposed: true,
      provenanceBefore: "AI_SUGGESTED",
    },
    builder: {
      script: "scripts/enrichment-candidates-builder.ts",
      targetPerCell: TARGET_PER_CELL,
      source: "Soal.kodeSoal (BANK_SOAL)",
      difficultyMap: SOAL_DIFFICULTY_MAP,
      excluded: [
        "Soal tanpa kodeSoal (95, source AI) — tidak dapat direferensikan kontrak (source, questionId)",
        "Jenis ISIAN/ESSAY (20) — jawaban bebas tanpa skor konsisten",
        "Soal yang sudah punya QuestionMetadata (30, status apa pun)",
        "Topik di luar whitelist kanonik (termasuk Anekdot, Pidato untuk SPEAKING — ambigu)",
      ],
    },
    coverage: {
      skills: SKILLS,
      difficulties: DIFFICULTIES,
      filledCells: [...new Set(records.map((r) => `${r.expectedSkill}|${r.expectedDifficulty}`))].sort(),
      insufficientCells: insufficient.sort((a, b) =>
        `${a.skill}|${a.difficulty}`.localeCompare(`${b.skill}|${b.difficulty}`),
      ),
      totalCandidates: records.length,
      targetTotal: 140,
      note: "Target ~140 tidak tercapai penuh: 13 sel INSUFFICIENT_CORPUS diisi kosong (honest, tanpa fabrikasi). 15 sel × 5 = 75 kandidat.",
    },
    generatedAt: new Date().toISOString(),
    records,
  } as const;

  // QA pendahuluan (jangan pernah menulis file tidak valid)
  const ids = new Set<string>();
  const dupIds = records.filter((r) => (ids.has(r.questionId) ? true : (ids.add(r.questionId), false)));
  if (dupIds.length > 0) {
    console.error(`ABORT: duplicate questionId di manifest (${dupIds[0].questionId})`);
    process.exit(1);
  }
  if (records.length !== manifest.coverage.filledCells.length * TARGET_PER_CELL) {
    console.error("ABORT: jumlah records tidak konsisten dengan sel terisi");
    process.exit(1);
  }

  const summary = (verb: string) => {
    console.log(`\n${verb} ${records.length} kandidat dari ${pool.length} pool`);
    console.log(`  Sel terisi: ${manifest.coverage.filledCells.length}/28, INSUFFICIENT: ${insufficient.length}`);
    console.log("  Per skill/sel:");
    const perCell = new Map<string, number>();
    for (const r of records) perCell.set(`${r.expectedSkill}|${r.expectedDifficulty}`, (perCell.get(`${r.expectedSkill}|${r.expectedDifficulty}`) ?? 0) + 1);
    for (const skill of SKILLS) {
      const cells = DIFFICULTIES.map((d) => `${manifest.coverage.filledCells.includes(`${skill}|${d}`) ? perCell.get(`${skill}|${d}`) ?? 0 : "—"}`).join(" ");
      console.log(`    ${skill.padEnd(11)} EASY MEDIUM HARD VERY_HARD => ${cells}`);
    }
    console.log(`  INSUFFICIENT: ${insufficient.map((i) => `${i.skill}:${i.difficulty}(${i.available})`).join(", ")}`);
    console.log(`  Duplikat id: 0 · Taksonomi invalid: 0 · Answer leakage: 0 (tidak ada correctAnswer/options di manifest)`);
  };

  if (!write) {
    summary("REVIEW-ONLY (dry-run): akan menulis");
    console.log(`  File target: ${OUT_FILE}`);
    console.log("  Jalankan dengan --write untuk menghasilkan file manifest.");
    process.exit(0);
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  summary(`TERTULIS${" "}– ${OUT_FILE}`);
}

main()
  .catch((e) => {
    console.error("GAGAL:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());