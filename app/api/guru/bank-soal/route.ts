import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createClient } from "@supabase/supabase-js";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== "GURU") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const kelas = formData.get("kelas") as string || "";
    const kd = formData.get("kd") as string || "";
    const subject = formData.get("subject") as string || "Bahasa Indonesia";

    if (!file) return NextResponse.json({ error: "File diperlukan" }, { status: 400 });

    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const allowedExts = ["pdf", "docx"];
    if (!allowedExts.includes(ext)) {
      return NextResponse.json({ error: "Format file tidak didukung. Gunakan PDF atau DOCX." }, { status: 400 });
    }

    // Extract text content from file
    let fileText = "";
    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      if (ext === "pdf") {
        const pdfData = await pdfParse(buffer);
        fileText = pdfData.text;
      } else if (ext === "docx") {
        const result = await mammoth.extractRawText({ buffer });
        fileText = result.value;
      }
    } catch (extractError) {
      console.error("File extraction error:", extractError);
      fileText = "";
    }

    // Upload file to storage
    const fileName = `banksoal/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { error: uploadError } = await supabase.storage.from("documents").upload(fileName, file, { upsert: true, contentType: file.type });
    if (uploadError) return NextResponse.json({ error: "Upload file gagal" }, { status: 500 });

    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(fileName);

    // Save as bank soal entry (the file record)
    const bankSoal = await db.bankSoal.create({
      data: {
        title: file.name.replace(/\.[^/.]+$/, ""),
        type: "UPLOAD",
        difficulty: "MEDIUM",
        kelas,
        fileUrl: urlData.publicUrl,
        fileKey: fileName,
        fileType: ext === "pdf" ? "PDF" : "DOCX" as any,
        isPublished: true,
        subject,
        uploaderId: user.id,
      },
    });

    // Try to extract questions using Gemini AI with actual file content
    let extractedQuestions: any[] = [];
    if (fileText && fileText.length > 50) {
      try {
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (GEMINI_API_KEY) {
          const prompt = `Ekstrak soal-soal dari teks berikut. Buatkan output JSON array dengan format:
[{
  "text": "pertanyaan",
  "options": ["A. opsi1", "B. opsi2", "C. opsi3", "D. opsi4"],
  "correctAnswer": "0",
  "explanation": "penjelasan jawaban",
  "difficulty": "MEDIUM",
  "isHOTS": false
}]

Aturan:
- correctAnswer adalah index (0=A, 1=B, 2=C, 3=D)
- Hanya output JSON array, tanpa markdown atau teks lain
- Jika tidak ada opsi, biarkan options kosong dan type jadi "ESSAY"

TEKS FILE:
${fileText.slice(0, 8000)}`;

          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-goog-api-key": GEMINI_API_KEY },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 4000 },
            }),
          });
          const json = await res.json();
          const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const match = text.match(/\[[\s\S]*\]/);
          if (match) {
            extractedQuestions = JSON.parse(match[0]);
          }
        }
      } catch (aiError) {
        console.error("AI extraction error:", aiError);
      }
    }

    // Save extracted questions to DB
    let savedCount = 0;
    for (const q of extractedQuestions) {
      try {
        await db.bankSoal.create({
          data: {
            title: (q.text || "Soal").slice(0, 100),
            text: q.text || "",
            type: q.options?.length ? "PILIHAN_GANDA" : "ESSAY",
            difficulty: q.difficulty || "MEDIUM",
            options: q.options || [],
            correctAnswer: String(q.correctAnswer || ""),
            explanation: q.explanation || "",
            isHOTS: q.isHOTS || false,
            kelas,
            subject,
            isPublished: true,
            uploaderId: user.id,
          },
        });
        savedCount++;
      } catch (saveError) {
        console.error("Failed to save extracted question:", saveError);
      }
    }

    return NextResponse.json({
      success: true,
      file: { url: urlData.publicUrl, name: file.name },
      soalTerdeteksi: savedCount,
      extractedQuestions: extractedQuestions,
      pesan: savedCount > 0
        ? `${savedCount} soal berhasil diekstrak dan disimpan`
        : fileText
          ? "File tersimpan. AI tidak bisa mengekstrak soal otomatis. Silakan tambahkan manual."
          : "File tersimpan. Tidak bisa membaca konten file.",
    });
  } catch (error) {
    console.error("Bank soal upload error:", error);
    return NextResponse.json({ error: "Gagal memproses file" }, { status: 500 });
  }
}
