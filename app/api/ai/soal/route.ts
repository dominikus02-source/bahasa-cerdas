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

    const quota = await checkAIQuota(user, "soal");
    if (!quota.allowed) {
      return NextResponse.json({ error: "QUOTA_EXCEEDED", used: quota.used, limit: quota.limit }, { status: 429 });
    }

    const body = await req.json();
    const { topic, count = 5, type = "PILIHAN_GANDA", difficulty = "MEDIUM" } = body;

    const prompt = `Buatkan ${count} soal ${type === "PILIHAN_GANDA" ? "pilihan ganda" : type.toLowerCase()} Bahasa Indonesia topik: "${topic}" dengan tingkat kesulitan ${difficulty}.

Format output JSON array:
[
  {
    "text": "pertanyaan",
    "type": "PILIHAN_GANDA",
    "difficulty": "${difficulty}",
    "options": ["jawaban A", "jawaban B", "jawaban C", "jawaban D"],
    "correctAnswer": "B",
    "explanation": "penjelasan jawaban benar",
    "isHOTS": ${difficulty === "HARD"}
  }
]

${type === "ESSAY" ? 'Ubah options jadi [] dan hapus correctAnswer' : ''}
${type === "ISIAN" ? 'Ubah options jadi [] dan buat correctAnswer berupa jawaban singkat' : ''}

Hanya output JSON array, tanpa markdown.`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = msg.content[0];
    if (content.type === "text") {
      let soal = content.text;
      if (soal.includes("```json")) {
        soal = soal.replace(/```json\n?/g, "").replace(/\n?```/g, "");
      }

      const tokens = msg.usage.input_tokens + (msg.usage.output_tokens || 0);
      const costUSD = (tokens / 1_000_000) * 3;

      await recordAIUsage(user.id, "soal_generator", tokens, costUSD);

      try {
        return NextResponse.json({ soal: JSON.parse(soal) });
      } catch {
        return NextResponse.json({ error: "Parse error" }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "AI error" }, { status: 500 });
  } catch (error) {
    console.error("AI soal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}