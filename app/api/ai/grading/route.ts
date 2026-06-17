import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { checkAIQuota, recordAIUsage } from "@/lib/premium";
import { rateLimitRoute } from "@/lib/rate-limit";

const AI_TIMEOUT = 15000;

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimitRoute(req, { maxRequests: 10, windowSeconds: 60, identifier: "ai-grading" });
    if (rl) return rl;

    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const quota = await checkAIQuota(user, "grading");
    if (!quota.allowed) {
      return NextResponse.json({ error: "QUOTA_EXCEEDED", used: quota.used, limit: quota.limit }, { status: 429 });
    }

    const body = await req.json();
    const { soal, jawabanSiswa, rubrik, tipeSoal = "essay" } = body;

    if (!soal || !jawabanSiswa) {
      return NextResponse.json({ error: "Soal dan jawaban siswa wajib diisi" }, { status: 400 });
    }

    const prompt = `Kamu adalah guru Bahasa Indonesia yang ahli dalam penilaian essay dan HOTS.

TUGAS: Nilai jawaban siswa berikut berdasarkan soal dan rubrik yang diberikan.

SOAL:
${soal}

JAWABAN SISWA:
${jawabanSiswa}

${rubrik ? `RUBRIK PENILAIAN:\n${rubrik}\n\n` : ""}

INSTRUKSI PENILAIAN:

1. ANALISIS JAWABAN SISWA:
   - Apakah jawaban relevan dengan pertanyaan?
   - Apakah ada argumen/penjelasan yang mendukung?
   - Apakah menggunakan bahasa Indonesia yang baik dan benar?
   - Apakah struktur jawaban logis dan sistematis?

2. BERIKAN NILAI BERDASARKAN KRITERIA:
   ${tipeSoal === "essay" ? `
   - Isi/Konten (40%): Kedalaman pemahaman, relevansi dengan soal
   - Struktur (20%): Keruntutan alur, paragraf, sistematika
   - Bahasa (20%): Tata bahasa, ejaan, pilihan kata, kalimat efektif
   - Kreativitas/Analisis (20%): Originalitas, kemampuan berpikir kritis
   ` : `
   - Kebenaran Jawaban (50%): Kesesuaian dengan kunci jawaban
   - Penjelasan (30%): Kelengkapan penjelasan/alasan
   - Bahasa (20%): Tata bahasa dan ejaan
   `}

3. BERIKAN FEEDBACK DETAIL:
   - Apa yang sudah baik dari jawaban siswa
   - Apa yang perlu diperbaiki
   - Saran spesifik untuk meningkatkan jawaban

4. BERIKAN NILAI AKHIR:
   - Skor 0-100
   - Grade: A (≥85), B (≥70), C (≥55), D (<55)
   - Status: LULUS (≥55) atau TIDAK LULUS (<55)

OUTPUT HARUS DALAM FORMAT JSON:
{
  "skor": 75,
  "grade": "C",
  "status": "LULUS",
  "detailNilai": {
    "isiKonten": { "skor": 30, "maksimal": 40, "komentar": "Komentar" },
    "struktur": { "skor": 15, "maksimal": 20, "komentar": "Komentar" },
    "bahasa": { "skor": 15, "maksimal": 20, "komentar": "Komentar" },
    "kreativitas": { "skor": 15, "maksimal": 20, "komentar": "Komentar" }
  },
  "feedbackPositif": [
    "Hal yang sudah baik 1",
    "Hal yang sudah baik 2"
  ],
  "feedbackPerbaikan": [
    "Hal yang perlu diperbaiki 1",
    "Hal yang perlu diperbaiki 2"
  ],
  "saran": "Saran umum untuk meningkatkan kualitas jawaban",
  "ringkasan": "Ringkasan penilaian dalam 2-3 kalimat"
}

Hanya output JSON, tanpa markdown.`;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    let content = "";
    let tokens = 0;
    const errors: string[] = [];

    if (DEEPSEEK_API_KEY) {
      try {
        const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${DEEPSEEK_API_KEY}` },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 4000,
            temperature: 0.3,
          }),
          signal: AbortSignal.timeout(AI_TIMEOUT),
        });
        const json = await res.json();
        if (json.error) {
          errors.push(`DeepSeek: ${json.error.message || json.error}`);
        } else {
          content = json.choices?.[0]?.message?.content || "";
          if (content) tokens = json.usage?.total_tokens || 0;
        }
      } catch (e: any) { errors.push(`DeepSeek: ${e.message}`); }
    } else {
      errors.push("DeepSeek: No API key");
    }

    if (!content && GROQ_API_KEY) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 4000,
            temperature: 0.3,
          }),
          signal: AbortSignal.timeout(AI_TIMEOUT),
        });
        const json = await res.json();
        if (json.error) {
          errors.push(`Groq: ${json.error.message || json.error}`);
        } else {
          content = json.choices?.[0]?.message?.content || "";
          if (content) tokens = content.length;
        }
      } catch (e: any) { errors.push(`Groq: ${e.message}`); }
    } else if (!content) {
      errors.push("Groq: No API key");
    }

    if (!content && GEMINI_API_KEY) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-goog-api-key": GEMINI_API_KEY },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 4000 },
          }),
          signal: AbortSignal.timeout(AI_TIMEOUT),
        });
        const json = await res.json();
        if (json.error) {
          errors.push(`Gemini: ${json.error.message || json.error}`);
        } else {
          content = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (content) tokens = content.length;
        }
      } catch (e: any) { errors.push(`Gemini: ${e.message}`); }
    } else if (!content) {
      errors.push("Gemini: No API key");
    }

    if (!content) {
      console.error("All AI providers failed:", errors);
      return NextResponse.json({ error: `Semua AI provider gagal: ${errors.join("; ")}.` }, { status: 500 });
    }

    let result = content;
    if (result.includes("```json")) {
      result = result.replace(/```json\n?/g, "").replace(/\n?```/g, "");
    }

    const costUSD = (tokens / 1_000_000) * 0.5;
    await recordAIUsage(user.id, "auto_grading", tokens, costUSD);

    try {
      return NextResponse.json({ result: JSON.parse(result) });
    } catch {
      return NextResponse.json({ result: { skor: 0, grade: "E", ringkasan: result } });
    }
  } catch (error) {
    console.error("AI Grading error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
