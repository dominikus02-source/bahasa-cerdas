import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { hasAkuSastrawanAccess } from "@/lib/aku-sastrawan/access";
import { hasAkuSastrawanAccess } from "@/lib/aku-sastrawan/access";

export const runtime = "nodejs";

function words(value: string) { const text = value.trim(); return text ? text.split(/\s+/u).length : 0; }
type Context = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: Context) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk ke akun BahasaCerdas." }, { status: 401 });
  if (!await hasAkuSastrawanAccess(user.id)) return NextResponse.json({ error: "Pengelolaan novel memerlukan akses Premium AKU SASTRAWAN." }, { status: 403 });
  try {
    const { projectId } = await params;
    const project = await db.writingProject.findFirst({ where: { id: projectId, userId: user.id }, select: { id: true } });
    if (!project) return NextResponse.json({ error: "Proyek tidak ditemukan." }, { status: 404 });
    const chapters = await db.writingChapter.findMany({ where: { projectId }, orderBy: { orderIndex: "asc" } });
    return NextResponse.json({ chapters });
  } catch (error) {
    console.error("AKU_SASTRAWAN_CHAPTER_LIST_FAILED", error);
    return NextResponse.json({ error: "Bab belum dapat dimuat." }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Context) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk ke akun BahasaCerdas." }, { status: 401 });
  if (!await hasAkuSastrawanAccess(user.id)) return NextResponse.json({ error: "Pengelolaan novel memerlukan akses Premium AKU SASTRAWAN." }, { status: 403 });
  try {
    const { projectId } = await params;
    const project = await db.writingProject.findFirst({ where: { id: projectId, userId: user.id }, select: { id: true, genre: true } });
    if (!project) return NextResponse.json({ error: "Proyek tidak ditemukan." }, { status: 404 });
    if (project.genre !== "NOVEL") return NextResponse.json({ error: "Bab hanya tersedia untuk proyek novel." }, { status: 400 });
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 160) : "";
    const content = typeof body.content === "string" ? body.content.slice(0, 500_000) : "";
    const last = await db.writingChapter.findFirst({ where: { projectId }, orderBy: { orderIndex: "desc" }, select: { orderIndex: true } });
    const chapter = await db.writingChapter.create({
      data: { projectId, title: title || `Bab ${(last?.orderIndex ?? 0) + 1}`, content, orderIndex: (last?.orderIndex ?? 0) + 1, wordCount: words(content) },
    });
    return NextResponse.json({ chapter }, { status: 201 });
  } catch (error) {
    console.error("AKU_SASTRAWAN_CHAPTER_CREATE_FAILED", error);
    return NextResponse.json({ error: "Bab belum dapat dibuat." }, { status: 500 });
  }
}
