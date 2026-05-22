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
      console.log("Manual PPT Upload: Unauthorized");
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
      console.log("Manual PPT Upload: User not found in DB");
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
      console.log("Manual PPT Upload: Not admin -", user.email);
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    console.log("Manual PPT Upload: Admin verified");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const grade = formData.get("grade") as string;
    const topik = formData.get("topik") as string;
    const kurikulum = formData.get("kurikulum") as string || "MERDEKA";

    console.log("Manual PPT Upload: Form data - title:", title, "grade:", grade, "file:", file?.name, file?.size);

    if (!file || !title || !grade) {
      return NextResponse.json({ error: "File, judul, dan kelas wajib diisi" }, { status: 400 });
    }

    // Validate file type
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    console.log("Manual PPT Upload: File extension:", fileExt, "MIME type:", file.type);
    
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
    console.log("Manual PPT Upload: Upload path:", fileName);
    
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
        fileType: fileExt === "pdf" ? "PDF" : "PPTX",
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
  } catch (error: any) {
    console.error("Manual PPT Upload error:", error);
    console.error("Manual PPT Upload error stack:", error?.stack);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error?.message || "Unknown error"
    }, { status: 500 });
  }
}
