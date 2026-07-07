// Deprecated: AI generation is centralized in /guru/ai-tools.
// Bekas backend halaman lama /guru/ai-tools/eyd yang kini redirect ke workspace utama.
// Endpoint dipertahankan sementara untuk kompatibilitas; jangan tambahkan
// pemanggil baru — gunakan POST /api/ai/agents/run dengan agentId yang sesuai.
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { checkAIQuota, recordAIUsage } from "@/lib/premium";
import { rateLimitRoute } from "@/lib/rate-limit";
import { logLegacyUsage } from "@/src/ai/core/usage-logger";
import { checkAndPrepareDeduction, deductCreditsAtomic, ensureMonthlyLedger } from "@/lib/ai-gateway/quota-checker";

const AI_TIMEOUT = 15000;
const SAFE_ERROR = "AI sedang sibuk. Silakan coba lagi beberapa saat.";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const rl = await rateLimitRoute(req, { maxRequests: 15, windowSeconds: 60, identifier: "ai-eyd" });
    if (rl) return rl;

    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Legacy quota check for backward compatibility
    const oldQuota = await checkAIQuota(user, "koreksi");
    if (!oldQuota.allowed) {
      return NextResponse.json({ error: "QUOTA_EXCEEDED", used: oldQuota.used, limit: oldQuota.limit }, { status: 429 });
    }

    // Phase 9D — gateway quota check
    await ensureMonthlyLedger(user);
    const { blocked, quota, planInfo, credits } = await checkAndPrepareDeduction(
      user, "eyd", {}
    );
    if (blocked) {
      return NextResponse.json({
        error: "QUOTA_EXCEEDED",
        message: "Credit AI Anda sudah habis. Upgrade atau tunggu periode berikutnya.",
        quota: {
          plan: quota.plan,
          creditsRequired: quota.creditsRequired,
          creditsUsed: quota.creditsUsed,
          creditsTotal: quota.creditsTotal,
          remainingCredits: quota.creditsRemaining,
          upgradeRecommended: true,
        },
      }, { status: 402 });
    }

    const body = await req.json();
    const { text, mode = "eyd" } = body;

    if (!text || text.length < 10) {
      return NextResponse.json({ error: "Teks terlalu pendek (minimal 10 karakter)" }, { status: 400 });
    }

    const modeLabels: Record<string, string> = {
      eyd: "EYD V (Ejaan Yang Disempurnakan)",
      puebi: "PUEBI (Pedoman Umum Ejaan Bahasa Indonesia)",
      tataBahasa: "Tata Bahasa Indonesia",
      lengkap: "Koreksi Lengkap (EYD + PUEBI + Tata Bahasa)",
    };

    const modeLabel = modeLabels[mode] || modeLabels["lengkap"];

    const prompt = `Kamu adalah korektor bahasa Indonesia profesional yang ahli dalam EYD V, PUEBI, dan tata bahasa Indonesia.

TUGAS: Koreksi teks berikut sesuai dengan ${modeLabel}.

TEKS YANG AKAN DIKOREKSI:
${text}

INSTRUKSI DETAIL:

1. IDENTIFIKASI SEMUA KESALAHAN:
   - Kesalahan ejaan (huruf kapital, huruf miring, penulisan kata)
   - Kesalahan tanda baca (titik, koma, titik koma, tanda hubung, dll)
   - Kesalahan tata bahasa (struktur kalimat, penggunaan kata depan, konjungsi)
   - Kesalahan pemilihan kata (kata baku vs tidak baku, kata serapan)
   - Kesalahan penulisan angka dan bilangan
   - Kesalahan penggunaan huruf (huruf besar di awal kalimat, nama diri, dll)

2. BERIKAN KOREKSI DENGAN FORMAT:
   - Tunjukkan teks asli yang salah
   - Berikan koreksi yang benar
   - Jelaskan alasan koreksi berdasarkan aturan EYD/PUEBI/tata bahasa

3. BERIKAN SKOR KEBENARAN:
   - Hitung persentase kebenaran teks (0-100%)
   - Berikan grade: A (90-100%), B (80-89%), C (70-79%), D (60-69%), E (<60%)

4. BERIKAN SARAN PERBAIKAN:
   - Saran kalimat yang lebih efektif
   - Saran struktur paragraf yang lebih baik
   - Saran pemilihan kata yang lebih tepat

OUTPUT HARUS DALAM FORMAT JSON:
{
  "skor": 85,
  "grade": "B",
  "jumlahKesalahan": 5,
  "koreksi": [
    {
      "asli": "kata yang salah",
      "benar": "kata yang benar",
      "jenis": "ejaan|tandabaca|tatabahasa|pilihankata|angka|huruf",
      "penjelasan": "Penjelasan berdasarkan aturan EYD/PUEBI",
      "posisi": "nomor paragraf/kalimat"
    }
  ],
  "teksDikoreksi": "Teks lengkap yang sudah dikoreksi",
  "saranPerbaikan": [
    "Saran 1",
    "Saran 2"
  ],
  "ringkasan": "Ringkasan hasil koreksi dalam 2-3 kalimat"
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
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 8000,
            temperature: 0.3,
          }),
          signal: AbortSignal.timeout(AI_TIMEOUT),
        });
        const json = await res.json();
        if (json.error) {
          errors.push("DeepSeek gagal");
        } else {
          content = json.choices?.[0]?.message?.content || "";
          if (content) {
            tokens = json.usage?.total_tokens || 0;
            usedProvider = "deepseek";
            usedModel = "deepseek-chat";
          }
        }
      } catch { errors.push("DeepSeek gagal"); }
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
            max_tokens: 8000,
            temperature: 0.3,
          }),
          signal: AbortSignal.timeout(AI_TIMEOUT),
        });
        const json = await res.json();
        if (json.error) {
          errors.push("Groq gagal");
        } else {
          content = json.choices?.[0]?.message?.content || "";
          if (content) {
            tokens = content.length;
            usedProvider = "groq";
            usedModel = "llama-3.1-8b-instant";
          }
        }
      } catch { errors.push("Groq gagal"); }
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
            generationConfig: { temperature: 0.3, maxOutputTokens: 8000 },
          }),
          signal: AbortSignal.timeout(AI_TIMEOUT),
        });
        const json = await res.json();
        if (json.error) {
          errors.push("Gemini gagal");
        } else {
          content = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (content) {
            tokens = content.length;
            usedProvider = "gemini";
            usedModel = "gemini-2.0-flash";
          }
        }
      } catch { errors.push("Gemini gagal"); }
    } else if (!content) {
      errors.push("Gemini: No API key");
    }

    if (!content) {
      const latencyMs = Date.now() - startTime;
      logLegacyUsage({
        userId: user.id,
        feature: "legacy:eyd",
        provider: usedProvider,
        model: usedModel,
        tokens: 0,
        costUSD: 0,
        latencyMs,
        success: false,
        error: SAFE_ERROR,
      }).catch(() => {});
      return NextResponse.json({ error: SAFE_ERROR }, { status: 500 });
    }

    // Provider succeeded — deduct credits
    await deductCreditsAtomic(user.id, planInfo, credits);

    let result = content;
    if (result.includes("```json")) {
      result = result.replace(/```json\n?/g, "").replace(/\n?```/g, "");
    }

    const costUSD = (tokens / 1_000_000) * 0.5;
    await recordAIUsage(user.id, "eyd_checker", tokens, costUSD);

    const latencyMs = Date.now() - startTime;
    logLegacyUsage({
      userId: user.id,
      feature: "legacy:eyd",
      provider: usedProvider,
      model: usedModel,
      tokens,
      costUSD,
      latencyMs,
      success: true,
      error: null,
    }).catch(() => {});

    try {
      return NextResponse.json({ result: JSON.parse(result) });
    } catch {
      return NextResponse.json({ result: { skor: 0, grade: "E", ringkasan: result, koreksi: [] } });
    }
  } catch (error) {
    console.error("AI EYD error:", error);
    return NextResponse.json({ error: SAFE_ERROR }, { status: 500 });
  }
}
