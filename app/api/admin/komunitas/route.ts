import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || !dbUser.isFounder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status && status !== "ALL") where.status = status;

    const [communities, pending, approved, rejected] = await Promise.all([
      db.community.findMany({
        where,
        include: { creator: { select: { id: true, fullName: true, email: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.community.count({ where: { status: "PENDING" } }),
      db.community.count({ where: { status: "APPROVED" } }),
      db.community.count({ where: { status: "REJECTED" } }),
    ]);

    return NextResponse.json({
      communities,
      stats: { pending, approved, rejected, total: communities.length },
    });
  } catch (error) {
    console.error("GET /api/admin/komunitas error:", error);
    return NextResponse.json({ error: "Internal error", details: String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || !dbUser.isFounder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { id, action, reviewNote } = body;
    if (!id || !action) return NextResponse.json({ error: "ID and action required" }, { status: 400 });

    const community = await db.community.findUnique({ where: { id } });
    if (!community) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (action === "approve") {
      const updated = await db.community.update({
        where: { id },
        data: { status: "APPROVED", reviewNote: null, reviewedBy: dbUser.id, reviewedAt: new Date() },
      });

      if (community.creatorId) {
        const exists = await db.communityMember.findUnique({
          where: { communityId_userId: { communityId: id, userId: community.creatorId } },
        });
        if (!exists) {
          await db.communityMember.create({ data: { communityId: id, userId: community.creatorId, role: "admin" } });
          await db.community.update({ where: { id }, data: { memberCount: { increment: 1 } } });
        }
      }

      return NextResponse.json({ success: true, message: "Disetujui" });
    }

    if (action === "reject") {
      if (!reviewNote?.trim()) return NextResponse.json({ error: "Alasan diperlukan" }, { status: 400 });
      await db.community.update({
        where: { id },
        data: { status: "REJECTED", reviewNote, reviewedBy: dbUser.id, reviewedAt: new Date() },
      });
      return NextResponse.json({ success: true, message: "Ditolak" });
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
    if (!dbUser || !dbUser.isFounder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await db.community.update({
      where: { id },
      data: { isPublic: false, status: "REJECTED", reviewNote: "Diarsipkan oleh admin", reviewedBy: dbUser.id, reviewedAt: new Date() },
    });
    return NextResponse.json({ success: true, message: "Komunitas diarsipkan" });
  } catch (error) {
    console.error("DELETE /api/admin/komunitas error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
