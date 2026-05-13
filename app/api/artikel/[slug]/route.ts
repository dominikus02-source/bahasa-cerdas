import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const artikel = await db.artikel.findUnique({
      where: { slug: params.slug },
      select: {
        id: true, title: true, slug: true, content: true, excerpt: true,
        coverImage: true, tags: true, readCount: true, createdAt: true, updatedAt: true,
        author: { select: { id: true, fullName: true, avatar: true } },
      },
    });

    if (!artikel) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.artikel.update({ where: { id: artikel.id }, data: { readCount: { increment: 1 } } });

    return NextResponse.json({ artikel });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
