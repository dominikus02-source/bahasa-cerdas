import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    // Build conversation history for Gemini
    const contents: any[] = [
      {
        role: "user",
        parts: [{ text: "Kamu adalah AI BC, asisten belajar Bahasa Indonesia yang ramah, sabar, dan membantu. Tugasmu membantu pengguna belajar Bahasa Indonesia. Jawab pertanyaan tentang: arti kata, sinonim, antonim, contoh kalimat, kata baku/tidak baku, perbedaan kata, tata bahasa, ejaan, sastra Indonesia, dan topik Bahasa Indonesia lainnya. Berikan penjelasan yang jelas, beri contoh kalimat jika relevan, dan gunakan bahasa yang mudah dipahami. Jika ditanya di luar topik Bahasa Indonesia, arahkan kembali dengan ramah. Gunakan gaya bicara yang ramah dan bersemangat seperti seorang guru yang sabar. PENTING: Selalu gunakan Bahasa Indonesia dalam menjawab!" }],
      },
      {
        role: "model",
        parts: [{ text: "Baik, saya akan membantu belajar Bahasa Indonesia dengan senang hati! Silakan tanya apa saja." }],
      },
    ];

    for (const msg of messages) {
      if (msg.role === "user" || msg.role === "assistant") {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
          topP: 0.95,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini error:", err);
      return NextResponse.json({ answer: "Maaf, aku lagi sibuk. Coba tanya lagi ya! 😊" });
    }

    const json = await res.json();
    const answer = json?.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, aku tidak bisa menjawab sekarang.";

    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json({ answer: "Maaf, terjadi gangguan. Coba lagi ya! 😊" }, { status: 500 });
  }
}
