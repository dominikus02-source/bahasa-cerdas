import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { uploadFileServer } from "@/lib/upload";

export async function POST(req: NextRequest) {
  try {
    console.log("Manual PPT Upload: Starting...");
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let dbUser;
    try {
      dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    } catch (dbError) {
      console.error("Manual PPT Upload: Database error:", dbError);
      return NextResponse.json({ error: "Database connection error" }, { status: 500 });
    }
    
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Check admin access
    const ALLOWED_ADMIN_EMAILS = [
      "alexsurya1968@gmail.com",
      "hdsastra47@gmail.com",
      "dominikus.02@gmail.com",
    ];
    
    const isAdmin = dbUser.role === "ADMIN" || 
                    dbUser.isFounder === true || 
                    ALLOWED_ADMIN_EMAILS.includes(user.email || "");

    if (!isAdmin) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    console.log("Manual PPT Upload: Admin verified");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const grade = formData.get("grade") as string;
    const topik = formData.get("topik") as string;
    const kurikulum = formData.get("kurikulum") as string || "MERDEKA";

    if (!file || !title || !grade) {
      return NextResponse.json({ error: "File, judul, dan kelas wajib diisi" }, { status: 400 });
    }

    // Validate file type
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (!["pptx", "pdf"].includes(fileExt || "")) {
      return NextResponse.json({ error: "File harus PPTX atau PDF" }, { status: 400 });
    }

    // Check file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran file maksimal 50MB" }, { status: 400 });
    }

    console.log("Manual PPT Upload: Uploading file:", file.name, "Size:", file.size);

    // Upload file
    const fileName = `admin/materi/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const uploadResult = await uploadFileServer(file, fileName, "documents", file.type);

    if ("error" in uploadResult) {
      console.error("Manual PPT Upload: Upload failed:", uploadResult.error);
      return NextResponse.json({ error: "Gagal upload file: " + uploadResult.error }, { status: 500 });
    }

    console.log("Manual PPT Upload: File uploaded to", uploadResult.url);

    // Save to database
    console.log("Manual PPT Upload: Saving to database...");
    const materi = await db.materi.create({
      data: {
        title: title,
        description: topik || `Materi pembelajaran untuk ${grade}`,
        content: topik || "",
        fileUrl: uploadResult.url,
        fileKey: uploadResult.key,
        fileType: fileExt?.toUpperCase() || "PPTX",
        grade: grade,
        isPublished: true,
        isPremium: false,
        price: 0,
        uploaderId: dbUser.id,
      },
    });

    console.log("Manual PPT Upload: Complete! Materi ID:", materi.id);

    return NextResponse.json({
      success: true,
      materi: materi,
      downloadUrl: uploadResult.url,
    });
  } catch (error) {
    console.error("Manual PPT Upload error:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: process.env.NODE_ENV === "development" ? (error as Error).message : undefined 
    }, { status: 500 });
  }
}
