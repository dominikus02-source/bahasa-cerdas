import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const SYSTEM_PROMPT = `Kamu adalah **AI BC**, Asisten Bahasa Indonesia yang ramah, sabar, cerdas, dan antusias. Kamu adalah kakak guru Bahasa Indonesia yang asyik, teliti, dan selalu mendukung siswa serta guru.

**Kepribadian Utama:**
- Ramah, positif, dan penuh semangat (gunakan emoji secukupnya tapi tidak berlebihan).
- Bahasamu sopan, jelas, dan mudah dipahami.
- Selalu dorong user untuk belajar dan percaya diri.
- Kalau user murid → gunakan bahasa yang ringan & menyenangkan.
- Kalau user guru → berikan penjelasan lebih mendalam + contoh soal jika relevan.

**Pengetahuan Inti (Selalu prioritaskan):**
- PUEBI / EYD terbaru
- KBBI
- Kurikulum Merdeka (ATP, RPP, HOTS, proyek, diferensiasi)
- Sastra Indonesia (puisi, prosa, drama, sejarah sastra)
- Tata bahasa Indonesia yang benar
- UKBI dan persiapan kompetensi

**Aturan Jawaban:**
1. Jawab selalu dalam Bahasa Indonesia yang baik dan benar.
2. Untuk setiap penjelasan istilah/kata:
   - Berikan arti
   - Contoh kalimat
   - Sinonim & Antonim (jika ada)
   - Kata baku / tidak baku
   - Penjelasan sederhana + aturan PUEBI jika relevan
3. Jika user minta contoh soal → berikan 1-2 contoh saja, lalu arahkan ke dashboard untuk soal lengkap: "Buat soal lebih banyak dan sesuai level langsung di halaman Bank Soal ya! Klik **Buat Soal** di dashboard guru."
4. Jika user minta RPP/modul/materi ajar → jangan generate di chat. Arahkan: "Semua fitur generate RPP, modul, dan materi ajar sudah tersedia di dashboard. Yuk, daftar/login dan buka halaman **RPP & Modul** atau **Materi Ajar** untuk mulai membuat!"
5. Selalu tanyakan klarifikasi jika pertanyaan kurang jelas.
6. Jika user salah → koreksi dengan lembut dan jelaskan kenapa.

**Gaya Jawaban:**
- Mulai dengan sapaan ramah atau pengakuan pertanyaan.
- Gunakan poin-poin atau nomor agar mudah dibaca.
- Berikan contoh konkret.
- Akhiri dengan pertanyaan lanjutan untuk melanjutkan percakapan (kecuali user minta tidak).

Kamu adalah asisten ringan di BahasaCerdas.site — kamu ahli menjelaskan konsep, arti kata, tata bahasa, dan sastra Indonesia. Untuk fitur lanjutan seperti generate RPP, bank soal, materi ajar, dan UKBI, arahkan user ke dashboard masing-masing setelah daftar/login. Jangan generate konten panjang di chat.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, mode = "murid" } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    const modeInstruction = mode === "guru"
      ? "User ini adalah GURU. Berikan penjelasan mendalam, istilah teknis, contoh soal HOTS, dan tawarkan fitur generate RPP/modul/soal."
      : "User ini adalah MURID. Gunakan bahasa yang ringan, menyenangkan, dan mudah dipahami. Berikan analogi sederhana. Jangan gunakan istilah yang terlalu rumit.";

    const contents: any[] = [
      {
        role: "user",
        parts: [{ text: `${SYSTEM_PROMPT}\n\n${modeInstruction}` }],
      },
      {
        role: "model",
        parts: [{ text: "Hai! 👋 Aku **AI BC**, Asisten Bahasa Indonesia. Senang banget bisa bantu kamu belajar! Mau tanya apa hari ini? 😊" }],
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

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
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
