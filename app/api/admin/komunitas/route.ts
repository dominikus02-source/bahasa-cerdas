import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status && status !== "ALL") where.status = status;

    const communities = await db.community.findMany({
      where,
      include: {
        creator: { select: { id: true, fullName: true, email: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const stats = {
      pending: await db.community.count({ where: { status: "PENDING" } }),
      approved: await db.community.count({ where: { status: "APPROVED" } }),
      rejected: await db.community.count({ where: { status: "REJECTED" } }),
      total: communities.length,
    };

    return NextResponse.json({ communities, stats });
  } catch (error) {
    console.error("GET /api/admin/komunitas error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const body = await req.json();
    const { id, action, reviewNote } = body;

    if (!id || !action) return NextResponse.json({ error: "ID and action required" }, { status: 400 });

    const community = await db.community.findUnique({ where: { id } });
    if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

    if (action === "approve") {
      const updated = await db.community.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewNote: null,
          reviewedBy: dbUser.id,
          reviewedAt: new Date(),
        },
      });

      await db.communityMember.create({
        data: { communityId: id, userId: community.creatorId!, role: "admin" },
      });

      await db.community.update({
        where: { id },
        data: { memberCount: { increment: 1 } },
      });

      return NextResponse.json({ success: true, community: updated, message: "Komunitas disetujui" });
    }

    if (action === "reject") {
      if (!reviewNote) return NextResponse.json({ error: "Alasan penolakan diperlukan" }, { status: 400 });

      const updated = await db.community.update({
        where: { id },
        data: {
          status: "REJECTED",
          reviewNote,
          reviewedBy: dbUser.id,
          reviewedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, community: updated, message: "Komunitas ditolak" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("PUT /api/admin/komunitas error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const community = await db.community.findUnique({ where: { id } });
    if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

    await db.community.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Komunitas dihapus" });
  } catch (error) {
    console.error("DELETE /api/admin/komunitas error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
