import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { checkAIQuota, recordAIUsage } from "@/lib/premium";
import { rateLimitRoute } from "@/lib/rate-limit";
import { isTeacherOrStudent } from "@/lib/teacher/students";
import { validateAgentOutput, cleanJSONOutput } from "@/src/ai/core/output-validator";

const THEMES = [
  "SPOK", "Kalimat Efektif", "Cerpen", "Puisi", "Pantun",
  "Teks Deskripsi", "Teks Prosedur", "Teks Eksplanasi", "Teks Persuasi",
  "Teks Argumentasi", "Teks Eksposisi", "Teks Berita", "Fabel", "Legenda",
  "Hikayat", "Drama", "Surat Dinas", "Surat Pribadi", "Iklan", "Poster",
  "Resensi", "Novel", "Majas", "EYD/PUEBI", "Imbuhan", "Sinonim", "Antonim",
  "Paragraf", "Ide Pokok", "Makna Kata",
];

const THEME_KEYWORDS: Record<string, string> = {
  "SPOK": "Subjek, Predikat, Objek, Keterangan — identifikasi unsur kalimat",
  "Kalimat Efektif": "Kalimat efektif, kalimat tidak efektif, perbaikan kalimat, kehematan, kesejajaran",
  "Cerpen": "Cerita pendek, unsur intrinsik, alur, tokoh, latar, amanat, sudut pandang",
  "Puisi": "Puisi, rima, irama, diksi, majas, tema puisi, larik, bait",
  "Pantun": "Pantun, sampiran, isi, rima a-b-a-b, pantun nasihat, pantun jenaka",
  "Teks Deskripsi": "Teks deskripsi, objek, ciri-ciri, kalimat perincian, majas personifikasi",
  "Teks Prosedur": "Teks prosedur, langkah-langkah, tujuan, alat dan bahan, verba material",
  "Teks Eksplanasi": "Teks eksplanasi, fenomena alam, hubungan kausal, proses terjadinya",
  "Teks Persuasi": "Teks persuasi, ajakan, opini, fakta, kalimat persuasif, kata ajakan",
  "Teks Argumentasi": "Teks argumentasi, argumen pro kontra, data pendukung, kesimpulan",
  "Teks Eksposisi": "Teks eksposisi, tesis, argumentasi, penegasan ulang, fakta",
  "Teks Berita": "Teks berita, 5W+1H, unsur berita, fakta, opini, kepala berita",
  "Fabel": "Fabel, tokoh hewan, pesan moral, alur, karakterisasi",
  "Legenda": "Legenda, cerita rakyat, asal-usul, tokoh mitos, pesan moral",
  "Hikayat": "Hikayat, sastra Melayu klasik, istana sentris, kemustahilan, tokoh",
  "Drama": "Drama, dialog, monolog, prolog, epilog, babak, adegan, naskah drama",
  "Surat Dinas": "Surat dinas, kop surat, nomor surat, lampiran, hal, bahasa formal",
  "Surat Pribadi": "Surat pribadi, salam pembuka, isi, penutup, bahasa santun",
  "Iklan": "Iklan, slogan, poster, kalimat persuasif, gambar, media cetak elektronik",
  "Poster": "Poster, pesan visual, tipografi, ilustrasi, ajakan, tema",
  "Resensi": "Resensi, identitas buku, sinopsis, kelebihan, kekurangan, rekomendasi",
  "Novel": "Novel, unsur intrinsik, ekstrinsik, tema, penokohan, latar, alur",
  "Majas": "Majas, personifikasi, metafora, hiperbola, litotes, ironi, simile",
  "EYD/PUEBI": "EYD edisi V, penulisan kata, tanda baca, huruf kapital, kata baku",
  "Imbuhan": "Imbuhan, prefiks, sufiks, infiks, konfiks, kata berimbuhan, morfem",
  "Sinonim": "Sinonim, persamaan kata, padanan kata, nuansa makna",
  "Antonim": "Antonim, lawan kata, oposisi makna, pasangan antonim",
  "Paragraf": "Paragraf, gagasan utama, kalimat utama, kalimat penjelas, pengembangan",
  "Ide Pokok": "Ide pokok, gagasan utama, pikiran utama, kalimat inti",
  "Makna Kata": "Makna kata, makna denotatif, konotatif, makna leksikal, makna gramatikal",
};

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || !isTeacherOrStudent(dbUser)) return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const tema = searchParams.get("tema");
    const kelas = searchParams.get("kelas");
    const search = searchParams.get("search");

    const where: any = { creatorId: dbUser.id, type: "LATIHAN" };
    if (tema) where.topik = tema;
    if (kelas) where.kelas = kelas;
    if (search) where.title = { contains: search, mode: "insensitive" };

    const latihans = await db.quiz.findMany({
      where,
      include: {
        _count: { select: { questions: true, assignments: true } },
        assignments: {
          include: {
            _count: { select: { submissions: true } },
            submissions: {
              where: { status: "SUBMITTED" },
              select: { score: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    const result = latihans.map(l => {
      const totalSubmitted = l.assignments.reduce((s, a) => s + a._count.submissions, 0);
      const allScores: number[] = l.assignments.flatMap(a =>
        a.submissions.map(s => s.score).filter((s): s is number => s !== null && s !== undefined)
      );
      const avgScore = allScores.length > 0
        ? Math.round(allScores.reduce((sum, s) => sum + s, 0) / allScores.length)
        : null;
      const totalAssignments = l.assignments.length;

      return {
        id: l.id,
        title: l.title,
        topik: l.topik,
        kelas: l.kelas,
        difficulty: l.difficulty,
        totalSoal: l._count.questions,
        totalAssignments,
        totalSubmitted,
        avgScore,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      };
    });

    const distinctKelas = await db.quiz.findMany({
      where: { creatorId: dbUser.id, type: "LATIHAN" },
      select: { kelas: true },
      distinct: ["kelas"],
    });

    const distinctTema = await db.quiz.findMany({
      where: { creatorId: dbUser.id, type: "LATIHAN" },
      select: { topik: true },
      distinct: ["topik"],
    });

    return NextResponse.json({
      latihans: result,
      kelasList: distinctKelas.map(k => k.kelas).filter(Boolean),
      temaList: distinctTema.map(t => t.topik).filter(Boolean),
      themes: THEMES,
    });
  } catch (error) {
    console.error("GET /api/guru/latihan error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function savePickedSoals(
  dbUser: { id: string },
  tema: string,
  kelas: string,
  judul: string | undefined,
  pickedSoals: any[]
) {
  try {
    const count = pickedSoals.length;
    const soalIds = pickedSoals.map((s: any) => s.id).filter(Boolean);

    // Update usedCount for analytics
    await db.soal.updateMany({
      where: { id: { in: soalIds } },
      data: { usedCount: { increment: 1 } },
    });

    const quiz = await db.quiz.create({
      data: {
        title: judul || `Latihan: ${tema}`,
        description: `Latihan ${tema} kelas ${kelas} — ${count} soal (dari Bank Soal)`,
        type: "LATIHAN",
        status: "PUBLISHED",
        kelas,
        subject: "Bahasa Indonesia",
        topik: tema,
        shuffleQuestions: true,
        shuffleOptions: true,
        showResults: true,
        showCorrectAnswer: true,
        maxAttempts: 0,
        creatorId: dbUser.id,
        questions: {
          create: pickedSoals.map((s, idx) => ({
            sourceType: "SOAL",
            sourceId: s.id,
            orderIndex: idx,
            points: 1,
          })),
        },
      },
      include: { _count: { select: { questions: true } } },
    });

    return NextResponse.json({
      success: true,
      quiz: { id: quiz.id, title: quiz.title, topik: quiz.topik, kelas: quiz.kelas, totalSoal: quiz._count.questions },
      soal: pickedSoals.map((s: any) => ({
        id: s.id,
        text: s.text,
        options: s.options,
        correctAnswer: s.correctAnswer,
        explanation: s.explanation,
      })),
    }, { status: 201 });
  } catch (error) {
    console.error("savePickedSoals error:", error);
    return NextResponse.json({ error: "Gagal menyimpan soal dari bank" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimitRoute(req, { maxRequests: 20, windowSeconds: 60, identifier: "latihan-create" });
    if (rl) return rl;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || !isTeacherOrStudent(dbUser)) return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const { tema, kelas, jumlahSoal = 10, difficulty = "MEDIUM", judul, _skipAI, _pickedSoals } = await req.json();

    if (!tema || !kelas) {
      return NextResponse.json({ error: "Tema dan kelas wajib diisi" }, { status: 400 });
    }

    if (_skipAI && Array.isArray(_pickedSoals) && _pickedSoals.length > 0) {
      return await savePickedSoals(dbUser, tema, kelas, judul, _pickedSoals);
    }

    const quota = await checkAIQuota(dbUser, "soal");
    if (!quota.allowed) {
      return NextResponse.json({ error: "QUOTA_EXCEEDED", used: quota.used, limit: quota.limit }, { status: 429 });
    }

    const count = Math.min(Math.max(jumlahSoal, 5), 30);
    const keywordPrompt = THEME_KEYWORDS[tema] || tema;

    const prompt = `Buatkan ${count} soal pilihan ganda Bahasa Indonesia kelas ${kelas} dengan tema "${tema}".

Konteks: ${keywordPrompt}

Setiap soal harus:
1. Memiliki 4 opsi jawaban (A, B, C, D)
2. Satu jawaban benar
3. Pembahasan/s explanation yang jelas
4. Sesuai tingkat kesulitan ${difficulty}
5. Menggunakan bahasa Indonesia yang baik dan benar

Format output JSON array:
[
  {
    "text": "pertanyaan lengkap",
    "options": ["option A", "option B", "option C", "option D"],
    "correctAnswer": "0",
    "explanation": "penjelasan jawaban benar"
  }
]

Aturan:
- correctAnswer adalah index string: "0" (A), "1" (B), "2" (C), "3" (D)
- Hanya output JSON array, tanpa markdown atau teks lain
- Pastikan soal berkualitas, tidak ambigu, dan sesuai tema "${tema}"
- Jumlah soal WAJIB ${count} soal

Hanya output JSON array.`;

    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    let content = "";
    let provider = "";
    const errors: string[] = [];
    const AI_TIMEOUT = 30000;

    if (DEEPSEEK_API_KEY) {
      try {
        const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${DEEPSEEK_API_KEY}` },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 8000,
            temperature: 0.7,
          }),
          signal: AbortSignal.timeout(AI_TIMEOUT),
        });
        const json = await res.json();
        if (json.error) {
          errors.push(`DeepSeek: ${json.error.message || json.error}`);
        } else {
          content = json.choices?.[0]?.message?.content || "";
          if (content) provider = "deepseek";
        }
      } catch (e: any) { errors.push(`DeepSeek: ${e.message}`); }
    } else {
      errors.push("DeepSeek: No API key");
    }

    if (!content && GROQ_API_KEY) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
          body: JSON.stringify({
            model: "openai/gpt-oss-20b",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 8000,
            temperature: 0.7,
          }),
          signal: AbortSignal.timeout(AI_TIMEOUT),
        });
        const json = await res.json();
        if (json.error) {
          errors.push(`Groq: ${json.error.message || json.error}`);
        } else {
          content = json.choices?.[0]?.message?.content || "";
          if (content) provider = "groq";
        }
      } catch (e: any) { errors.push(`Groq: ${e.message}`); }
    } else if (!content) {
      errors.push("Groq: No API key");
    }

    if (!content && GEMINI_API_KEY) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-goog-api-key": GEMINI_API_KEY },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 8000 },
          }),
          signal: AbortSignal.timeout(AI_TIMEOUT),
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

    if (!content) {
      return NextResponse.json({ error: `Semua AI provider gagal: ${errors.join("; ")}.` }, { status: 500 });
    }

    const tokens = content.length;
    const costUSD = (tokens / 1_000_000) * 0.5;

    // Credit logging deferred to after successful persist (Step 9 — credit safety)

    let parsedRaw: unknown;
    try {
      const { cleaned } = cleanJSONOutput(content);
      parsedRaw = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Gagal memproses output AI — format tidak valid" },
        { status: 500 }
      );
    }

    const rawArray = Array.isArray(parsedRaw) ? parsedRaw : [parsedRaw];

    if (rawArray.length === 0) {
      return NextResponse.json(
        { error: "AI tidak menghasilkan soal apapun" },
        { status: 422 }
      );
    }

    // Normalize to validateSoalOutput shape (Pipeline A contract)
    const normalizedForValidation = {
      title: `Latihan: ${tema}`,
      metadata: {
        subject: "Bahasa Indonesia",
        grade: kelas,
        topic: tema,
        difficulty,
        questionCount: rawArray.length,
      },
      questions: rawArray.map((s: any, idx: number) => ({
        number: idx + 1,
        type: "pilihan_ganda",
        question: String(s.text || ""),
        options: Array.isArray(s.options) ? s.options : [],
        answer: String(s.correctAnswer ?? ""),
        explanation: String(s.explanation || ""),
        difficulty: difficulty === "HARD" || difficulty === "VERY_HARD" ? "sulit" : difficulty === "EASY" || difficulty === "MUDAH" ? "mudah" : "sedang",
        bloomLevel: "C2",
        learningObjective: "",
      })),
      answerKeyText: "",
      teacherNotes: [],
      editableText: rawArray.map((s: any, i: number) =>
        `${i + 1}. ${s.text || ""}\nJawaban: ${s.correctAnswer ?? ""}\nPenjelasan: ${s.explanation || ""}`
      ).join("\n\n"),
    };

    const validation = validateAgentOutput("soal", normalizedForValidation);

    if (!validation || validation.status === "invalid") {
      return NextResponse.json(
        { error: "Output AI tidak memenuhi standar kualitas", issues: validation?.issues ?? ["Validasi output gagal"] },
        { status: 422 }
      );
    }

    // Map normalized questions back to Pipeline B soal shape for persistence
    const soalData = normalizedForValidation.questions
      .filter((q) => q.question.trim().length > 0 && q.options.length >= 2 && q.answer.trim().length > 0)
      .map((q) => ({
        text: q.question,
        type: "PILIHAN_GANDA" as const,
        difficulty,
        options: q.options,
        correctAnswer: q.answer,
        explanation: q.explanation || null,
        isHOTS: difficulty === "HARD" || difficulty === "VERY_HARD",
        kelas,
        topik: tema,
        subject: "Bahasa Indonesia",
        source: "AI",
        uploaderId: dbUser.id,
      }));

    const createdSoals = await db.soal.createManyAndReturn({
      data: soalData,
    });

    // Step 9: Credit logging AFTER successful persist (prevents double-charge on failure)
    await recordAIUsage(dbUser.id, "soal_generator", tokens, costUSD);

    const quiz = await db.quiz.create({
      data: {
        title: judul || `Latihan: ${tema}`,
        description: `Latihan ${tema} kelas ${kelas} — ${createdSoals.length} soal validated`,
        type: "LATIHAN",
        status: "PUBLISHED",
        kelas,
        subject: "Bahasa Indonesia",
        topik: tema,
        difficulty: difficulty as any,
        shuffleQuestions: true,
        shuffleOptions: true,
        showResults: true,
        showCorrectAnswer: true,
        maxAttempts: 0,
        creatorId: dbUser.id,
        questions: {
          create: createdSoals.map((s, idx) => ({
            sourceType: "SOAL",
            sourceId: s.id,
            orderIndex: idx,
            points: 1,
          })),
        },
      },
      include: {
        _count: { select: { questions: true } },
      },
    });

    return NextResponse.json({
      success: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        topik: quiz.topik,
        kelas: quiz.kelas,
        totalSoal: quiz._count.questions,
      },
      soal: createdSoals.map(s => ({
        id: s.id,
        text: s.text,
        options: s.options,
        correctAnswer: s.correctAnswer,
        explanation: s.explanation,
      })),
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/guru/latihan error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
