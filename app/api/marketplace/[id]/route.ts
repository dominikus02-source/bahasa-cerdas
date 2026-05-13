import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const karya = await db.karya.findUnique({
      where: { id: params.id, isPublished: true },
      include: {
        seller: { select: { id: true, fullName: true, avatar: true } },
        _count: { select: { purchases: true } },
      },
    });

    if (!karya) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ karya });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
