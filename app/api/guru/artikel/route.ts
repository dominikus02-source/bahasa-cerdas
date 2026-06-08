import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "artikel";
}

function allowGuruOrFounder(user: { role: string; isFounder?: boolean } | null): user is { role: string; isFounder?: boolean } {
  return user !== null && (user.role === "GURU" || user.isFounder === true);
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user || !allowGuruOrFounder(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const data = await db.artikel.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, slug: true, excerpt: true,
        isPublished: true, readCount: true, createdAt: true,
      },
    });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !allowGuruOrFounder(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { title, content, excerpt, coverImage, tags, isPublished } = body;

    if (!title || !content) return NextResponse.json({ error: "Title and content required" }, { status: 400 });

    const slug = slugify(title) + "-" + Date.now();

    const artikel = await db.artikel.create({
      data: {
        title, slug, content,
        excerpt: excerpt || content.slice(0, 200),
        coverImage, tags: tags || [],
        isPublished: isPublished ?? false,
        authorId: user.id,
      },
    });

    return NextResponse.json({ artikel }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getUser();
    if (!allowGuruOrFounder(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { id, title, content, excerpt, coverImage, tags, isPublished } = body;

    const existing = await db.artikel.findUnique({ where: { id } });
    if (!existing || existing.authorId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const artikel = await db.artikel.update({
      where: { id },
      data: {
        title, content,
        excerpt: excerpt || content?.slice(0, 200),
        coverImage, tags, isPublished,
      },
    });

    return NextResponse.json({ artikel });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser();
    if (!allowGuruOrFounder(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") ?? undefined;

    const existing = await db.artikel.findUnique({ where: { id } });
    if (!existing || existing.authorId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.artikel.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
