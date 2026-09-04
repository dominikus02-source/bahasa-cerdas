import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";

/**
 * Student submits a Praktik result: file URL + metadata, or link URL.
 * ONE ACTIVE SUBMISSION PER STUDENT PER ASSIGNMENT.
 * Resubmission replaces the active submission and resets grading.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { url, fileName, fileType, fileSize } = body ?? {};

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Berkas praktik belum ada." }, { status: 400 });
    }

    // Validate URL: only http/https (YouTube, Drive, Canva, uploaded file public URL).
    const trimmedUrl = url.trim();
    let parsedUrl: URL | null = null;
    try {
      parsedUrl = new URL(trimmedUrl);
    } catch {
      return NextResponse.json({ error: "Tautan tidak valid. Gunakan tautan https:// yang benar." }, { status: 400 });
    }
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json({ error: "Tautan tidak valid. Gunakan tautan https:// yang benar." }, { status: 400 });
    }

    const penugasan = await db.penugasan.findUnique({
      where: { id },
      include: { group: { include: { members: { where: { userId: user.id }, select: { id: true } } } } },
    });
    if (!penugasan || penugasan.group.members.length === 0) {
      return NextResponse.json({ error: "Tugas tidak ditemukan", code: "TUGAS_NOT_FOUND" }, { status: 404 });
    }

    // Check for existing submission (for cleanup on resubmit).
    const existing = await db.penugasanSubmission.findUnique({
      where: { penugasanId_userId: { penugasanId: id, userId: user.id } },
      select: { praktikUrl: true, praktikDinilai: true },
    });

    // Upsert: replace active submission, reset grading.
    await db.penugasanSubmission.upsert({
      where: { penugasanId_userId: { penugasanId: id, userId: user.id } },
      update: {
        praktikUrl: trimmedUrl,
        praktikFileName: fileName || null,
        praktikFileType: fileType || null,
        praktikFileSize: fileSize != null ? Number(fileSize) : null,
        submittedAt: new Date(),
        // Reset grading on resubmission.
        praktikDinilai: false,
        praktikNilai: null,
        praktikCatatan: null,
        startedAt: new Date(),
      },
      create: {
        penugasanId: id,
        userId: user.id,
        status: "IN_PROGRESS",
        praktikUrl: trimmedUrl,
        praktikFileName: fileName || null,
        praktikFileType: fileType || null,
        praktikFileSize: fileSize != null ? Number(fileSize) : null,
        submittedAt: new Date(),
        startedAt: new Date(),
      },
    });

    // Best-effort: clean up old storage file on resubmission.
    // Only if the old URL was a Supabase Storage upload (not an external link).
    if (existing?.praktikUrl && existing.praktikUrl !== trimmedUrl) {
      try {
        const oldUrl = existing.praktikUrl;
        // Extract storage path from public URL: .../object/public/{bucket}/{path}
        const marker = "/object/public/";
        const idx = oldUrl.indexOf(marker);
        if (idx !== -1) {
          const afterMarker = oldUrl.substring(idx + marker.length);
          const slashIdx = afterMarker.indexOf("/");
          if (slashIdx !== -1) {
            const bucket = afterMarker.substring(0, slashIdx);
            const path = afterMarker.substring(slashIdx + 1);
            // Dynamic import to avoid bundling supabase admin client.
            const { createClient } = await import("@supabase/supabase-js");
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            await supabase.storage.from(bucket).remove([path]);
          }
        }
      } catch {
        // Cleanup failure is non-fatal — log only.
        console.warn("praktik: old storage cleanup failed (non-fatal)");
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/murid/penugasan/[id]/praktik error:", error);
    return NextResponse.json({ error: "Praktik belum berhasil dikirim. Silakan coba lagi." }, { status: 500 });
  }
}
