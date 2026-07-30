import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import homepageContent from "@/prisma/seed-data/homepage-content.json";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({ where: { supabaseId: authUser.id } });
    if (!dbUser || !dbUser.isFounder) {
      console.error("Not founder:", dbUser?.email);
      return NextResponse.json({ error: "Forbidden - Founder access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { author: { fullName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [data, total] = await Promise.all([
      db.artikel.findMany({
        where,
        include: {
          author: { select: { id: true, fullName: true, email: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.artikel.count({ where }),
    ]);

    console.log(`Found ${total} articles for admin ${dbUser.email}`);
    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err: any) {
    console.error("Admin artikel GET error:", err.message, err.stack);
    return NextResponse.json({ error: `Internal error: ${err.message}` }, { status: 500 });
  }
}

const EDITOR_EMAIL = "guru@demo.com";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: authUser.id } });
    if (!dbUser || !dbUser.isFounder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === "unpublish") {
      const result = await db.artikel.updateMany({ data: { isPublished: false } });
      return NextResponse.json({ success: true, unpublished: result.count });
    }

    if (action === "publishAll") {
      const result = await db.artikel.updateMany({ data: { isPublished: true } });
      return NextResponse.json({ success: true, published: result.count });
    }

    if (action === "unpublishLast") {
      const count = body.count || 15;
      const last = await db.artikel.findMany({ orderBy: { createdAt: "desc" }, take: count, select: { id: true } });
      await db.artikel.updateMany({ where: { id: { in: last.map(a => a.id) } }, data: { isPublished: false } });
      return NextResponse.json({ success: true, unpublished: last.length });
    }

    // Seed articles from JSON
    const editor = await db.user.findFirst({ where: { email: EDITOR_EMAIL } });
    if (!editor) return NextResponse.json({ error: "Editor user not found" }, { status: 500 });

    const items = (homepageContent as any).artikel || [];
    let created = 0, updated = 0;

    for (const a of items) {
      const existing = await db.artikel.findUnique({ where: { slug: a.slug } });
      const data = {
        title: a.title,
        excerpt: a.excerpt,
        content: a.content,
        coverImage: a.coverImage,
        tags: a.tags,
        readCount: a.readCount || 0,
        createdAt: new Date(a.publishedAt),
        isPublished: true,
        authorId: editor.id,
      };

      if (existing) {
        await db.artikel.update({ where: { slug: a.slug }, data });
        updated++;
      } else {
        await db.artikel.create({ data: { ...data, slug: a.slug } });
        created++;
      }
    }

    return NextResponse.json({ success: true, created, updated, total: items.length });
  } catch (err: any) {
    console.error("Seed/unpublish artikel error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: authUser.id } });
    if (!dbUser || !dbUser.isFounder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const existing = await db.artikel.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Artikel tidak ditemukan" }, { status: 404 });

    await db.artikel.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Artikel berhasil dihapus" });
  } catch (err: any) {
    console.error("Admin artikel DELETE error:", err.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
