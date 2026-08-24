// Deprecated: AI generation is centralized in /guru/ai-tools.
// Bekas backend halaman lama /guru/ai-tools/grading yang kini redirect ke workspace utama.
// Endpoint dipertahankan sementara untuk kompatibilitas; jangan tambahkan
// pemanggil baru — gunakan POST /api/ai/agents/run dengan agentId yang sesuai.
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { logLegacyUsage } from "@/src/ai/core/usage-logger";
import { checkAndPrepareDeduction, deductCreditsAtomic, ensureMonthlyLedger } from "@/lib/ai-gateway/quota-checker";

const AI_TIMEOUT = 15000;
const SAFE_ERROR = "AI sedang sibuk. Silakan coba lagi beberapa saat.";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const rl = await rateLimitRoute(req, { maxRequests: 10, windowSeconds: 60, identifier: "ai-grading" });
    if (rl) return rl;

    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Phase 9D — gateway quota check
    await ensureMonthlyLedger(user);
    const { blocked, quota, planInfo, credits } = await checkAndPrepareDeduction(user, "grading", {});
    if (blocked) {
      return NextResponse.json({
        error: "QUOTA_EXCEEDED",
        message: "Credit AI Anda sudah habis. Upgrade atau tunggu periode berikutnya.",
        quota: {
          plan: quota.plan, creditsRequired: quota.creditsRequired,
          creditsUsed: quota.creditsUsed, creditsTotal: quota.creditsTotal,
          remainingCredits: quota.creditsRemaining, upgradeRecommended: true,
        },
      }, { status: 402 });
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
  "feedbackPositif": ["Hal yang sudah baik 1", "Hal yang sudah baik 2"],
  "feedbackPerbaikan": ["Hal yang perlu diperbaiki 1", "Hal yang perlu diperbaiki 2"],
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
    let usedProvider: string | null = null;
    let usedModel: string | null = null;

    if (DEEPSEEK_API_KEY) {
      try {
        const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${DEEPSEEK_API_KEY}` },
          body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "user", content: prompt }], max_tokens: 4000, temperature: 0.3 }),
          signal: AbortSignal.timeout(AI_TIMEOUT),
        });
        const json = await res.json();
        if (json.error) { errors.push("DeepSeek gagal"); }
        else { content = json.choices?.[0]?.message?.content || ""; if (content) { tokens = json.usage?.total_tokens || 0; usedProvider = "deepseek"; usedModel = "deepseek-chat"; } }
      } catch { errors.push("DeepSeek gagal"); }
    } else { errors.push("DeepSeek: No API key"); }

    if (!content && GROQ_API_KEY) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
          body: JSON.stringify({ model: "openai/gpt-oss-20b", messages: [{ role: "user", content: prompt }], max_tokens: 4000, temperature: 0.3 }),
          signal: AbortSignal.timeout(AI_TIMEOUT),
        });
        const json = await res.json();
        if (json.error) { errors.push("Groq gagal"); }
        else { content = json.choices?.[0]?.message?.content || ""; if (content) { tokens = content.length; usedProvider = "groq"; usedModel = "openai/gpt-oss-20b"; } }
      } catch { errors.push("Groq gagal"); }
    } else if (!content) { errors.push("Groq: No API key"); }

    if (!content && GEMINI_API_KEY) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-goog-api-key": GEMINI_API_KEY },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 4000 } }),
          signal: AbortSignal.timeout(AI_TIMEOUT),
        });
        const json = await res.json();
        if (json.error) { errors.push("Gemini gagal"); }
        else { content = json?.candidates?.[0]?.content?.parts?.[0]?.text || ""; if (content) { tokens = content.length; usedProvider = "gemini"; usedModel = "gemini-2.5-flash"; } }
      } catch { errors.push("Gemini gagal"); }
    } else if (!content) { errors.push("Gemini: No API key"); }

    if (!content) {
      const latencyMs = Date.now() - startTime;
      logLegacyUsage({ userId: user.id, feature: "legacy:grading", provider: usedProvider, model: usedModel, tokens: 0, costUSD: 0, latencyMs, success: false, error: SAFE_ERROR }).catch(() => {});
      return NextResponse.json({ error: SAFE_ERROR }, { status: 500 });
    }

    // Provider succeeded — deduct credits
    await deductCreditsAtomic(user.id, planInfo, credits);

    let result = content;
    if (result.includes("```json")) {
      result = result.replace(/```json\n?/g, "").replace(/\n?```/g, "");
    }

    const latencyMs = Date.now() - startTime;
    const costUSD = (tokens / 1_000_000) * 0.5;
    logLegacyUsage({ userId: user.id, feature: "legacy:grading", provider: usedProvider, model: usedModel, tokens, costUSD, latencyMs, success: true, error: null }).catch(() => {});

    try {
      return NextResponse.json({ result: JSON.parse(result) });
    } catch {
      return NextResponse.json({ result: { skor: 0, grade: "E", ringkasan: result } });
    }
  } catch (error) {
    console.error("AI Grading error:", error);
    return NextResponse.json({ error: SAFE_ERROR }, { status: 500 });
  }
}
