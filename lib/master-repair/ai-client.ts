import { MasterQuestion } from "../master-recovery";
import { getApiKeys } from "../../src/ai/core/provider";
import { RepairType } from "./types";

// ─── AI Repair client (dorman bila key tidak tersedia — NO HALLUCINATION) ──

const PROVIDER_KEY_ENV: Record<string, string> = {
  deepseek: "DEEPSEEK_API_KEY",
  groq: "GROQ_API_KEY",
  gemini: "GEMINI_API_KEY",
};

const PLACEHOLDER_PATTERNS = [/^\[SENSITIVE\]$/, /^placeholder$/i, /^dummy$/i];

function usableKey(k: string): boolean {
  if (!k || k.length < 10) return false;
  return !PLACEHOLDER_PATTERNS.some((p) => p.test(k.trim()));
}

/** True bila minimal satu provider punya key nyata (bukan placeholder env lokal). */
export function repairAiAvailable(): boolean {
  for (const env of Object.values(PROVIDER_KEY_ENV)) {
    if (getApiKeys(env).some(usableKey)) return true;
  }
  return false;
}

export interface AiRepairOutcome {
  ok: boolean;
  candidate: MasterQuestion | null;
  aiMeta: {
    provider: string;
    model: string;
    attempted: boolean;
    failureReason?: string;
  };
}

/**
 * Repair konten via AI (concept→context, tautologi, distractor, stem).
 * Pemanggilan TIDAK dilakukan bila key tidak tersedia — hasil REPAIR_FAILED
 * yang jujur, bukan soal karangan. Output AI wajib disimpan (artifact) dan
 * diverifikasi PASS A + PASS B sebelum bisa dianggap GOLD.
 */
export async function aiRepairCandidate(
  q: MasterQuestion,
  repairType: RepairType,
  options: { batchSize?: number } = {}
): Promise<AiRepairOutcome> {
  if (!repairAiAvailable()) {
    return {
      ok: false,
      candidate: null,
      aiMeta: {
        provider: "none",
        model: "none",
        attempted: false,
        failureReason: "AI_PROVIDER_UNAVAILABLE",
      },
    };
  }

  // Impor dinamis agar modul ini aman direferensikan tanpa memicu side-effect provider.
  const { callWithFallback } = await import("../../src/ai/core/provider");

  const prompt = buildRepairPrompt(q, repairType, options.batchSize ?? 1);
  try {
    const res = await callWithFallback({
      model: process.env.AI_FAST_MODEL || "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah penyusun soal Bahasa Indonesia. Hasilkan SATU objek JSON: " +
            '{"text","options":[...4 opsi],"correctAnswer":"index opsi benar","explanation"} ' +
            "yang menguji pemahaman (bukan hafalan definisi). Jangan mengarang fakta, aturan, " +
            "atau interpretasi yang tidak dapat dipertanggungjawabkan. Jika tidak yakin, " +
            'kirim {"error":"REPAIR_FAILED"} dan jangan membuat soal karangan.',
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      maxTokens: 1200,
      timeoutMs: 45000,
      responseFormat: "json",
    });

    const parsed = parseJsonLoose(res.content);
    if (!parsed || typeof parsed !== "object" || parsed.error) {
      return {
        ok: false,
        candidate: null,
        aiMeta: {
          provider: res.provider,
          model: res.model,
          attempted: true,
          failureReason: parsed?.error === "REPAIR_FAILED" ? "REPAIR_FAILED" : "INVALID_JSON",
        },
      };
    }

    const candidate: MasterQuestion = {
      ...q,
      text: String(parsed.text ?? q.text),
      options: Array.isArray(parsed.options) && parsed.options.length >= 2
        ? parsed.options.map((o: unknown) => String(o))
        : q.options,
      correctAnswer: String(parsed.correctAnswer ?? q.correctAnswer),
      explanation: String(parsed.explanation ?? q.explanation),
      type: "PILIHAN_GANDA",
    };

    return {
      ok: true,
      candidate,
      aiMeta: { provider: res.provider, model: res.model, attempted: true },
    };
  } catch (e) {
    return {
      ok: false,
      candidate: null,
      aiMeta: {
        provider: "chain",
        model: "fallback",
        attempted: true,
        failureReason: e instanceof Error ? e.message.slice(0, 120) : "UNKNOWN",
      },
    };
  }
}

function parseJsonLoose(content: string): Record<string, unknown> | null {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

export function buildRepairPrompt(q: MasterQuestion, repairType: RepairType, batchSize: number): string {
  return [
    `Perbaiki soal berikut (${repairType}) dari bank master Bahasa Indonesia.`,
    `Konteks: tema="${q.tema}", kelas=${q.kelas}, kompetensi="${q.kompetensi}", indikator="${q.indikator}", kataKunci=${JSON.stringify(q.kataKunci || [])}.`,
    `Soal asli: "${q.text}" — opsi ${JSON.stringify(q.options)} — kunci "${q.correctAnswer}".`,
    `Instruksi ${repairType}:`,
    repairType === "CONCEPT_TO_CONTEXT" || repairType === "TAUTOLOGY_TO_VALID_ITEM"
      ? "Ubah menjadi butir penilaian kontekstual: berikan stimulus/contoh nyata lalu minta siswa mengidentifikasi/menerapkan konsep. Distractor harus salah karena alasan yang jelas, bukan acak."
      : repairType === "BAD_EXPLAIN_TO_MCQ"
      ? "Ubah pertanyaan definisi menjadi butir pilihan ganda yang menguji pemahaman dengan contoh."
      : "Perbaiki konten dengan tetap menjaga makna asli.",
    `Batasan batch ini: ${batchSize} soal.`,
  ].join("\n");
}
