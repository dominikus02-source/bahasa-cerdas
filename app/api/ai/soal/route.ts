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
    const { topic, count = 5, type = "PILIHAN_GANDA", difficulty = "MEDIUM", kelas, kd, context, saveToDb = true } = body;

    let contextPrompt = "";
    if (context?.includes("UKBI")) {
      contextPrompt = `
Ini adalah soal UKBI (Uji Kemahiran Berbahasa Indonesia). Format sesuai standar UKBI:
- Seksi: ${context.split("seksi ")[1] || "MENDENGARKAN"}
- Gunakan bahasa Indonesia formal sesuai kaidah
- Soal harus menguji kemahiran berbahasa (tata bahasa, kosakata, pemahaman teks)`;
    } else if (context?.includes("TKA")) {
      contextPrompt = `
Ini adalah soal TKA (Tes Kompetensi Akademik) untuk Guru Bahasa Indonesia:
- Kompetensi: ${context.replace("TKA Guru ", "")}
- Soal harus menguji pengetahuan pedagogik dan profesional guru
- Gunakan konteks pembelajaran Bahasa Indonesia di sekolah`;
    }

    const prompt = `Buatkan ${count} soal ${type === "PILIHAN_GANDA" ? "pilihan ganda" : type.toLowerCase()} Bahasa Indonesia${kelas ? " kelas " + kelas : ""} topik: "${topic}" dengan tingkat kesulitan ${difficulty}.${kd ? ` KD: ${kd}.` : ""}

${contextPrompt}

Format output JSON array:
[
  {
    "text": "pertanyaan",
    "type": "${type}",
    "difficulty": "${difficulty}",
    "options": ["jawaban A", "jawaban B", "jawaban C", "jawaban D"],
    "correctAnswer": "0",
    "explanation": "penjelasan jawaban benar",
    "isHOTS": ${difficulty === "HARD"}
  }
]

Aturan:
- correctAnswer adalah index string: "0" (A), "1" (B), "2" (C), "3" (D)
- Hanya output JSON array, tanpa markdown atau teks lain
- Pastikan soal berkualitas dan sesuai konteks

Hanya output JSON array.`;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    let content = "";
    let provider = "";
    const errors: string[] = [];

    if (GROQ_API_KEY) {
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
        });
        const json = await res.json();
        if (json.error) {
          errors.push(`Groq: ${json.error.message || json.error}`);
        } else {
          content = json.choices?.[0]?.message?.content || "";
          if (content) provider = "groq";
        }
      } catch (e: any) { errors.push(`Groq: ${e.message}`); }
    } else {
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
        });
        const json = await res.json();
        if (json.error) {
          errors.push(`Gemini: ${json.error.message || json.error}`);
        } else {
          content = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (content) provider = "gemini";
        }
      } catch (e: any) { errors.push(`Gemini: ${e.message}`); }
    } else if (!content) {
      errors.push("Gemini: No API key");
    }

    if (!content && OPENAI_API_KEY) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 4000,
            temperature: 0.7,
          }),
        });
        const json = await res.json();
        if (json.error) {
          errors.push(`OpenAI: ${json.error.message || json.error}`);
        } else {
          content = json.choices?.[0]?.message?.content || "";
          if (content) provider = "openai";
        }
      } catch (e: any) { errors.push(`OpenAI: ${e.message}`); }
    } else if (!content) {
      errors.push("OpenAI: No API key");
    }

    if (!content && DEEPSEEK_API_KEY) {
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
        });
        const json = await res.json();
        if (json.error) {
          errors.push(`DeepSeek: ${json.error.message || json.error}`);
        } else {
          content = json.choices?.[0]?.message?.content || "";
          if (content) provider = "deepseek";
        }
      } catch (e: any) { errors.push(`DeepSeek: ${e.message}`); }
    } else if (!content) {
      errors.push("DeepSeek: No API key");
    }

    if (!content) {
      console.error("All AI providers failed:", errors);
      return NextResponse.json({ error: `Semua AI provider gagal: ${errors.join("; ")}. Tambahkan GROQ_API_KEY (gratis di console.groq.com) atau enable billing di Google Cloud/OpenAI.` }, { status: 500 });
    }

    let soal = content;
    if (soal.includes("```json")) {
      soal = soal.replace(/```json\n?/g, "").replace(/\n?```/g, "");
    }

    const tokens = content.length;
    const costUSD = (tokens / 1_000_000) * 0.5;
    await recordAIUsage(user.id, "soal_generator", tokens, costUSD);

    try {
      const parsedSoal = JSON.parse(soal);
      const soalArray = Array.isArray(parsedSoal) ? parsedSoal : [parsedSoal];

      if (saveToDb && user) {
        const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
        if (dbUser) {
          const savedSoals = await db.soal.createMany({
            data: soalArray.map((s: any) => ({
              text: s.text || "",
              type: s.type || type,
              difficulty: s.difficulty || difficulty,
              options: s.options || [],
              correctAnswer: String(s.correctAnswer || "0"),
              explanation: s.explanation || null,
              isHOTS: s.isHOTS || difficulty === "HARD",
              kelas: kelas || "10",
              topik: topic || null,
              KD: kd || null,
              subject: "Bahasa Indonesia",
              source: "AI",
              uploaderId: dbUser.id,
            })),
          });

          const savedList = await db.soal.findMany({
            where: { uploaderId: dbUser.id },
            orderBy: { createdAt: "desc" },
            take: savedSoal.count,
          });

          return NextResponse.json({ soal: savedList, saved: savedSoal.count });
        }
      }

      return NextResponse.json({ soal: soalArray, saved: 0 });
    } catch {
      return NextResponse.json({ error: "Parse error", raw: content.slice(0, 200) }, { status: 500 });
    }
  } catch (error) {
    console.error("AI soal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
