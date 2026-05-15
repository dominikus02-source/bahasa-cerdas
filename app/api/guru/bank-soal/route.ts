import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createClient } from "@supabase/supabase-js";

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

    // Upload file to storage
    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const fileName = `banksoal/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { error: uploadError } = await supabase.storage.from("documents").upload(fileName, file, { upsert: true, contentType: file.type });
    if (uploadError) return NextResponse.json({ error: "Upload file gagal" }, { status: 500 });

    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(fileName);

    // Save as bank soal entry
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

    // Try to extract questions using Gemini AI
    let extractedCount = 0;
    try {
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      if (GEMINI_API_KEY) {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-goog-api-key": GEMINI_API_KEY },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: `Ekstrak soal-soal dari file bank soal berikut. Buatkan output JSON array dengan format: [{ "text": "pertanyaan", "options": ["A", "B", "C", "D"], "correctAnswer": "0", "difficulty": "MEDIUM", "isHOTS": false }]. Hanya output JSON, tanpa markdown.\n\nJudul: ${file.name}\nKelas: ${kelas}\nKD: ${kd}` }]
            }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
          }),
        });
        const json = await res.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          const questions = JSON.parse(match[0]);
          for (const q of questions) {
            await db.bankSoal.create({
              data: {
                title: q.text?.slice(0, 100) || "Soal",
                text: q.text,
                type: "PILIHAN_GANDA",
                difficulty: q.difficulty || "MEDIUM",
                options: q.options || [],
                correctAnswer: q.correctAnswer || "",
                isHOTS: q.isHOTS || false,
                kelas,
                subject,
                isPublished: true,
                uploaderId: user.id,
              },
            });
            extractedCount++;
          }
        }
      }
    } catch {}

    return NextResponse.json({
      success: true,
      file: { url: urlData.publicUrl, name: file.name },
      soalTerdeteksi: extractedCount,
      pesan: extractedCount > 0 ? `${extractedCount} soal berhasil diekstrak` : "File tersimpan. Ekstrak soal manual atau gunakan AI.",
    });
  } catch {
    return NextResponse.json({ error: "Gagal memproses file" }, { status: 500 });
  }
}
