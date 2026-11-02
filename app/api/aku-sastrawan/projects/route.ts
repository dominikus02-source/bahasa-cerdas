import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { akuSastrawanPremiumRequired, akuSastrawanUpgradeUrl, canWriteAkuSastrawan } from "@/lib/aku-sastrawan/access";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
}

// READ: owners can always list their own drafts (also after premium ends).
export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();
  const [projects, canWrite] = await Promise.all([
    db.writingProject.findMany({
      where: { userId: user.id },
      select: { id: true, title: true, genre: true, synopsis: true, status: true, wordCount: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    canWriteAkuSastrawan(user),
  ]);
  return NextResponse.json({ projects, canWrite, upgradeUrl: akuSastrawanUpgradeUrl(user.role) });
}

// WRITE: premium only.
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();
  if (!(await canWriteAkuSastrawan(user))) return akuSastrawanPremiumRequired(user.role);
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  const genre = body?.genre === "NOVEL" ? "NOVEL" : "CERPEN";
  if (!title) return NextResponse.json({ error: "Judul karya wajib diisi." }, { status: 400 });
  const project = await db.writingProject.create({
    data: { userId: user.id, title, genre },
    select: { id: true, title: true, genre: true, synopsis: true, content: true, status: true, wordCount: true, updatedAt: true },
  });
  return NextResponse.json({ project }, { status: 201 });
}
