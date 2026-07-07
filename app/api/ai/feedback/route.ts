// Deprecated: AI generation is centralized in /guru/ai-tools.
// Bekas backend halaman lama /guru/ai-tools/feedback yang kini redirect ke workspace utama.
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
    const rl = await rateLimitRoute(req, { maxRequests: 10, windowSeconds: 60, identifier: "ai-feedback" });
    if (rl) return rl;

    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const oldQuota = await checkAIQuota(user, "feedback");
    if (!oldQuota.allowed) {
      return NextResponse.json({ error: "QUOTA_EXCEEDED", used: oldQuota.used, limit: oldQuota.limit }, { status: 429 });
    }

    // Phase 9D — gateway quota check
    await ensureMonthlyLedger(user);
    const { blocked, quota, planInfo, credits } = await checkAndPrepareDeduction(user, "feedback", {});
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
    const { namaSiswa, nilai, riwayatNilai, catatanGuru, mode = "individual" } = body;

    if (!namaSiswa || !nilai) {
      return NextResponse.json({ error: "Nama siswa dan nilai wajib diisi" }, { status: 400 });
    }

    const riwayatText = riwayatNilai ? `RIWAYAT NILAI SISWA:\n${riwayatNilai.map((r: any) => `- ${r.mapel}: ${r.nilai} (${r.tanggal})`).join("\n")}\n\n` : "";
    const catatanText = catatanGuru ? `CATATAN GURU:\n${catatanGuru}\n\n` : "";

    const prompt = `Kamu adalah guru Bahasa Indonesia yang peduli terhadap perkembangan siswa.

TUGAS: Berikan feedback personal untuk siswa berikut.

DATA SISWA:
- Nama: ${namaSiswa}
- Nilai Terakhir: ${nilai}

${riwayatText}${catatanText}

INSTRUKSI:

1. ANALISIS PERFORMA SISWA:
   - Evaluasi nilai dan tren perkembangan
   - Identifikasi kekuatan dan kelemahan
   - Bandingkan dengan standar ketuntasan (KKM = 75)

2. BERIKAN FEEDBACK PERSONAL:
   - Apresiasi untuk pencapaian siswa
   - Motivasi untuk terus berkembang
   - Saran spesifik untuk perbaikan

3. BERIKAN REKOMENDASI:
   - Materi yang perlu dipelajari ulang
   - Strategi belajar yang disarankan
   - Target nilai untuk periode berikutnya

4. BUAT LAPORAN UNTUK ORANG TUA (jika mode = "orangtua"):
   - Ringkasan performa siswa
   - Saran untuk orang tua
   - Area yang perlu perhatian

OUTPUT HARUS DALAM FORMAT JSON:
{
  "analisisPerforma": {
    "skor": ${nilai},
    "status": "LULUS|TIDAK LULUS",
    "tren": "Meningkat|Stabil|Menurun",
    "kekuatan": ["Kekuatan 1", "Kekuatan 2"],
    "kelemahan": ["Kelemahan 1", "Kelemahan 2"]
  },
  "feedbackPersonal": {
    "apresiasi": "Kalimat apresiasi untuk siswa",
    "motivasi": "Kalimat motivasi",
    "saranPerbaikan": ["Saran 1", "Saran 2", "Saran 3"]
  },
  "rekomendasi": {
    "materiPerluDipelajari": ["Materi 1", "Materi 2"],
    "strategiBelajar": ["Strategi 1", "Strategi 2"],
    "targetNilai": 85
  },
  "laporanOrangTua": {
    "ringkasan": "Ringkasan performa untuk orang tua",
    "saranOrangTua": ["Saran 1", "Saran 2"],
    "areaPerhatian": ["Area 1", "Area 2"]
  },
  "pesanMotivasi": "Pesan motivasi personal untuk ${namaSiswa}"
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
          body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "user", content: prompt }], max_tokens: 4000, temperature: 0.7 }),
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
          body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [{ role: "user", content: prompt }], max_tokens: 4000, temperature: 0.7 }),
          signal: AbortSignal.timeout(AI_TIMEOUT),
        });
        const json = await res.json();
        if (json.error) { errors.push("Groq gagal"); }
        else { content = json.choices?.[0]?.message?.content || ""; if (content) { tokens = content.length; usedProvider = "groq"; usedModel = "llama-3.1-8b-instant"; } }
      } catch { errors.push("Groq gagal"); }
    } else if (!content) { errors.push("Groq: No API key"); }

    if (!content && GEMINI_API_KEY) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-goog-api-key": GEMINI_API_KEY },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 4000 } }),
          signal: AbortSignal.timeout(AI_TIMEOUT),
        });
        const json = await res.json();
        if (json.error) { errors.push("Gemini gagal"); }
        else { content = json?.candidates?.[0]?.content?.parts?.[0]?.text || ""; if (content) { tokens = content.length; usedProvider = "gemini"; usedModel = "gemini-2.0-flash"; } }
      } catch { errors.push("Gemini gagal"); }
    } else if (!content) { errors.push("Gemini: No API key"); }

    if (!content) {
      const latencyMs = Date.now() - startTime;
      logLegacyUsage({ userId: user.id, feature: "legacy:feedback", provider: usedProvider, model: usedModel, tokens: 0, costUSD: 0, latencyMs, success: false, error: SAFE_ERROR }).catch(() => {});
      return NextResponse.json({ error: SAFE_ERROR }, { status: 500 });
    }

    // Provider succeeded — deduct credits
    await deductCreditsAtomic(user.id, planInfo, credits);

    let result = content;
    if (result.includes("```json")) {
      result = result.replace(/```json\n?/g, "").replace(/\n?```/g, "");
    }

    const costUSD = (tokens / 1_000_000) * 0.5;
    await recordAIUsage(user.id, "student_feedback", tokens, costUSD);

    const latencyMs = Date.now() - startTime;
    logLegacyUsage({ userId: user.id, feature: "legacy:feedback", provider: usedProvider, model: usedModel, tokens, costUSD, latencyMs, success: true, error: null }).catch(() => {});

    try {
      return NextResponse.json({ result: JSON.parse(result) });
    } catch {
      return NextResponse.json({ result: { pesanMotivasi: result } });
    }
  } catch (error) {
    console.error("AI Feedback error:", error);
    return NextResponse.json({ error: SAFE_ERROR }, { status: 500 });
  }
}
