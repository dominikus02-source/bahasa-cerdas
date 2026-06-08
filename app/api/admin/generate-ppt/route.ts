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
    console.log("PPT Generation: Starting...");
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("PPT Generation: No user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("PPT Generation: User authenticated:", user.email);

    let dbUser;
    try {
      dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    } catch (dbError) {
      console.error("PPT Generation: Database error:", dbError);
      return NextResponse.json({ error: "Database connection error. Please check DATABASE_URL." }, { status: 500 });
    }
    
    if (!dbUser) {
      console.error("PPT Generation: User not found in database");
      return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    }
    
    // Cek apakah user adalah admin (berdasarkan role, isFounder, atau email)
    const isAdmin = dbUser.role === "ADMIN" || 
                    dbUser.isFounder === true || 
                    ALLOWED_ADMIN_EMAILS.includes(user.email || "");

    if (!isAdmin) {
      console.error("PPT Generation: User not admin:", user.email);
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    console.log("PPT Generation: Admin verified");

    const body = await req.json();
    const { title, grade, topik, jumlahSlide = 10, kurikulum = "MERDEKA" } = body;

    if (!title || !topik) {
      return NextResponse.json({ error: "Judul dan topik wajib diisi" }, { status: 400 });
    }

    // Generate PPT content using AI with deep research
    const prompt = `Buat PPT Bahasa Indonesia kurikulum Merdeka.

JUDUL: ${title}
TOPIK: ${topik}
KELAS: ${grade}
KURIKULUM: ${kurikulum}
SLIDE: ${jumlahSlide}

RISET: KD, CP, materi Kemendikbud, contoh kelas ${grade}.
GAMBAR: Saran Unsplash/Pexels/Pixabay (keyword).
IMPLEMENTASI: Latihan, aktivitas, proyek, rubrik.

STRUKTUR: 1.Judul 2.Tujuan 3.Apersepsi 4-${jumlahSlide-3}.Materi ${jumlahSlide-2}.Rangkuman ${jumlahSlide-1}.Implementasi ${jumlahSlide}.Penutup

JSON: {"risetSummary":"S","kompetensiDasar":["K"],"capaianPembelajaran":"C","sumberGambar":{"unsplash":"U","pexels":"P","pixabay":"X"},"contohImplementasi":{"latihanKelas":["L"],"aktivitasInteraktif":["A"],"proyekMini":"M","rubrikPenilaian":"R"},"slides":[{"type":"t","title":"T","subtitle":"S","content":"C","bullets":["B"],"imageSuggestion":{"keyword":"K","unsplashUrl":"U","description":"D"},"contohImplementasi":"I","notes":"N"}]}

Output HANYA JSON.`;

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

    console.log("Step 1: Generating AI content...");
    let aiContent = "";

    // Try DeepSeek first (unlimited TPM)
    if (DEEPSEEK_API_KEY) {
      try {
        const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${DEEPSEEK_API_KEY}` },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              { role: "system", content: "You are a JSON-only API. Always respond with valid JSON. Never include explanations, markdown, or text outside the JSON object." },
              { role: "user", content: prompt }
            ],
            max_tokens: 4000,
            temperature: 0.2,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          aiContent = json.choices?.[0]?.message?.content || "";
        } else {
          const errText = await res.text();
          console.error("DeepSeek API error:", res.status, errText);
        }
      } catch (e) {
        console.error("DeepSeek failed:", e);
      }
    }

    // Fallback to Groq
    if (!aiContent) {
      if (!GROQ_API_KEY) {
        return NextResponse.json({ error: "GROQ_API_KEY not configured." }, { status: 500 });
      }
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              { role: "system", content: "You are a JSON-only API. Always respond with valid JSON. Never include explanations, markdown, or text outside the JSON object." },
              { role: "user", content: prompt }
            ],
            max_tokens: 4000,
            temperature: 0.2,
            response_format: { type: "json_object" }
          }),
        });
        if (res.ok) {
          const json = await res.json();
          aiContent = json.choices?.[0]?.message?.content || "";
        } else {
          const errorText = await res.text();
          console.error("Groq API error:", res.status, errorText);
          return NextResponse.json({ error: `Groq API error: ${res.status} ${errorText}` }, { status: 500 });
        }
      } catch (e) {
        console.error("AI generation failed:", e);
        return NextResponse.json({ error: "Gagal generate konten AI: " + (e instanceof Error ? e.message : "Unknown error") }, { status: 500 });
      }
    }

    if (!aiContent) {
      return NextResponse.json({ error: "Semua AI provider gagal menghasilkan konten." }, { status: 500 });
    }

    console.log("Step 1 complete: AI content received, length:", aiContent.length);

    // Parse AI content with robust error handling
    let pptData;
    let aiWarning = "";
    try {
      let cleaned = aiContent.trim();
      
      // Strategy 1: Try to extract JSON from markdown code blocks
      const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        cleaned = jsonMatch[1].trim();
      }
      
      // Strategy 2: If still not clean, find first { and last }
      if (!cleaned.startsWith('{')) {
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
      }
      
      // Strategy 3: Remove common AI prefixes/suffixes
      cleaned = cleaned.replace(/^[\s\S]*?(\{[\s\S]*\})$/, '$1');
      
      // Strategy 4: Remove comments and fix common JSON issues
      cleaned = cleaned.replace(/\/\/.*$/gm, '');
      cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
      cleaned = cleaned.replace(/,\s*}/g, '}'); // Remove trailing commas
      cleaned = cleaned.replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
      
      // Try to parse
      try {
        pptData = JSON.parse(cleaned);
      } catch (parseError) {
        // Strategy 5: If still fails, try to fix common issues
        console.error("First parse failed, trying to fix JSON...");
        
        // Remove any non-JSON text before/after
        const jsonRegex = /\{[\s\S]*\}/;
        const match = cleaned.match(jsonRegex);
        if (match) {
          cleaned = match[0];
        }
        
        // Try again
        pptData = JSON.parse(cleaned);
      }
      
      console.log("Step 2 complete: JSON parsed successfully");
    } catch (e) {
      console.error("Failed to parse AI content:", aiContent.substring(0, 500));
      console.error("Parse error:", e);
      aiWarning = "Gagal parse hasil AI. Menggunakan struktur default.";
    }

    // If AI failed, generate fallback PPT structure
    if (!pptData || !pptData.slides || !Array.isArray(pptData.slides) || pptData.slides.length === 0) {
      console.log("AI content invalid or missing slides, using fallback structure");
      aiWarning = "Konten AI tidak valid. Menggunakan struktur default berdasarkan judul.";
      pptData = generateFallbackPPT({ title, topik, grade, kurikulum, jumlahSlide });
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
    console.log("Step 3: Generating PPTX file...");
    let pptxBuffer;
    try {
      pptxBuffer = await pres.write({ outputType: "nodebuffer" }) as any;
      console.log("Step 3 complete: PPTX generated, size:", (pptxBuffer as { length: number }).length, "bytes");
    } catch (pptError) {
      console.error("PPT Generation error:", pptError);
      return NextResponse.json({ error: "Gagal generate file PPT: " + (pptError instanceof Error ? pptError.message : "Unknown error") }, { status: 500 });
    }

    // Upload to Supabase Storage
    console.log("Step 4: Uploading to Supabase Storage...");
    const fileName = `admin/materi/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.pptx`;
    const uploadResult = await uploadToSupabase(pptxBuffer, fileName, "application/vnd.openxmlformats-officedocument.presentationml.presentation");

    if ("error" in uploadResult) {
      console.error("Upload error:", uploadResult.error);
      return NextResponse.json({ error: "Gagal upload file: " + uploadResult.error }, { status: 500 });
    }
    console.log("Step 4 complete: File uploaded to", uploadResult.url);

    // Save to database
    console.log("Step 5: Saving to database...");
    let materi;
    try {
      materi = await db.materi.create({
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
      console.log("Step 5 complete: Materi saved with ID:", materi.id);
    } catch (dbError) {
      console.error("Database save error:", dbError);
      return NextResponse.json({ error: "Gagal simpan ke database: " + (dbError instanceof Error ? dbError.message : "Unknown error") }, { status: 500 });
    }

    console.log("PPT Generation: Complete!");
    return NextResponse.json({
      success: true,
      materi: materi,
      slides: pptData.slides?.length || 0,
      downloadUrl: uploadResult.url,
      warning: aiWarning || undefined,
    });
  } catch (error) {
    console.error("AI PPT Generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ 
      error: "Internal server error", 
      details: process.env.NODE_ENV === "development" ? errorMessage : undefined 
    }, { status: 500 });
  }
}

function generateFallbackPPT(params: { title: string; topik: string; grade: string; kurikulum: string; jumlahSlide: number }) {
  const { title, topik, grade, kurikulum, jumlahSlide } = params;
  const slides: any[] = [];

  // Slide 1: Title
  slides.push({
    type: "title",
    title: title,
    subtitle: `Mata Pelajaran: Bahasa Indonesia - ${grade}`,
    content: "",
    bullets: [],
    imageSuggestion: { keyword: "belajar", unsplashUrl: "", description: "Suasana belajar mengajar Bahasa Indonesia" },
    contohImplementasi: "",
    notes: "Slide pembuka presentasi.",
  });

  // Slide 2: Tujuan Pembelajaran
  slides.push({
    type: "content",
    title: "Tujuan Pembelajaran",
    content: "",
    bullets: [
      `Memahami konsep ${title.toLowerCase()} sesuai Kurikulum ${kurikulum}`,
      `Menganalisis struktur dan kaidah kebahasaan ${topik.toLowerCase()}`,
      "Menyajikan contoh penerapan dalam kehidupan sehari-hari",
    ],
    imageSuggestion: { keyword: "pembelajaran", unsplashUrl: "", description: "Ilustrasi tujuan pembelajaran" },
    contohImplementasi: "",
    notes: "Sampaikan tujuan pembelajaran di awal.",
  });

  // Slide 3: Apersepsi
  slides.push({
    type: "content",
    title: "Apersepsi",
    content: "",
    bullets: [
      "Apa yang kalian ketahui tentang " + topik.toLowerCase() + "?",
      "Bagaimana penerapan " + topik.toLowerCase() + " di sekitar kita?",
      "Mengapa materi ini penting untuk dipelajari?",
    ],
    imageSuggestion: { keyword: "pertanyaan", unsplashUrl: "", description: "Gambar ilustrasi apersepsi" },
    contohImplementasi: "Berikan pertanyaan pemantik untuk memulai diskusi kelas",
    notes: "Gunakan pertanyaan pemantik untuk memicu diskusi.",
  });

  // Content slides
  const contentCount = Math.max(3, jumlahSlide - 5);

  for (let i = 0; i < contentCount; i++) {
    const sectionNames = [
      "Pengertian dan Konsep Dasar",
      "Struktur dan Karakteristik",
      "Kaidah Kebahasaan",
      "Contoh dan Penerapan",
      "Analisis Lebih Lanjut",
      "Studi Kasus",
      "Latihan Pemahaman",
      "Pengembangan Materi",
    ];
    const sectionName = sectionNames[Math.min(i, sectionNames.length - 1)];
    slides.push({
      type: "bullet",
      title: `${sectionName}`,
      content: "",
      bullets: [
        `Pembahasan ${sectionName.toLowerCase()} dari materi ${title.toLowerCase()}`,
        `Penerapan konsep dalam konteks ${grade.toLowerCase()}`,
        `Diskusi dan tanya jawab seputar ${topik.toLowerCase()}`,
        `Catat poin-poin penting dalam pembahasan ini`,
      ],
      imageSuggestion: { keyword: "materi", unsplashUrl: "", description: "Ilustrasi materi pembelajaran" },
      contohImplementasi: `Ajak siswa berdiskusi tentang ${topik.toLowerCase()} dalam ${i % 2 === 0 ? "kelompok kecil" : "kelas"}`,
      notes: `Pastikan siswa memahami ${sectionName.toLowerCase()}.`,
    });
  }

  // Rangkuman
  slides.push({
    type: "summary",
    title: "Rangkuman",
    content: "",
    bullets: [
      `Materi ${title.toLowerCase()} mencakup aspek penting dalam ${topik.toLowerCase()}`,
      "Pahami struktur dan kaidah kebahasaan yang berlaku",
      "Terapkan konsep dalam latihan dan tugas mandiri",
    ],
    imageSuggestion: { keyword: "rangkuman", unsplashUrl: "", description: "Ilustrasi rangkuman materi" },
    contohImplementasi: "Minta siswa membuat peta konsep dari materi yang telah dipelajari",
    notes: "Ringkas poin-poin utama pembelajaran.",
  });

  // Implementasi
  slides.push({
    type: "content",
    title: "Kegiatan Implementasi",
    content: "",
    bullets: [
      "Latihan individu: kerjakan soal-soal terkait materi",
      "Aktivitas kelompok: diskusikan penerapan dalam konteks nyata",
      "Proyek mini: buat produk sederhana berdasarkan materi",
    ],
    imageSuggestion: { keyword: "latihan", unsplashUrl: "", description: "Ilustrasi kegiatan implementasi" },
    contohImplementasi: `Bagi siswa dalam kelompok untuk mengerjakan proyek ${topik.toLowerCase()}`,
    notes: "Siapkan rubrik penilaian untuk kegiatan implementasi.",
  });

  // Penutup
  slides.push({
    type: "closing",
    title: "Penutup",
    content: "",
    bullets: [
      "Refleksi: Apa yang sudah kalian pelajari hari ini?",
      "Tugas: Kerjakan soal latihan untuk memperdalam pemahaman",
      "Materi selanjutnya akan membahas pengembangan lebih lanjut",
    ],
    imageSuggestion: { keyword: "selesai", unsplashUrl: "", description: "Ilustrasi penutup pembelajaran" },
    contohImplementasi: "Adakan sesi refleksi singkat sebelum menutup pelajaran",
    notes: "Sampaikan tugas dan materi pertemuan berikutnya.",
  });

  return {
    risetSummary: `Materi ${title} untuk ${grade} Kurikulum ${kurikulum}`,
    kompetensiDasar: ["3.1 Memahami konsep " + title.toLowerCase(), "4.1 Menyajikan " + topik.toLowerCase()],
    capaianPembelajaran: `Siswa mampu memahami dan menerapkan ${title.toLowerCase()} dalam konteks ${grade.toLowerCase()}`,
    sumberGambar: { unsplash: "", pexels: "", pixabay: "" },
    contohImplementasi: {
      latihanKelas: ["Soal pilihan ganda", "Soal uraian singkat"],
      aktivitasInteraktif: ["Diskusi kelompok", "Presentasi kelas"],
      proyekMini: "Membuat peta konsep materi " + title,
      rubrikPenilaian: "Keaktifan (30%) + Tugas (40%) + Proyek (30%)",
    },
    slides: slides,
  };
}

async function uploadToSupabase(buffer: Buffer | ArrayBuffer, fileName: string, contentType: string): Promise<{ url: string; key: string } | { error: string }> {
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
    body: buffer as BodyInit,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    return { error: `Upload failed: ${uploadRes.status} ${errText}` };
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/documents/${fileName}`;
  return { url: publicUrl, key: fileName };
}
