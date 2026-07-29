// Deprecated: AI generation is centralized in /guru/ai-tools.
// Bekas backend halaman lama /guru/ai-tools/text-analysis yang kini redirect ke workspace utama.
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
    const rl = await rateLimitRoute(req, { maxRequests: 10, windowSeconds: 60, identifier: "ai-text-analysis" });
    if (rl) return rl;

    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const oldQuota = await checkAIQuota(user, "ringkasan");
    if (!oldQuota.allowed) {
      return NextResponse.json({ error: "QUOTA_EXCEEDED", used: oldQuota.used, limit: oldQuota.limit }, { status: 429 });
    }

    // Phase 9D — gateway quota check
    await ensureMonthlyLedger(user);
    const body = await req.json();
    const { teks } = body;
    const textLen = teks?.length ?? 0;
    const { blocked, quota, planInfo, credits } = await checkAndPrepareDeduction(user, "text-analysis", { textLength: textLen });
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

    const { mode = "ringkasan" } = body;

    if (!teks || teks.length < 50) {
      return NextResponse.json({ error: "Teks terlalu pendek (minimal 50 karakter)" }, { status: 400 });
    }

    const modeLabels: Record<string, string> = {
      ringkasan: "Ringkasan Teks",
      puisi: "Analisis Puisi",
      cerpen: "Analisis Cerpen",
      majas: "Deteksi Majas",
      struktur: "Analisis Struktur Teks",
    };

    const modeLabel = modeLabels[mode] || modeLabels["ringkasan"];

    let prompt = "";

    if (mode === "ringkasan") {
      prompt = `Kamu adalah ahli bahasa Indonesia yang ahli dalam meringkas teks.

TUGAS: Buat ringkasan dari teks berikut.

TEKS:
${teks}

INSTRUKSI:
1. Identifikasi ide pokok setiap paragraf
2. Buat ringkasan yang mencakup semua ide pokok
3. Gunakan bahasa yang ringkas dan jelas
4. Pertahankan makna asli teks
5. Buat ringkasan dalam 3-5 kalimat

OUTPUT HARUS DALAM FORMAT JSON:
{
  "ringkasan": "Ringkasan teks dalam 3-5 kalimat",
  "idePokok": ["Ide pokok 1", "Ide pokok 2", "Ide pokok 3"],
  "kataKunci": ["kata1", "kata2", "kata3"],
  "jumlahKataAsli": 500,
  "jumlahKataRingkasan": 50,
  "persentasePemadatan": 90,
  "jenisTeks": "Narasi|Deskripsi|Eksposisi|Argumentasi|Prosedur"
}

Hanya output JSON, tanpa markdown.`;
    } else if (mode === "puisi") {
      prompt = `Kamu adalah ahli sastra Indonesia yang ahli dalam analisis puisi.

TUGAS: Analisis puisi berikut secara mendalam.

PUISI:
${teks}

INSTRUKSI:
1. Identifikasi tema dan amanat puisi
2. Analisis majas yang digunakan
3. Analisis diksi dan gaya bahasa
4. Analisis struktur bait dan baris
5. Analisis rima dan irama
6. Berikan interpretasi makna

OUTPUT HARUS DALAM FORMAT JSON:
{
  "judul": "Judul puisi (jika ada)",
  "pengarang": "Pengarang (jika diketahui)",
  "tema": "Tema utama puisi",
  "amanat": "Amanat/pesan moral",
  "majas": [
    { "jenis": "Metafora|Personifikasi|Hiperbola|Simile|dll", "contoh": "Kutipan dari puisi", "makna": "Penjelasan makna" }
  ],
  "diksi": { "kataKunci": ["kata1", "kata2"], "gayaBahasa": "Deskripsi gaya bahasa" },
  "struktur": { "jumlahBait": 4, "jumlahBaris": 16, "polaRima": "AABB|ABAB|dll", "irama": "Deskripsi irama" },
  "interpretasi": "Interpretasi makna puisi secara keseluruhan"
}

Hanya output JSON, tanpa markdown.`;
    } else if (mode === "cerpen") {
      prompt = `Kamu adalah ahli sastra Indonesia yang ahli dalam analisis cerpen.

TUGAS: Analisis cerpen berikut secara mendalam.

CERPEN:
${teks}

INSTRUKSI:
1. Identifikasi unsur intrinsik (tema, alur, tokoh, latar, amanat, sudut pandang)
2. Analisis karakter tokoh
3. Analisis alur cerita
4. Identifikasi konflik
5. Berikan penilaian kualitas cerpen

OUTPUT HARUS DALAM FORMAT JSON:
{
  "tema": "Tema utama cerpen",
  "alur": "Progresif|Regresif|Campuran",
  "tokoh": [
    { "nama": "Nama tokoh", "peran": "Protagonis|Antagonis|Tritagonis", "watak": "Deskripsi watak", "penokohan": "Analitik|Dramatik" }
  ],
  "latar": { "tempat": "Deskripsi tempat", "waktu": "Deskripsi waktu", "suasana": "Deskripsi suasana" },
  "amanat": "Amanat/pesan moral",
  "sudutPandang": "Orang pertama|Orang ketiga",
  "konflik": { "utama": "Deskripsi konflik utama", "jenis": "Internal|Eksternal" },
  "penilaian": { "skor": 85, "kelebihan": ["Kelebihan 1", "Kelebihan 2"], "kekurangan": ["Kekurangan 1", "Kekurangan 2"] }
}

Hanya output JSON, tanpa markdown.`;
    } else if (mode === "majas") {
      prompt = `Kamu adalah ahli bahasa Indonesia yang ahli dalam deteksi majas.

TUGAS: Identifikasi semua majas dalam teks berikut.

TEKS:
${teks}

INSTRUKSI:
1. Identifikasi semua jenis majas yang ada
2. Kutip bagian teks yang mengandung majas
3. Jelaskan makna dan fungsi majas tersebut
4. Berikan jumlah total majas yang ditemukan

JENIS MAJAS YANG DICARI:
- Majas Perbandingan: Metafora, Personifikasi, Hiperbola, Simile, Alegori, dll
- Majas Sindiran: Ironi, Sarkasme, Sinisme, Satire
- Majas Penegasan: Repetisi, Pleonasme, Retorik, Klimaks, Antiklimaks
- Majas Pertentangan: Antitesis, Paradoks, Kontradiksi

OUTPUT HARUS DALAM FORMAT JSON:
{
  "totalMajas": 5,
  "majas": [
    { "jenis": "Metafora|Personifikasi|Hiperbola|dll", "kelompok": "Perbandingan|Sindiran|Penegasan|Pertentangan", "kutipan": "Kutipan dari teks", "makna": "Penjelasan makna majas", "fungsi": "Fungsi majas dalam konteks" }
  ],
  "ringkasan": "Ringkasan penggunaan majas dalam teks"
}

Hanya output JSON, tanpa markdown.`;
    } else if (mode === "struktur") {
      prompt = `Kamu adalah ahli bahasa Indonesia yang ahli dalam analisis struktur teks.

TUGAS: Analisis struktur teks berikut.

TEKS:
${teks}

INSTRUKSI:
1. Identifikasi jenis teks (Narasi, Deskripsi, Eksposisi, Argumentasi, Prosedur)
2. Analisis struktur teks sesuai jenisnya
3. Identifikasi fungsi setiap bagian
4. Evaluasi keruntutan dan koherensi

OUTPUT HARUS DALAM FORMAT JSON:
{
  "jenisTeks": "Narasi|Deskripsi|Eksposisi|Argumentasi|Prosedur",
  "struktur": [
    { "bagian": "Nama bagian (Orientasi/Komplikasi/Resolusi dll)", "paragraf": "1-2", "fungsi": "Deskripsi fungsi", "isi": "Ringkasan isi" }
  ],
  "koherensi": { "skor": 85, "keterangan": "Penilaian koherensi antar paragraf" },
  "kataPenghubung": ["kata1", "kata2", "kata3"],
  "penilaian": { "skor": 80, "kelebihan": ["Kelebihan 1", "Kelebihan 2"], "saran": ["Saran 1", "Saran 2"] }
}

Hanya output JSON, tanpa markdown.`;
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY_TEXT_ANALYSIS || process.env.DEEPSEEK_API_KEY;
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
      logLegacyUsage({ userId: user.id, feature: "legacy:text-analysis", provider: usedProvider, model: usedModel, tokens: 0, costUSD: 0, latencyMs, success: false, error: SAFE_ERROR }).catch(() => {});
      return NextResponse.json({ error: SAFE_ERROR }, { status: 500 });
    }

    // Provider succeeded — deduct credits
    await deductCreditsAtomic(user.id, planInfo, credits);

    let result = content;
    if (result.includes("```json")) {
      result = result.replace(/```json\n?/g, "").replace(/\n?```/g, "");
    }

    const costUSD = (tokens / 1_000_000) * 0.5;
    await recordAIUsage(user.id, "text_analysis", tokens, costUSD);

    const latencyMs = Date.now() - startTime;
    logLegacyUsage({ userId: user.id, feature: "legacy:text-analysis", provider: usedProvider, model: usedModel, tokens, costUSD, latencyMs, success: true, error: null }).catch(() => {});

    try {
      return NextResponse.json({ result: JSON.parse(result) });
    } catch {
      return NextResponse.json({ result: { ringkasan: result } });
    }
  } catch (error) {
    console.error("AI Text Analysis error:", error);
    return NextResponse.json({ error: SAFE_ERROR }, { status: 500 });
  }
}
