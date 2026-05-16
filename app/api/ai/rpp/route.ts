import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { checkAIQuota, recordAIUsage } from "@/lib/premium";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const quota = await checkAIQuota(user, "rpp");
    if (!quota.allowed) {
      return NextResponse.json({ error: "QUOTA_EXCEEDED", used: quota.used, limit: quota.limit }, { status: 429 });
    }

    const body = await req.json();
    const { kd, kelas, topik, alokasi, metode } = body;

    const prompt = `Buatkan RPP (Rencana Pelaksanaan Pembelajaran) lengkap untuk mata pelajaran Bahasa Indonesia dengan detail berikut:

Kelas: ${kelas || "X"}
KD/Kompetensi Dasar: ${kd || "3.1 Menganalisis struktur dan kebahasaan teks negosiasi"}
Topik/Materi: ${topik || "Teks Negosiasi"}
Alokasi Waktu: ${alokasi || "3 x 40 menit"}
Metode: ${metode || "Diskusi, ceramah, penugasan"}

Format output JSON dengan struktur:
{
  "title": "Judul RPP",
  "description": "Deskripsi singkat RPP",
  "competency": "Kompetensi dasar yang dicapai",
  "indicators": ["Indikator 1", "Indikator 2"],
  "learningSteps": [
    "Kegiatan Pendahuluan: ...",
    "Kegiatan Inti: ...",
    "Kegiatan Penutup: ..."
  ],
  "assessment": "Teknik dan instrumen penilaian",
  "differentiation": "Diferensiasi pembelajaran",
  "materials": "Materi dan sumber belajar",
  "references": "Referensi"
}

Buatkan dalam Bahasa Indonesia yang baik dan benar. Hanya output JSON, tanpa markdown.`;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

    let content = "";
    let tokens = 0;

    if (GEMINI_API_KEY) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4000 },
        }),
      });
      const json = await res.json();
      content = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      tokens = content.length;
    } else if (DEEPSEEK_API_KEY) {
      const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 4000,
          temperature: 0.7,
        }),
      });
      const json = await res.json();
      content = json.choices?.[0]?.message?.content || "";
      tokens = json.usage?.total_tokens || 0;
    } else {
      return NextResponse.json({ error: "No AI API key configured" }, { status: 500 });
    }

    let rpp = content;
    if (rpp.includes("```json")) {
      rpp = rpp.replace(/```json\n?/g, "").replace(/\n?```/g, "");
    }

    const costUSD = (tokens / 1_000_000) * 0.5;
    await recordAIUsage(user.id, "rpp_generator", tokens, costUSD);

    try {
      return NextResponse.json({ rpp: JSON.parse(rpp) });
    } catch {
      return NextResponse.json({ rpp: { title: topik || "RPP Bahasa Indonesia", description: rpp } });
    }
  } catch (error) {
    console.error("AI RPP error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
