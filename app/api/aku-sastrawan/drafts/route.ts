import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

function countWords(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/u).length : 0;
}

function validTrack(value: unknown): value is "CERPEN" | "NOVEL" {
  return value === "CERPEN" || value === "NOVEL";
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Silakan masuk ke akun BahasaCerdas." }, { status: 401 });
    const projects = await db.writingProject.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, genre: true, content: true, status: true, wordCount: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ projects });
  } catch (error) {
    console.error("AKU_SASTRAWAN_LIST_FAILED", error);
    return NextResponse.json({ error: "Draf belum dapat dimuat. Coba lagi sebentar." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Silakan masuk ke akun BahasaCerdas." }, { status: 401 });
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 160) : "";
    const content = typeof body.content === "string" ? body.content.slice(0, 500_000) : "";
    const genre = body.genre;
    if (!validTrack(genre)) return NextResponse.json({ error: "Jalur karya tidak valid." }, { status: 400 });
    const project = await db.writingProject.create({
      data: { userId: user.id, title: title || (genre === "NOVEL" ? "Novel tanpa judul" : "Cerpen tanpa judul"), genre, content, wordCount: countWords(content), status: "DRAFT" },
      select: { id: true, title: true, genre: true, content: true, status: true, wordCount: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("AKU_SASTRAWAN_CREATE_FAILED", error);
    return NextResponse.json({ error: "Draf belum dapat disimpan. Coba lagi." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Silakan masuk ke akun BahasaCerdas." }, { status: 401 });
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "ID draf wajib diisi." }, { status: 400 });
    const data: { title?: string; content?: string; genre?: string; wordCount?: number } = {};
    if (typeof body.title === "string") data.title = body.title.trim().slice(0, 160) || "Tanpa judul";
    if (typeof body.content === "string") {
      data.content = body.content.slice(0, 500_000);
      data.wordCount = countWords(data.content);
    }
    if (body.genre !== undefined) {
      if (!validTrack(body.genre)) return NextResponse.json({ error: "Jalur karya tidak valid." }, { status: 400 });
      data.genre = body.genre;
    }
    const exists = await db.writingProject.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Draf tidak ditemukan." }, { status: 404 });
    const project = await db.writingProject.update({
      where: { id },
      data,
      select: { id: true, title: true, genre: true, content: true, status: true, wordCount: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ project });
  } catch (error) {
    console.error("AKU_SASTRAWAN_UPDATE_FAILED", error);
    return NextResponse.json({ error: "Perubahan belum tersimpan. Coba lagi." }, { status: 500 });
  }
}
