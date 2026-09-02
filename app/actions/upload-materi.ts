"use server";

import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sanitize } from "@/lib/validations";

const materiSchema = z.object({
  title: z.string().min(1, "Title harus diisi").max(255).trim(),
  grade: z.string().min(1).max(50).trim(),
  topik: z.string().max(500).trim(),
  fileType: z.enum(["PDF", "PPTX"]),
});

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return null;
  const isAdmin = dbUser.role === "ADMIN" || dbUser.isFounder === true;
  if (!isAdmin) return null;
  return dbUser;
}

// NOTE: the previous `uploadMateriFileAction` (which received the whole file as
// base64 through a Server Action) was removed. Large uploads must go directly to
// Supabase Storage from the client; the Server Action only persists metadata via
// `saveMateriAction` below.

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

    const parsed = materiSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message || "Data tidak valid" };
    }

    const materi = await db.materi.create({
      data: {
        title: sanitize(parsed.data.title),
        description: parsed.data.topik ? sanitize(parsed.data.topik) : `Materi pembelajaran untuk ${parsed.data.grade}`,
        content: parsed.data.topik || "",
        fileUrl: data.fileUrl,
        fileKey: data.fileKey,
        fileType: parsed.data.fileType,
        grade: parsed.data.grade,
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
