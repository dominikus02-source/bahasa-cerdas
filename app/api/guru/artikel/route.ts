import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent } from "@/lib/teacher/students";
import { awardGuruLiterasiPublish } from "@/lib/guru/literasi-xp";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "artikel";
}

/** Jenis karya guru yang didukung di halaman Artikel. */
export type GuruArtikelJenis = "ARTIKEL" | "PUISI";

function normalizeJenis(value: unknown): GuruArtikelJenis {
  return String(value || "").toUpperCase() === "PUISI" ? "PUISI" : "ARTIKEL";
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user || !isTeacherOrStudent(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const data = await db.artikel.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true, title: true, slug: true, excerpt: true,
        isPublished: true, readCount: true, createdAt: true,
        articleType: true, publishedAt: true,
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
    if (!user || !isTeacherOrStudent(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { title, content, excerpt, coverImage, tags, isPublished } = body;
    const articleType = normalizeJenis(body.articleType);

    if (!title || !content) return NextResponse.json({ error: "Title and content required" }, { status: 400 });

    const slug = slugify(title) + "-" + Date.now();
    const terbit = isPublished === true;

    const artikel = await db.artikel.create({
      data: {
        title, slug, content,
        excerpt: excerpt || content.slice(0, 200),
        coverImage, tags: tags || [],
        isPublished: terbit,
        publishedAt: terbit ? new Date() : null,
        articleType,
        authorName: user.fullName || user.email || null,
        authorRole: user.role,
        authorId: user.id,
      },
    });

    // XP + aktivitas + notifikasi hanya pada terbit pertama kali (best-effort).
    if (terbit) {
      await awardGuruLiterasiPublish({
        guruId: user.id,
        jenis: articleType,
        artikelId: artikel.id,
        judul: title,
        kontenPanjang: content.length,
      }).catch(() => {});
    }

    return NextResponse.json({ artikel }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !isTeacherOrStudent(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { id, title, content, excerpt, coverImage, tags, isPublished } = body;
    const articleType = normalizeJenis(body.articleType);

    const existing = await db.artikel.findUnique({ where: { id } });
    if (!existing || existing.authorId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const terbitPertamaKali = existing.isPublished !== true && isPublished === true;

    const artikel = await db.artikel.update({
      where: { id },
      data: {
        title, content,
        excerpt: excerpt || content?.slice(0, 200),
        coverImage, tags, isPublished,
        articleType,
        publishedAt: terbitPertamaKali ? new Date() : existing.publishedAt,
        authorName: existing.authorName || user.fullName || user.email || null,
        authorRole: existing.authorRole || user.role,
      },
    });

    // XP + aktivitas + notifikasi hanya pada transisi draft → terbit (pertama).
    if (terbitPertamaKali) {
      await awardGuruLiterasiPublish({
        guruId: user.id,
        jenis: articleType,
        artikelId: artikel.id,
        judul: title,
        kontenPanjang: (content ?? existing.content).length,
      }).catch(() => {});
    }

    return NextResponse.json({ artikel });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !isTeacherOrStudent(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
