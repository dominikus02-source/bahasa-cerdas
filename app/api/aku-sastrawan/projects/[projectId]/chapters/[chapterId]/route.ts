import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string; chapterId: string }> };
function words(value: string) { const text = value.trim(); return text ? text.split(/\s+/u).length : 0; }

async function ownedChapter(projectId: string, chapterId: string, userId: string) {
  return db.writingChapter.findFirst({
    where: { id: chapterId, projectId, project: { userId } },
    select: { id: true },
  });
}

export async function PATCH(req: NextRequest, { params }: Context) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk ke akun BahasaCerdas." }, { status: 401 });
  try {
    const { projectId, chapterId } = await params;
    if (!await ownedChapter(projectId, chapterId, user.id)) return NextResponse.json({ error: "Bab tidak ditemukan." }, { status: 404 });
    const body = await req.json();
    const data: { title?: string; content?: string; wordCount?: number; orderIndex?: number } = {};
    if (typeof body.title === "string") data.title = body.title.trim().slice(0, 160) || "Bab tanpa judul";
    if (typeof body.content === "string") { data.content = body.content.slice(0, 500_000); data.wordCount = words(data.content); }
    if (Number.isInteger(body.orderIndex) && body.orderIndex >= 1 && body.orderIndex <= 500) data.orderIndex = body.orderIndex;
    const chapter = await db.writingChapter.update({ where: { id: chapterId }, data });
    return NextResponse.json({ chapter });
  } catch (error) {
    console.error("AKU_SASTRAWAN_CHAPTER_UPDATE_FAILED", error);
    return NextResponse.json({ error: "Bab belum dapat diperbarui." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk ke akun BahasaCerdas." }, { status: 401 });
  try {
    const { projectId, chapterId } = await params;
    if (!await ownedChapter(projectId, chapterId, user.id)) return NextResponse.json({ error: "Bab tidak ditemukan." }, { status: 404 });
    await db.writingChapter.delete({ where: { id: chapterId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("AKU_SASTRAWAN_CHAPTER_DELETE_FAILED", error);
    return NextResponse.json({ error: "Bab belum dapat dihapus." }, { status: 500 });
  }
}
