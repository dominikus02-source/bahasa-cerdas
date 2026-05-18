import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import pptxgen from "pptxgenjs";

// Daftar email admin yang diizinkan (tambahkan email admin di sini)
const ALLOWED_ADMIN_EMAILS = [
  "alexsurya1968@gmail.com",
  "hdsastra47@gmail.com",
  "dominikus.02@gmail.com",
];

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    
    // Cek apakah user adalah admin (berdasarkan role, isFounder, atau email)
    const isAdmin = dbUser?.role === "ADMIN" || 
                    dbUser?.isFounder === true || 
                    ALLOWED_ADMIN_EMAILS.includes(user.email || "");

    if (!isAdmin) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { title, grade, topik, jumlahSlide = 10, kurikulum = "MERDEKA" } = body;

    if (!title || !topik) {
      return NextResponse.json({ error: "Judul dan topik wajib diisi" }, { status: 400 });
    }

    // Generate PPT content using AI with deep research
    const prompt = `Kamu adalah ahli pendidikan Bahasa Indonesia DAN peneliti akademik yang membuat materi pembelajaran profesional berbasis riset.

TUGAS: Lakukan RISET MENDALAM terlebih dahulu, kemudian buatkan konten presentasi PPT.

PARAMETER MATERI:
JUDUL: ${title}
TOPIK: ${topik}
KELAS: ${grade}
KURIKULUM: ${kurikulum}
JUMLAH SLIDE: ${jumlahSlide}

LANGKAH 1 - RISET MENDALAM:
Sebelum membuat slide, lakukan riset internal tentang:
1. Kompetensi Dasar (KD) yang relevan untuk topik ini sesuai Kurikulum Merdeka
2. Capaian Pembelajaran (CP) untuk fase kelas ${grade}
3. Materi esensial yang WAJIB diajarkan berdasarkan kurikulum resmi Kemendikbud
4. Contoh-contoh aktual dan relevan untuk siswa kelas ${grade}
5. Kesalahan umum siswa dalam memahami topik ini
6. Pendekatan pedagogis yang tepat (model pembelajaran, metode, strategi)
7. Asesmen yang sesuai untuk mengukur pemahaman
8. Keterkaitan dengan Profil Pelajar Pancasila

LANGKAH 2 - CARI GAMBAR PENDUKUNG:
Untuk setiap slide materi, cari/sarankan gambar gratis dari sumber bebas copyright:
- Unsplash: https://unsplash.com/s/photos/[keyword]
- Pexels: https://www.pexels.com/search/[keyword]/
- Pixabay: https://pixabay.com/images/search/[keyword]/
- Freepik: https://www.freepik.com/free-photos-vectors/[keyword]

Saran gambar yang relevan untuk setiap slide (gunakan keyword yang tepat).

LANGKAH 3 - BUAT CONTOH IMPLEMENTASI:
Sertakan CONTOH PENGGUNAAN MATERI yang konkret:
- Contoh soal/latihan yang bisa langsung digunakan
- Aktivitas kelas yang interaktif
- Studi kasus nyata
- Proyek mini yang bisa dikerjakan siswa
- Rubrik penilaian sederhana

LANGKAH 4 - BUAT STRUKTUR PRESENTASI:
Berdasarkan hasil riset, buat struktur slide yang logis:

1. Slide Judul (Judul, Subjudul, Kelas, Kurikulum)
2. Slide Tujuan Pembelajaran (3-4 tujuan berdasarkan CP/KD)
3. Slide Apersepsi/Pengantar (Pertanyaan pemantik + gambar pendukung)
4-${jumlahSlide - 4}. Slide Materi Utama:
   - Penjelasan konsep dengan bahasa yang sesuai level kelas
   - Contoh-contoh konkret dan kontekstual
   - GAMBAR PENDUKUNG (saran URL dari Unsplash/Pexels/Pixabay)
   - CONTOH IMPLEMENTASI (soal/aktivitas/proyek)
   - Latihan/aktivitas interaktif
${jumlahSlide - 2}. Slide Rangkuman (Poin-poin kunci dari riset)
${jumlahSlide - 1}. Slide Contoh Implementasi (Ringkasan contoh penggunaan)
${jumlahSlide}. Slide Penutup (Kesimpulan, Tugas, Referensi)

PANDUAN KONTEN BERDASARKAN RISET:
- Gunakan kosakata yang sesuai dengan level kognitif kelas ${grade}
- Sertakan contoh dari kehidupan sehari-hari siswa
- Berikan penjelasan yang mendalam tapi tidak berbelit
- Sertakan tips mengajar untuk guru di catatan presenter
- Referensikan sumber belajar resmi (buku paket, modul Kemendikbud)

FORMAT OUTPUT JSON:
{
  "risetSummary": "Ringkasan hasil riset (2-3 kalimat)",
  "kompetensiDasar": ["KD 1", "KD 2"],
  "capaianPembelajaran": "CP yang relevan",
  "sumberGambar": {
    "unsplash": "https://unsplash.com/s/photos/[keyword-topik]",
    "pexels": "https://www.pexels.com/search/[keyword-topik]/",
    "pixabay": "https://pixabay.com/images/search/[keyword-topik]/"
  },
  "contohImplementasi": {
    "latihanKelas": ["Contoh latihan 1", "Contoh latihan 2"],
    "aktivitasInteraktif": ["Aktivitas 1", "Aktivitas 2"],
    "proyekMini": "Deskripsi proyek mini yang bisa dikerjakan siswa",
    "rubrikPenilaian": "Rubrik sederhana untuk menilai hasil belajar"
  },
  "slides": [
    {
      "type": "title|content|bullet|image|summary|closing|implementation",
      "title": "Judul slide",
      "subtitle": "Subjudul (opsional)",
      "content": "Konten utama (untuk slide content)",
      "bullets": ["Poin 1", "Poin 2", "Poin 3"],
      "imageSuggestion": {
        "keyword": "keyword untuk cari gambar",
        "unsplashUrl": "https://unsplash.com/s/photos/[keyword]",
        "description": "Deskripsi gambar yang cocok"
      },
      "contohImplementasi": "Contoh penggunaan materi (soal/aktivitas/proyek)",
      "notes": "Catatan presenter (tips mengajar, penjelasan tambahan, referensi)"
    }
  ]
}

PASTIKAN:
✅ Konten AKURAT berdasarkan kurikulum resmi Kemendikbud
✅ Contoh RELEVAN untuk kehidupan siswa kelas ${grade}
✅ Bahasa Indonesia yang baik, benar, dan sesuai level kelas
✅ Slide tidak terlalu padat (max 5-6 poin per slide)
✅ Catatan presenter berisi TIPS MENGAJAR dan penjelasan mendalam
✅ Ada aktivitas/latihan interaktif untuk siswa
✅ Referensi sumber belajar resmi

PENTING: Output HANYA JSON valid. Jangan ada teks penjelasan sebelum atau sesudah JSON. Jangan gunakan markdown code block.`;

    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
    }

    let aiContent = "";
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 8000,
          temperature: 0.7,
        }),
      });
      const json = await res.json();
      aiContent = json.choices?.[0]?.message?.content || "";
    } catch (e) {
      console.error("AI generation failed:", e);
      return NextResponse.json({ error: "Gagal generate konten AI" }, { status: 500 });
    }

    // Parse AI content
    let pptData;
    try {
      let cleaned = aiContent;
      
      // Try to extract JSON from markdown code blocks
      const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        cleaned = jsonMatch[1];
      } else {
        // If no code blocks, try to find the first { and last }
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
      }
      
      // Remove any remaining markdown or comments
      cleaned = cleaned.replace(/\/\/.*$/gm, ''); // Remove single line comments
      cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments
      
      pptData = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse AI content:", aiContent);
      console.error("Parse error:", e);
      return NextResponse.json({ error: "Gagal parse konten AI. Coba lagi atau periksa log server." }, { status: 500 });
    }

    // Generate PPTX file
    const pres = new pptxgen();

    // Set metadata
    pres.author = "BahasaCerdas";
    pres.company = "BahasaCerdas";
    pres.subject = title;
    pres.title = title;

    // Define theme colors
    const COLORS = {
      primary: "DC2626", // Red
      secondary: "1E3A8A", // Blue
      accent: "F59E0B", // Amber
      text: "1F2937",
      lightBg: "F9FAFB",
      white: "FFFFFF",
    };

    // Define master slides
    pres.defineSlideMaster({
      title: "MASTER_SLIDE",
      background: { color: COLORS.white },
      objects: [
        // Header bar
        { rect: { x: 0, y: 0, w: "100%", h: 0.6, fill: { color: COLORS.primary } } },
        // Logo text
        { text: { text: "BahasaCerdas", options: { x: 0.3, y: 0.15, w: 2, h: 0.3, fontSize: 14, color: COLORS.white, fontFace: "Arial", bold: true } } },
        // Footer
        { text: { text: "© 2026 BahasaCerdas. Materi Pembelajaran Resmi.", options: { x: 0.3, y: 5.2, w: 9, h: 0.3, fontSize: 8, color: "6B7280", align: "center" } } },
        // Page number placeholder
        { text: { text: "<SLIDE NUMBER>", options: { x: 9, y: 5.2, w: 1, h: 0.3, fontSize: 8, color: "6B7280", align: "right" } } },
      ],
      slideNumber: { x: 0.3, y: 5.2, fontSize: 8, color: "6B7280" },
    });

    // Generate slides
    if (pptData.slides && Array.isArray(pptData.slides)) {
      pptData.slides.forEach((slide: any, index: number) => {
        const presSlide = pres.addSlide({ masterName: "MASTER_SLIDE" });

        // Title bar for content slides
        if (slide.type !== "title") {
          presSlide.addText(slide.title || "", {
            x: 0.5,
            y: 0.8,
            w: 9,
            h: 0.6,
            fontSize: 24,
            color: COLORS.primary,
            fontFace: "Arial",
            bold: true,
          });

          // Decorative line
          presSlide.addShape(pres.ShapeType.rect, {
            x: 0.5,
            y: 1.4,
            w: 1,
            h: 0.05,
            fill: { color: COLORS.accent },
          });
        }

        // Slide content based on type
        switch (slide.type) {
          case "title":
            // Title slide
            presSlide.addShape(pres.ShapeType.rect, {
              x: 0,
              y: 0,
              w: "100%",
              h: "100%",
              fill: { color: COLORS.white },
            });

            // Decorative elements
            presSlide.addShape(pres.ShapeType.rect, {
              x: 0,
              y: 0,
              w: 0.2,
              h: "100%",
              fill: { color: COLORS.primary },
            });

            // Main title
            presSlide.addText(slide.title || title, {
              x: 1,
              y: 2,
              w: 8,
              h: 1.5,
              fontSize: 36,
              color: COLORS.primary,
              fontFace: "Arial",
              bold: true,
              align: "center",
            });

            // Subtitle
            if (slide.subtitle) {
              presSlide.addText(slide.subtitle, {
                x: 1,
                y: 3.5,
                w: 8,
                h: 0.8,
                fontSize: 20,
                color: COLORS.secondary,
                fontFace: "Arial",
                align: "center",
              });
            }

            // Grade info
            presSlide.addText(`Kelas ${grade} | Kurikulum ${kurikulum}`, {
              x: 1,
              y: 4.5,
              w: 8,
              h: 0.5,
              fontSize: 14,
              color: "6B7280",
              fontFace: "Arial",
              align: "center",
            });

            // Logo text at bottom
            presSlide.addText("BahasaCerdas", {
              x: 1,
              y: 5,
              w: 8,
              h: 0.5,
              fontSize: 16,
              color: COLORS.primary,
              fontFace: "Arial",
              bold: true,
              align: "center",
            });
            break;

          case "bullet":
          case "content":
            // Bullet points
            if (slide.bullets && Array.isArray(slide.bullets)) {
              const bulletText = slide.bullets.map((b: string) => ({
                text: b,
                options: { fontSize: 16, color: COLORS.text, fontFace: "Arial", bullet: true, paraSpaceAfter: 12 },
              }));

              presSlide.addText(bulletText, {
                x: 0.5,
                y: 1.6,
                w: 9,
                h: 3.5,
                valign: "top",
              });
            }

            // Additional content
            if (slide.content) {
              presSlide.addText(slide.content, {
                x: 0.5,
                y: 1.6,
                w: 9,
                h: 3.5,
                fontSize: 16,
                color: COLORS.text,
                fontFace: "Arial",
                valign: "top",
              });
            }

            // Image suggestion box
            if (slide.imageSuggestion) {
              presSlide.addShape(pres.ShapeType.rect, {
                x: 0.5,
                y: 4.5,
                w: 9,
                h: 0.6,
                fill: { color: "F3F4F6" },
                rectRadius: 0.05,
              });
              presSlide.addText(`📷 Saran Gambar: ${slide.imageSuggestion.description}`, {
                x: 0.6,
                y: 4.55,
                w: 8.8,
                h: 0.5,
                fontSize: 10,
                color: "6B7280",
                fontFace: "Arial",
                italic: true,
              });
            }

            // Implementation example
            if (slide.contohImplementasi) {
              presSlide.addShape(pres.ShapeType.rect, {
                x: 0.5,
                y: 4.5,
                w: 9,
                h: 0.6,
                fill: { color: "FEF3C7" },
                rectRadius: 0.05,
              });
              presSlide.addText(`💡 Contoh: ${slide.contohImplementasi}`, {
                x: 0.6,
                y: 4.55,
                w: 8.8,
                h: 0.5,
                fontSize: 10,
                color: "92400E",
                fontFace: "Arial",
              });
            }
            break;

          case "summary":
          case "closing":
            // Summary/Closing slide
            presSlide.addShape(pres.ShapeType.rect, {
              x: 0.3,
              y: 1.5,
              w: 9.4,
              h: 3.5,
              fill: { color: COLORS.lightBg },
              rectRadius: 0.1,
            });

            if (slide.bullets && Array.isArray(slide.bullets)) {
              const bulletText = slide.bullets.map((b: string) => ({
                text: b,
                options: { fontSize: 16, color: COLORS.text, fontFace: "Arial", bullet: true, paraSpaceAfter: 12 },
              }));

              presSlide.addText(bulletText, {
                x: 0.5,
                y: 1.7,
                w: 9,
                h: 3.3,
                valign: "top",
              });
            }
            break;

          default:
            // Default content slide
            if (slide.content) {
              presSlide.addText(slide.content, {
                x: 0.5,
                y: 1.6,
                w: 9,
                h: 3.5,
                fontSize: 16,
                color: COLORS.text,
                fontFace: "Arial",
                valign: "top",
              });
            }
        }

        // Add presenter notes
        if (slide.notes) {
          presSlide.addNotes(slide.notes);
        }
      });
    }

    // Generate file
    const pptxBuffer = await pres.write({ outputType: "nodebuffer" });

    // Upload to Supabase Storage
    const fileName = `admin/materi/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.pptx`;
    const uploadResult = await uploadToSupabase(pptxBuffer, fileName, "application/vnd.openxmlformats-officedocument.presentationml.presentation");

    if ("error" in uploadResult) {
      return NextResponse.json({ error: uploadResult.error }, { status: 500 });
    }

    // Save to database
    const materi = await db.materi.create({
      data: {
        title: title,
        description: `Materi pembelajaran ${topik} untuk ${grade}`,
        content: JSON.stringify(pptData),
        fileUrl: uploadResult.url,
        fileKey: uploadResult.key,
        fileType: "PPTX",
        grade: grade,
        isPublished: true,
        isPremium: false,
        price: 0,
        uploaderId: dbUser.id,
      },
    });

    return NextResponse.json({
      success: true,
      materi: materi,
      slides: pptData.slides?.length || 0,
      downloadUrl: uploadResult.url,
    });
  } catch (error) {
    console.error("AI PPT Generation error:", error);
    return NextResponse.json({ error: "Internal server error: " + (error as Error).message }, { status: 500 });
  }
}

async function uploadToSupabase(buffer: Buffer, fileName: string, contentType: string): Promise<{ url: string; key: string } | { error: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return { error: "Server configuration error" };
  }

  // Auto-create bucket if not exists
  try {
    const bucketCheckRes = await fetch(`${supabaseUrl}/storage/v1/bucket/documents`, {
      headers: { Authorization: `Bearer ${serviceKey}` },
    });

    if (!bucketCheckRes.ok) {
      await fetch(`${supabaseUrl}/storage/v1/bucket`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: "documents",
          name: "documents",
          public: true,
        }),
      }).catch(() => {});
    }
  } catch (e) {
    console.log("Bucket check skipped:", e);
  }

  // Upload file
  const uploadUrl = `${supabaseUrl}/storage/v1/object/documents/${fileName}`;
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": contentType,
    },
    body: buffer,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    return { error: `Upload failed: ${uploadRes.status} ${errText}` };
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/documents/${fileName}`;
  return { url: publicUrl, key: fileName };
}
