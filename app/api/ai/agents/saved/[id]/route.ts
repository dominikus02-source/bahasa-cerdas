import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db as prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const saved = await prisma.aiSavedResult.findUnique({ where: { id } });
    if (!saved) {
      return NextResponse.json({ error: "Riwayat tidak ditemukan." }, { status: 404 });
    }
    if (saved.userId !== user.id) {
      return NextResponse.json({ error: "Anda tidak memiliki akses ke riwayat ini." }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error("[AI Saved] GET by id error:", error);
    return NextResponse.json({ error: "Gagal memuat riwayat." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.aiSavedResult.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Riwayat tidak ditemukan." }, { status: 404 });
    }
    if (existing.userId !== user.id) {
      return NextResponse.json({ error: "Anda tidak memiliki akses ke riwayat ini." }, { status: 403 });
    }

    const body = await req.json();
    const { title, metadata } = body as { title?: string; metadata?: Record<string, unknown> };

    const updateData: Record<string, unknown> = {};
    if (typeof title === "string" && title.trim().length > 0) {
      updateData.title = title.trim().slice(0, 200);
    }
    if (metadata !== undefined) {
      updateData.metadata = metadata;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Tidak ada data yang diubah." }, { status: 400 });
    }

    const updated = await prisma.aiSavedResult.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[AI Saved] PATCH error:", error);
    return NextResponse.json({ error: "Gagal memperbarui." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.aiSavedResult.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Riwayat tidak ditemukan." }, { status: 404 });
    }
    if (existing.userId !== user.id) {
      return NextResponse.json({ error: "Anda tidak memiliki akses ke riwayat ini." }, { status: 403 });
    }

    await prisma.aiSavedResult.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AI Saved] DELETE error:", error);
    return NextResponse.json({ error: "Gagal menghapus." }, { status: 500 });
  }
}
