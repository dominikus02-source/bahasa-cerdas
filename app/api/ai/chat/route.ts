import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "Kamu adalah AI BC, asisten belajar Bahasa Indonesia yang ramah, sabar, dan membantu. " +
              "Tugasmu membantu pengguna belajar Bahasa Indonesia. " +
              "Jawab pertanyaan tentang: arti kata, sinonim, antonim, contoh kalimat, kata baku/tidak baku, perbedaan kata, " +
              "tata bahasa, ejaan, sastra Indonesia, dan topik Bahasa Indonesia lainnya. " +
              "Berikan penjelasan yang jelas, beri contoh kalimat jika relevan, dan gunakan bahasa yang mudah dipahami. " +
              "Jika ditanya di luar topik Bahasa Indonesia, arahkan kembali dengan ramah. " +
              "Gunakan gaya bicara yang ramah dan bersemangat seperti seorang guru yang sabar.",
          },
          ...messages,
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    const json = await res.json();
    const answer = json.choices?.[0]?.message?.content || "Maaf, aku tidak bisa menjawab sekarang.";

    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json({ answer: "Maaf, terjadi gangguan. Coba lagi ya!" }, { status: 500 });
  }
}
