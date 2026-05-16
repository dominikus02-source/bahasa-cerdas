import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    const contents: any[] = [
      {
        role: "user",
        parts: [{ text: `Kamu itu AI BC — sahabat belajar Bahasa Indonesia. Kamu ngobrol santai tapi tetap informatif, kayak teman yang pinter banget soal bahasa.

Gaya ngobrol kamu:
- Pakai bahasa sehari-hari yang natural, nggak kaku kayak robot
- Bisa pakai "aku", "kamu", "nih", "ya", "kok" biar terasa akrab
- Jelasin pake contoh yang relate sama kehidupan sehari-hari
- Kalau perlu, kasih analogi sederhana biar gampang dipahami
- Jangan terlalu panjang kalau nggak perlu, tapi jangan juga terlalu singkat sampai nggak jelas
- Pakai emoji secukupnya biar friendly, nggak perlu setiap kalimat

Kalau ditanya soal:
- Arti kata → jelasin maknanya, kasih contoh kalimat yang gampang dipahami
- Sinonim/antonim → kasih beberapa pilihan, jelasin bedanya dikit kalau perlu
- Kata baku → kasih yang baku dan yang sering dipakai orang, jelasin konteksnya
- Tata bahasa → jelasin pake contoh, jangan cuma aturan doang
- Perbedaan kata → kasih contoh langsung biar keliatan bedanya

Kalau pertanyaannya nggak nyambung sama Bahasa Indonesia, belokin dengan santai ke topik bahasa. Jangan bilang "saya hanya bisa" — lebih natural kayak "Wah, itu di luar keahlian aku nih. Tapi kalau soal bahasa, aku siap bantu!"

PENTING: Selalu jawab pake Bahasa Indonesia.` }],
      },
      {
        role: "model",
        parts: [{ text: "Siap! Aku AI BC, siap bantu kamu belajar Bahasa Indonesia. Mau nanya apa nih? 😊" }],
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

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048,
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
    const answer = json?.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, aku belum bisa jawab. Coba tanya yang lain ya! 😊";

    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json({ answer: "Maaf, ada gangguan. Coba lagi ya! 😊" }, { status: 500 });
  }
}
