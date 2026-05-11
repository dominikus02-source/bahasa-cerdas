import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { checkAIQuota, recordAIUsage } from "@/lib/premium";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

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
  "competency": { " dasar": [...], "tujuan": [...] },
  "indicators": [...],
  "learningSteps": [{ "phase": "name", "activities": [...] }],
  "assessment": { "technique": "...", "instruments": [...] },
  "differentiation": { "remedial": [...], "enrichment": [...] },
  "materials": [...],
  "references": [...]
}

Buatkan dalam Bahasa Indonesia yang baik dan benar. Jangan gunakan markdown atau kode formatting, hanya JSON biasa.`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = msg.content[0];
    if (content.type === "text") {
      let rpp = content.text;
      if (rpp.includes("```json")) {
        rpp = rpp.replace(/```json\n?/g, "").replace(/\n?```/g, "");
      }

      const tokens = msg.usage.input_tokens + (msg.usage.output_tokens || 0);
      const costUSD = (tokens / 1_000_000) * 3;

      await recordAIUsage(user.id, "rpp_generator", tokens, costUSD);

      try {
        return NextResponse.json({ rpp: JSON.parse(rpp) });
      } catch {
        return NextResponse.json({ rpp: { title: topik || "RPP Bahasa Indonesia", description: rpp } });
      }
    }

    return NextResponse.json({ error: "AI error" }, { status: 500 });
  } catch (error) {
    console.error("AI RPP error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}