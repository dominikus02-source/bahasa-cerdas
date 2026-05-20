"use server";

import { db } from "@/lib/db";
import { uploadFileServer } from "@/lib/upload";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const ALLOWED_ADMIN_EMAILS = [
  "alexsurya1968@gmail.com",
  "hdsastra47@gmail.com",
  "dominikus.02@gmail.com",
];

export async function uploadMateriAction(formData: FormData) {
  try {
    console.log("Server Action Upload: Starting...");
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) {
      return { error: "User not found" };
    }
    
    const isAdmin = dbUser.role === "ADMIN" || 
                    dbUser.isFounder === true || 
                    ALLOWED_ADMIN_EMAILS.includes(user.email || "");

    if (!isAdmin) {
      return { error: "Admin only" };
    }

    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const grade = formData.get("grade") as string;
    const topik = formData.get("topik") as string;

    if (!file || !title || !grade) {
      return { error: "File, judul, dan kelas wajib diisi" };
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (!["pptx", "pdf"].includes(fileExt || "")) {
      return { error: "File harus PPTX atau PDF" };
    }

    if (file.size > 50 * 1024 * 1024) {
      return { error: "Ukuran file maksimal 50MB" };
    }

    console.log("Server Action Upload: Uploading", file.name, file.size);

    const fileName = `admin/materi/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const uploadResult = await uploadFileServer(file, fileName, "documents", file.type);

    if ("error" in uploadResult) {
      return { error: "Gagal upload file: " + uploadResult.error };
    }

    console.log("Server Action Upload: Saving to DB...");
    const materi = await db.materi.create({
      data: {
        title,
        description: topik || `Materi pembelajaran untuk ${grade}`,
        content: topik || "",
        fileUrl: uploadResult.url,
        fileKey: uploadResult.key,
        fileType: fileExt === "pdf" ? "PDF" : "PPTX",
        grade,
        isPublished: true,
        isPremium: false,
        price: 0,
        uploaderId: dbUser.id,
      },
    });

    console.log("Server Action Upload: Done!", materi.id);
    revalidatePath("/admin/materi");
    
    return { success: true, materi, downloadUrl: uploadResult.url };
  } catch (error: any) {
    console.error("Server Action Upload error:", error);
    return { error: error?.message || "Internal server error" };
  }
}
