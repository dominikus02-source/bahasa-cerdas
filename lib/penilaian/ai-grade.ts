/**
 * Penilaian OTOMATIS jawaban konstruktif UKBI (Menulis & Berbicara) tanpa guru.
 * - Menulis: teks langsung dinilai LLM terhadap rubrik.
 * - Berbicara: rekaman ditranskrip (Groq Whisper) → transkrip dinilai LLM.
 * Semua fail-safe: bila AI gagal, kembalikan skor 0 + tandai perlu ditinjau,
 * TIDAK melempar error (submit tak boleh gagal karena grader).
 */
import { callWithFallback, getDefaultModel } from "@/src/ai/core/provider";

export interface GradeResult {
  score: number; // 0..100
  feedback: string;
  transcript?: string;
  graded: boolean; // true bila AI berhasil menilai
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

/** Transkrip audio Indonesia via Groq Whisper. Kembalikan "" bila gagal. */
export async function transcribeSpeaking(audioUrl: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key || !audioUrl) return "";
  try {
    const audio = await withTimeout(fetch(audioUrl), 15000);
    if (!audio.ok) return "";
    const buf = await audio.arrayBuffer();
    const type = audio.headers.get("content-type") || "audio/webm";
    const ext = type.includes("mp4") ? "mp4" : "webm";
    const form = new FormData();
    form.append("file", new Blob([buf], { type }), `rekaman.${ext}`);
    form.append("model", "whisper-large-v3");
    form.append("language", "id");
    form.append("response_format", "json");
    const res = await withTimeout(
      fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
      }),
      30000
    );
    if (!res.ok) return "";
    const data = await res.json();
    return (data.text || "").trim();
  } catch {
    return "";
  }
}

function parseScore(raw: string): { score: number; feedback: string } | null {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    const obj = JSON.parse(m ? m[0] : raw);
    let s = Number(obj.score ?? obj.nilai ?? obj.skor);
    if (Number.isNaN(s)) return null;
    s = Math.max(0, Math.min(100, Math.round(s)));
    return { score: s, feedback: String(obj.feedback ?? obj.masukan ?? "").slice(0, 800) };
  } catch {
    return null;
  }
}

/** Nilai teks/transkrip terhadap rubrik. */
async function gradeText(params: {
  seksi: "MENULIS" | "BERBICARA";
  prompt: string;
  rubric: any;
  answer: string;
}): Promise<{ score: number; feedback: string } | null> {
  const { seksi, prompt, rubric, answer } = params;
  if (!answer || !answer.trim()) return { score: 0, feedback: "Tidak ada jawaban." };

  const rubrikText = rubric
    ? typeof rubric === "string"
      ? rubric
      : JSON.stringify(rubric)
    : "Nilai berdasarkan: kesesuaian isi dengan perintah, struktur/kelogisan, ketepatan kaidah bahasa Indonesia, dan kelengkapan.";

  const sys =
    `Anda penilai ahli UKBI (Uji Kemahiran Berbahasa Indonesia) untuk seksi ${seksi === "MENULIS" ? "Menulis" : "Berbicara"}. ` +
    `Nilai jawaban peserta secara objektif berdasarkan rubrik. Skala 0–100. ` +
    `Untuk Berbicara, input adalah TRANSKRIP ucapan peserta (abaikan jeda/typo transkripsi wajar). ` +
    `Balas HANYA JSON valid: {"score": <0-100>, "feedback": "<2-3 kalimat, Bahasa Indonesia>"}. Tanpa teks lain.`;

  const usr =
    `PERINTAH SOAL:\n${prompt}\n\nRUBRIK PENILAIAN:\n${rubrikText}\n\nJAWABAN PESERTA:\n${answer}`;

  try {
    const res = await withTimeout(
      callWithFallback({
        model: getDefaultModel(),
        messages: [
          { role: "system", content: sys },
          { role: "user", content: usr },
        ],
        temperature: 0.2,
        maxTokens: 500,
        responseFormat: "json",
        timeoutMs: 30000,
      } as any),
      35000
    );
    return parseScore(res.content);
  } catch {
    return null;
  }
}

/** Nilai satu jawaban konstruktif. Selalu resolve (fail-safe). */
export async function gradeConstructed(params: {
  seksi: string;
  prompt: string;
  rubric: any;
  answer: string; // teks (Menulis) atau URL rekaman (Berbicara)
}): Promise<GradeResult> {
  const seksi = params.seksi.toUpperCase() === "BERBICARA" ? "BERBICARA" : "MENULIS";
  let text = params.answer || "";
  let transcript: string | undefined;

  if (seksi === "BERBICARA") {
    // answer = URL rekaman → transkrip dulu.
    if (/^https?:\/\//.test(text)) {
      transcript = await transcribeSpeaking(text);
      text = transcript;
    }
    if (!text) {
      return { score: 0, feedback: "Rekaman tidak dapat ditranskripsikan.", transcript, graded: false };
    }
  }

  const graded = await gradeText({ seksi, prompt: params.prompt, rubric: params.rubric, answer: text });
  if (!graded) {
    return { score: 0, feedback: "Penilaian otomatis belum tersedia — akan ditinjau ulang.", transcript, graded: false };
  }
  return { ...graded, transcript, graded: true };
}
