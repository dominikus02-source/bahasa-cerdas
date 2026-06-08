import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import cache from "@/lib/redis";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const cacheKey = `notif:${user.id}:${unreadOnly}`;

    const cached = await cache.get<{ notifications: unknown[]; unreadCount: number }>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const notifications = await db.notifikasi.findMany({
      where: {
        userId: user.id,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = await db.notifikasi.count({
      where: { userId: user.id, isRead: false },
    });

    const result = { notifications, unreadCount };
    await cache.set(cacheKey, result, 30);

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, body: bodyText, type, data } = body;

    if (!title || !bodyText) {
      return NextResponse.json({ error: "Title and body required" }, { status: 400 });
    }

    const notification = await db.notifikasi.create({
      data: {
        userId: user.id,
        title,
        body: bodyText,
        type: type || "info",
        data: data || null,
      },
    });

    await cache.delPattern(`notif:${user.id}:*`);

    return NextResponse.json({ notification }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, markAllRead } = body;

    if (markAllRead) {
      await db.notifikasi.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });
      await cache.delPattern(`notif:${user.id}:*`);
      return NextResponse.json({ success: true, message: "Semua notifikasi ditandai sudah dibaca" });
    }

    if (id) {
      await db.notifikasi.update({
        where: { id, userId: user.id },
        data: { isRead: true },
      });
      await cache.delPattern(`notif:${user.id}:*`);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const all = searchParams.get("all");

    if (all === "true") {
      await db.notifikasi.deleteMany({ where: { userId: user.id } });
      await cache.delPattern(`notif:${user.id}:*`);
      return NextResponse.json({ success: true });
    }

    if (id) {
      await db.notifikasi.delete({ where: { id, userId: user.id } });
      await cache.delPattern(`notif:${user.id}:*`);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
