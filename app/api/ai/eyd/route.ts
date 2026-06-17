import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { checkAIQuota, recordAIUsage } from "@/lib/premium";
import { rateLimitRoute } from "@/lib/rate-limit";

const AI_TIMEOUT = 15000;

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimitRoute(req, { maxRequests: 15, windowSeconds: 60, identifier: "ai-eyd" });
    if (rl) return rl;

    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const quota = await checkAIQuota(user, "koreksi");
    if (!quota.allowed) {
      return NextResponse.json({ error: "QUOTA_EXCEEDED", used: quota.used, limit: quota.limit }, { status: 429 });
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
            max_tokens: 8000,
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
            generationConfig: { temperature: 0.3, maxOutputTokens: 8000 },
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
    await recordAIUsage(user.id, "eyd_checker", tokens, costUSD);

    try {
      return NextResponse.json({ result: JSON.parse(result) });
    } catch {
      return NextResponse.json({ result: { skor: 0, grade: "E", ringkasan: result, koreksi: [] } });
    }
  } catch (error) {
    console.error("AI EYD error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
