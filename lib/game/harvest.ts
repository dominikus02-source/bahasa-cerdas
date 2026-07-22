/**
 * Panen soal MCQ untuk game solo/duel: gabungan bank kurasi
 * (lib/game/question-bank) + soal asli pelajaran Jalur Cerdas
 * (LearningUnit.content.questions), dinormalisasi + quality-gate + dedupe.
 * Setiap soal ditandai `lvl` (level unit Jalur, 1-12; bank kurasi = 6)
 * supaya pemanggil bisa menyusun ramp kesulitan.
 *
 * Dipakai oleh: /api/game/menara (Menara Cerdas + Benar-Salah) dan
 * /api/game/tantang (Tantang Teman).
 */
import { db } from "@/lib/db";
import { QUESTION_BANK } from "@/lib/game/question-bank";

export type HarvestQuestion = {
  id: string;
  soal: string;
  opsi: string[];
  jawaban: number;
  penjelasan: string;
  lvl: number;
};

// Quality gate: reject anything ambiguous or malformed. A question is valid only
// if it has >=3 distinct options, exactly one answer in range. This automatically
// filters out bad lesson questions (duplicate options, out-of-range answers).
export function isValidQuestion(q: HarvestQuestion): boolean {
  if (!q.soal || !Array.isArray(q.opsi) || q.opsi.length < 3) return false;
  if (q.jawaban < 0 || q.jawaban >= q.opsi.length) return false;
  const norm = q.opsi.map((o) => o.trim().toLowerCase());
  if (norm.some((o) => !o)) return false;
  if (new Set(norm).size !== norm.length) return false; // duplicate options = ambiguous
  return true;
}

type LessonQuestion = {
  id?: string;
  tipe?: string;
  soal?: string;
  opsi?: string[];
  jawaban?: string | number;
  penjelasan?: string;
};

// Normalize a lesson question to a client-friendly MCQ with an answer index.
function normalize(q: LessonQuestion): Omit<HarvestQuestion, "lvl"> | null {
  if (!q?.soal || !Array.isArray(q.opsi) || q.opsi.length < 2) return null;
  if (q.tipe && q.tipe !== "pilihan_ganda" && q.tipe !== "benar_salah") return null;

  let idx: number;
  if (typeof q.jawaban === "number") {
    idx = q.jawaban;
  } else if (typeof q.jawaban === "string") {
    idx = q.opsi.findIndex((o) => o.trim().toLowerCase() === q.jawaban!.toString().trim().toLowerCase());
  } else {
    return null;
  }
  if (idx < 0 || idx >= q.opsi.length) return null;

  return {
    id: q.id || Math.random().toString(36).slice(2),
    soal: q.soal,
    opsi: q.opsi,
    jawaban: idx,
    penjelasan: q.penjelasan || "",
  };
}

export function shuffleQuestions<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Panen seluruh bank (kurasi + semua unit JALUR aktif), sudah bersih + dedupe. */
export async function harvestJalurQuestions(): Promise<HarvestQuestion[]> {
  const units = await db.learningUnit.findMany({
    where: { isActive: true, level: { type: "JALUR" } },
    select: { content: true, level: { select: { level: true } } },
  });

  const pool: HarvestQuestion[] = [];

  // 1) Curated, hand-verified bank (guaranteed quality) — mid difficulty.
  for (const b of QUESTION_BANK) {
    pool.push({ id: `bank_${pool.length}`, soal: b.soal, opsi: b.opsi, jawaban: b.jawaban, penjelasan: b.penjelasan, lvl: 6 });
  }

  // 2) Real lesson questions from Jalur Cerdas, tagged with their unit level.
  for (const u of units) {
    if (!u.content) continue;
    try {
      const parsed = JSON.parse(u.content);
      if (Array.isArray(parsed?.questions)) {
        for (const q of parsed.questions) {
          const n = normalize(q);
          if (n) pool.push({ ...n, lvl: u.level?.level ?? 6 });
        }
      }
    } catch {
      /* skip malformed unit */
    }
  }

  // Dedupe by question text + drop ambiguous/malformed items.
  const seen = new Set<string>();
  return pool.filter((q) => {
    if (!isValidQuestion(q)) return false;
    const key = q.soal.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Ambil `count` soal dengan ramp kesulitan: sepertiga mudah (L1-4), sepertiga
 * menengah (L5-8), sepertiga sulit (L9-12), diurutkan naik. Subset acak per panggilan.
 */
export function pickRampedQuestions(clean: HarvestQuestion[], count: number): HarvestQuestion[] {
  const bands = [
    clean.filter((q) => q.lvl <= 4),
    clean.filter((q) => q.lvl > 4 && q.lvl <= 8),
    clean.filter((q) => q.lvl > 8),
  ];
  const per = Math.floor(count / 3);
  const targets = [per, per, count - 2 * per];
  const picked: HarvestQuestion[] = [];
  bands.forEach((band, i) => picked.push(...shuffleQuestions(band).slice(0, targets[i])));
  if (picked.length < count) {
    const have = new Set(picked.map((q) => q.soal));
    picked.push(...shuffleQuestions(clean).filter((q) => !have.has(q.soal)).slice(0, count - picked.length));
  }
  return picked.sort((a, b) => a.lvl - b.lvl).slice(0, count);
}
