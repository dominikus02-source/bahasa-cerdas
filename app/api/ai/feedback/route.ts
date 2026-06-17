import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { checkAIQuota, recordAIUsage } from "@/lib/premium";
import { rateLimitRoute } from "@/lib/rate-limit";

const AI_TIMEOUT = 15000;

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimitRoute(req, { maxRequests: 10, windowSeconds: 60, identifier: "ai-feedback" });
    if (rl) return rl;

    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const quota = await checkAIQuota(user, "feedback");
    if (!quota.allowed) {
      return NextResponse.json({ error: "QUOTA_EXCEEDED", used: quota.used, limit: quota.limit }, { status: 429 });
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

    if (DEEPSEEK_API_KEY) {
      try {
        const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${DEEPSEEK_API_KEY}` },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 4000,
            temperature: 0.7,
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
            temperature: 0.7,
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
            generationConfig: { temperature: 0.7, maxOutputTokens: 4000 },
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
    await recordAIUsage(user.id, "student_feedback", tokens, costUSD);

    try {
      return NextResponse.json({ result: JSON.parse(result) });
    } catch {
      return NextResponse.json({ result: { pesanMotivasi: result } });
    }
  } catch (error) {
    console.error("AI Feedback error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
