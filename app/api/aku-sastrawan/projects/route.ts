import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { hasAkuSastrawanAccess } from "@/lib/aku-sastrawan/access";

async function premiumUser() {
  const user = await getUser();
  if (!user) return { error: NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }) };
  const hasPremium = await hasAkuSastrawanAccess(user.id);
  if (!hasPremium) {
    return { error: NextResponse.json({ error: "AKU SASTRAWAN memerlukan akses Premium." }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  const auth = await premiumUser();
  if (auth.error) return auth.error;
  const projects = await db.writingProject.findMany({
    where: { userId: auth.user!.id },
    select: { id: true, title: true, genre: true, synopsis: true, status: true, wordCount: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const auth = await premiumUser();
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  const genre = body?.genre === "NOVEL" ? "NOVEL" : "CERPEN";
  if (!title) return NextResponse.json({ error: "Judul karya wajib diisi." }, { status: 400 });
  const project = await db.writingProject.create({
    data: { userId: auth.user!.id, title, genre },
    select: { id: true, title: true, genre: true, synopsis: true, content: true, status: true, wordCount: true, updatedAt: true },
  });
  return NextResponse.json({ project }, { status: 201 });
}
