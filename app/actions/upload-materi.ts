"use server";

import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { configureBucket } from "@/lib/upload";
import { revalidatePath } from "next/cache";

const ALLOWED_ADMIN_EMAILS = [
  "alexsurya1968@gmail.com",
  "hdsastra47@gmail.com",
  "dominikus.02@gmail.com",
];

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return null;
  const isAdmin = dbUser.role === "ADMIN" || 
                  dbUser.isFounder === true || 
                  ALLOWED_ADMIN_EMAILS.includes(user.email || "");
  if (!isAdmin) return null;
  return dbUser;
}

export async function uploadMateriFileAction(data: {
  fileBase64: string;
  fileName: string;
  fileType: "PDF" | "PPTX";
  title: string;
  grade: string;
  topik: string;
}) {
  try {
    const dbUser = await getAdminUser();
    if (!dbUser) return { error: "Unauthorized" };

    // Configure bucket for large files
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY!;
    await configureBucket(supabaseUrl, serviceKey, "documents", 50 * 1024 * 1024).catch(() => {});

    // Upload file using service role key (bypasses RLS)
    const adminSupabase = createAdminClient(supabaseUrl, serviceKey);
    const fileBuffer = Buffer.from(data.fileBase64, "base64");
    const fileKey = `admin/materi/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${data.fileType.toLowerCase()}`;

    const { error: uploadError } = await adminSupabase.storage
      .from("documents")
      .upload(fileKey, fileBuffer, {
        contentType: data.fileType === "PDF" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      return { error: `Gagal upload file: ${uploadError.message}` };
    }

    const { data: urlData } = adminSupabase.storage.from("documents").getPublicUrl(fileKey);

    // Save metadata to database
    const materi = await db.materi.create({
      data: {
        title: data.title,
        description: data.topik || `Materi pembelajaran untuk ${data.grade}`,
        content: data.topik || "",
        fileUrl: urlData.publicUrl,
        fileKey,
        fileType: data.fileType,
        grade: data.grade,
        isPublished: true,
        isPremium: false,
        price: 0,
        uploaderId: dbUser.id,
      },
    });

    revalidatePath("/admin/materi");
    return { success: true, materi, downloadUrl: urlData.publicUrl };
  } catch (error: any) {
    console.error("Upload materi error:", error);
    return { error: error?.message || "Internal server error" };
  }
}

export async function saveMateriAction(data: {
  title: string;
  grade: string;
  topik: string;
  fileUrl: string;
  fileKey: string;
  fileType: "PDF" | "PPTX";
}) {
  try {
    const dbUser = await getAdminUser();
    if (!dbUser) return { error: "Unauthorized" };

    const materi = await db.materi.create({
      data: {
        title: data.title,
        description: data.topik || `Materi pembelajaran untuk ${data.grade}`,
        content: data.topik || "",
        fileUrl: data.fileUrl,
        fileKey: data.fileKey,
        fileType: data.fileType,
        grade: data.grade,
        isPublished: true,
        isPremium: false,
        price: 0,
        uploaderId: dbUser.id,
      },
    });

    revalidatePath("/admin/materi");
    return { success: true, materi };
  } catch (error: any) {
    console.error("Save materi error:", error);
    return { error: error?.message || "Internal server error" };
  }
}
