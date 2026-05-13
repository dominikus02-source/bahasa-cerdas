import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { checkAIQuota, recordAIUsage } from "@/lib/premium";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const quota = await checkAIQuota(user, "soal");
    if (!quota.allowed) {
      return NextResponse.json({ error: "QUOTA_EXCEEDED", used: quota.used, limit: quota.limit }, { status: 429 });
    }

    const body = await req.json();
    const { topic, count = 5, type = "PILIHAN_GANDA", difficulty = "MEDIUM", kelas, kd } = body;

    const prompt = `Buatkan ${count} soal ${type === "PILIHAN_GANDA" ? "pilihan ganda" : type.toLowerCase()} Bahasa Indonesia${kelas ? " kelas " + kelas : ""} topik: "${topic}" dengan tingkat kesulitan ${difficulty}.

Format output JSON array:
[
  {
    "text": "pertanyaan",
    "type": "${type}",
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

    let soal = content;
    if (soal.includes("```json")) {
      soal = soal.replace(/```json\n?/g, "").replace(/\n?```/g, "");
    }

    const tokens = json.usage?.total_tokens || 0;
    const costUSD = (tokens / 1_000_000) * 0.5;
    await recordAIUsage(user.id, "soal_generator", tokens, costUSD);

    try {
      return NextResponse.json({ soal: JSON.parse(soal) });
    } catch {
      return NextResponse.json({ error: "Parse error" }, { status: 500 });
    }
  } catch (error) {
    console.error("AI soal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
