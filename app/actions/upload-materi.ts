"use server";

import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const ALLOWED_ADMIN_EMAILS = [
  "alexsurya1968@gmail.com",
  "hdsastra47@gmail.com",
  "dominikus.02@gmail.com",
];

export async function saveMateriAction(data: {
  title: string;
  grade: string;
  topik: string;
  fileUrl: string;
  fileKey: string;
  fileType: "PDF" | "PPTX";
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthorized" };

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return { error: "User not found" };
    
    const isAdmin = dbUser.role === "ADMIN" || 
                    dbUser.isFounder === true || 
                    ALLOWED_ADMIN_EMAILS.includes(user.email || "");

    if (!isAdmin) return { error: "Admin only" };

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
