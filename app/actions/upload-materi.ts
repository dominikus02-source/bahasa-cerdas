"use server";

import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { configureBucket } from "@/lib/upload";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sanitize } from "@/lib/validations";

const materiSchema = z.object({
  title: z.string().min(1, "Title harus diisi").max(255).trim(),
  grade: z.string().min(1).max(50).trim(),
  topik: z.string().max(500).trim(),
  fileType: z.enum(["PDF", "PPTX"]),
});

function isFounderEmail(email: string): boolean {
  if (!email) return false;
  const founders = process.env.FOUNDER_EMAILS?.split(",")
    .map((e) => e.trim().toLowerCase()) ?? [];
  return founders.includes(email.toLowerCase());
}

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return null;
  const isAdmin = dbUser.role === "ADMIN" ||
                  dbUser.isFounder === true ||
                  isFounderEmail(user.email || "");
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

    const parsed = materiSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message || "Data tidak valid" };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    await configureBucket(supabaseUrl, serviceKey, "documents", 50 * 1024 * 1024).catch(() => {});

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

    const materi = await db.materi.create({
      data: {
        title: sanitize(parsed.data.title),
        description: parsed.data.topik ? sanitize(parsed.data.topik) : `Materi pembelajaran untuk ${parsed.data.grade}`,
        content: parsed.data.topik || "",
        fileUrl: urlData.publicUrl,
        fileKey,
        fileType: parsed.data.fileType,
        grade: parsed.data.grade,
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
