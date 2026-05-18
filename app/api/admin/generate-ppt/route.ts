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

    if (!GROQ_API_KEY) {
      console.error("GROQ_API_KEY is not set");
      return NextResponse.json({ error: "GROQ_API_KEY not configured. Please add it to Vercel Environment Variables." }, { status: 500 });
    }

    console.log("Step 1: Calling Groq API with JSON mode...");
    let aiContent = "";
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
          temperature: 0.3,
          response_format: { type: "json_object" }
        }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Groq API error:", res.status, errorText);
        return NextResponse.json({ error: `Groq API error: ${res.status} ${errorText}` }, { status: 500 });
      }
      
      const json = await res.json();
      aiContent = json.choices?.[0]?.message?.content || "";
      console.log("Step 1 complete: AI content received, length:", aiContent.length);
    } catch (e) {
      console.error("AI generation failed:", e);
      return NextResponse.json({ error: "Gagal generate konten AI: " + (e instanceof Error ? e.message : "Unknown error") }, { status: 500 });
    }

    // Parse AI content with robust error handling
    let pptData;
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
      cleaned = cleaned.replace(/^.*?(\{[\s\S]*\})$/, '$1');
      
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
      return NextResponse.json({ 
        error: "Gagal parse konten AI. AI mungkin memberikan format yang tidak valid. Coba lagi.",
        debug: process.env.NODE_ENV === "development" ? aiContent.substring(0, 1000) : undefined
      }, { status: 500 });
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
      pptxBuffer = await pres.write({ outputType: "nodebuffer" });
      console.log("Step 3 complete: PPTX generated, size:", pptxBuffer.length, "bytes");
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
