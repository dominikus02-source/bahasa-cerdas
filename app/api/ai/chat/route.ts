import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";

const AI_TIMEOUT = 15000;
// Kunci khusus AI Cerdik, jatah 30 req/menit tier gratis Groq tidak dibagi
// dengan EYD/Feedback/Grading/Soal yang memakai GROQ_API_KEY bersama.
// Multi-key: env bisa berisi beberapa key dipisah koma (contoh "k1,k2").
// Bearer tidak boleh menyertakan nilai mentah — tiap key dicoba bergantian
// sampai satu berhasil, seperti core provider src/ai/core/provider.ts.
const GROQ_KEYS = (process.env.GROQ_API_KEY_CHAT || process.env.GROQ_API_KEY || "")
  .split(",").map((k) => k.trim()).filter(Boolean);
const DEEPSEEK_KEYS = (process.env.DEEPSEEK_API_KEY || "")
  .split(",").map((k) => k.trim()).filter(Boolean);

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
- Kurikulum Nasional (ATP, Rencana Pembelajaran, HOTS, proyek, diferensiasi)
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
4. Jika user minta RPP/modul/materi ajar → jangan generate di chat. Arahkan: "Semua fitur generate Rencana Pembelajaran dan materi ajar sudah tersedia di dashboard. Yuk, daftar/login dan buka halaman **Rencana Pembelajaran** atau **Materi Ajar** untuk mulai membuat!"
5. Selalu tanyakan klarifikasi jika pertanyaan kurang jelas.
6. Jika user salah → koreksi dengan lembut dan jelaskan kenapa.

**Gaya Jawaban:**
- Mulai dengan sapaan ramah atau pengakuan pertanyaan.
- Gunakan poin-poin atau nomor agar mudah dibaca.
- Berikan contoh konkret.
- Akhiri dengan pertanyaan lanjutan untuk melanjutkan percakapan (kecuali user minta tidak).

Kamu adalah asisten ringan di BahasaCerdas.site — kamu ahli menjelaskan konsep, arti kata, tata bahasa, dan sastra Indonesia. Untuk fitur lanjutan seperti generate Rencana Pembelajaran, bank soal, materi ajar, dan UKBI, arahkan user ke dashboard masing-masing setelah daftar/login. Jangan generate konten panjang di chat.`;

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimitRoute(req, { maxRequests: 20, windowSeconds: 60, identifier: "ai-chat" });
    if (rl) return rl;

    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { message, messages, mode = "murid" } = await req.json();

    let chatHistory = messages
    if (message) {
      chatHistory = [{ role: "user", content: message }]
    }

    if (!chatHistory || !Array.isArray(chatHistory) || chatHistory.length === 0) {
      return NextResponse.json({ reply: "Halo! Ada yang bisa aku bantu?" });
    }

    const modeInstruction = mode === "guru"
      ? "User ini adalah GURU. Berikan penjelasan mendalam, istilah teknis, contoh soal HOTS, dan tawarkan fitur generate Rencana Pembelajaran/soal."
      : "User ini adalah MURID. Gunakan bahasa yang ringan, menyenangkan, dan mudah dipahami. Berikan analogi sederhana. Jangan gunakan istilah yang terlalu rumit.";

    const chatMessages = [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n\n${modeInstruction}`,
      },
      {
        role: "assistant",
        content: "Hai! 👋 Aku AI Cerdik, asisten Bahasa Indonesia. Senang banget bisa bantu kamu belajar! Mau tanya apa hari ini? 😊",
      },
      ...chatHistory.map((msg: any) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      })),
    ];

    let answer = "";
    // Sebab kegagalan tiap penyedia dikumpulkan, bukan cuma di-log. Tanpa ini
    // kegagalan AI selalu tampil sebagai "aku lagi sibuk" dan tidak ada yang
    // tahu apakah penyebabnya kuota habis, kunci mati, atau model dihentikan.
    const sebabGagal: string[] = [];
    let usedProvider = "none";

    // Prioritas: Groq dulu (AI_PROVIDER_PRIORITY=groq, key terverifikasi),
    // DeepSeek sebagai cadangan. Setiap key multi-env dicoba bergantian.
    const providers = [
      {
        name: "groq",
        base: "https://api.groq.com/openai/v1/chat/completions",
        keys: GROQ_KEYS,
        model: "openai/gpt-oss-120b", // llama-3.3-70b-versatile dihentikan — gpt-oss-120b pengganti resmi
        extra: { top_p: 0.95 },
      },
      {
        name: "deepseek",
        base: "https://api.deepseek.com/v1/chat/completions",
        keys: DEEPSEEK_KEYS,
        model: "deepseek-chat",
        extra: {},
      },
    ];

    for (const provider of providers) {
      if (answer || provider.keys.length === 0) continue;
      for (const key of provider.keys) {
        try {
          const res = await fetch(provider.base, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
            body: JSON.stringify({
              model: provider.model,
              messages: chatMessages,
              temperature: 0.7,
              max_tokens: 4096,
              ...provider.extra,
            }),
            signal: AbortSignal.timeout(AI_TIMEOUT),
          });
          if (res.ok) {
            const json = await res.json();
            answer = json?.choices?.[0]?.message?.content || "";
            if (answer) usedProvider = provider.name;
            break;
          }
          // Kuota habis / kunci mati datang sebagai balasan non-OK, BUKAN
          // sebagai error yang dilempar — tanpa cabang ini penyebab paling
          // umum justru yang paling tidak terlihat.
          sebabGagal.push(`${provider.name} ${res.status}: ${(await res.text()).slice(0, 200)}`);
        } catch (e) {
          sebabGagal.push(`${provider.name}: ${e instanceof Error ? e.message : String(e)}`);
          console.error(`${provider.name} error:`, e);
        }
      }
    }

    if (!answer) {
      const bolehLihatSebab = user?.isFounder || user?.role === "ADMIN";
      if (sebabGagal.length === 0) sebabGagal.push("Tidak ada penyedia AI yang aktif (kunci API kosong?)");
      console.error("AI chat gagal total:", sebabGagal.join(" | "));
      return NextResponse.json({
        reply: "Maaf, aku lagi sibuk. Coba tanya lagi ya! 😊",
        // Hanya founder/admin yang melihat sebabnya — murid tetap dapat kalimat
        // yang ramah dan tidak menakutkan.
        ...(bolehLihatSebab ? { diagnosa: sebabGagal } : {}),
      });
    }

    return NextResponse.json({ reply: answer });
  } catch {
    return NextResponse.json({ reply: "Maaf, ada gangguan. Coba lagi ya! 😊" }, { status: 500 });
  }
}
