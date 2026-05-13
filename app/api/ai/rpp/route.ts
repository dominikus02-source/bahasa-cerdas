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
  "identity": { "sekolah", "mataPelajaran", "kelas", "alokasiWaktu", "tahunAjaran" },
  "competency": { "dasar": [...], "tujuan": [...] },
  "indicators": [...],
  "learningSteps": [{ "phase": "name", "activities": [...] }],
  "assessment": { "technique": "...", "instruments": [...] },
  "differentiation": { "remedial": [...], "enrichment": [...] },
  "materials": [...],
  "references": [...]
}

Buatkan dalam Bahasa Indonesia yang baik dan benar. Hanya output JSON, tanpa markdown.`;

    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content || "";

    let rpp = content;
    if (rpp.includes("```json")) {
      rpp = rpp.replace(/```json\n?/g, "").replace(/\n?```/g, "");
    }

    const tokens = json.usage?.total_tokens || 0;
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
