import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const community = await db.community.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, fullName: true, avatar: true } },
      },
    });
    if (!community) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [posts, members, totalPosts] = await Promise.all([
      db.communityPost.findMany({
        where: { communityId: id },
        include: { user: { select: { id: true, fullName: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.communityMember.findMany({
        where: { communityId: id },
        include: { user: { select: { id: true, fullName: true, avatar: true } } },
        take: 10,
      }),
      db.communityPost.count({ where: { communityId: id } }),
    ]);

    const ketua = members.find((m) => m.role === "ketua") || null;

    return NextResponse.json({ community, posts, members, totalPosts, ketua });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isMember = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: id, userId: dbUser.id } },
    });
    if (!isMember) return NextResponse.json({ error: "Harus menjadi anggota dulu" }, { status: 403 });

    const body = await req.json();
    const { title, content, fileUrl } = body;

    const post = await db.communityPost.create({
      data: { communityId: id, userId: dbUser.id, title, content, fileUrl },
    });

    await db.community.update({
      where: { id },
      data: { postCount: { increment: 1 } },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const community = await db.community.findUnique({ where: { id } });
    if (!community) return NextResponse.json({ error: "Komunitas tidak ditemukan" }, { status: 404 });

    if (community.creatorId !== dbUser.id) {
      return NextResponse.json({ error: "Hanya pembuat komunitas yang dapat mengedit" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, province, city, region, school, avatarUrl, bannerUrl, attachments } = body;

    const updated = await db.community.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(province !== undefined && { province }),
        ...(city !== undefined && { city }),
        ...(region !== undefined && { region }),
        ...(school !== undefined && { school }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(bannerUrl !== undefined && { bannerUrl }),
        ...(attachments !== undefined && { attachments }),
      },
    });

    return NextResponse.json({ community: updated, message: "Komunitas berhasil diperbarui" });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}