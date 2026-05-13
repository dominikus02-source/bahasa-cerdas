import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const data = await db.loker.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    return NextResponse.json({ data });
  } catch { return NextResponse.json({ error: "Internal error" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { title, sekolah, lokasi, description, requirements, salary, type, contact, applicationUrl } = body;
    if (!title || !sekolah || !lokasi || !description) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const loker = await db.loker.create({
      data: { title, sekolah, lokasi, description, requirements, salary, type, contact, applicationUrl, isApproved: true, authorId: user.id },
    });

    return NextResponse.json({ loker }, { status: 201 });
  } catch { return NextResponse.json({ error: "Internal error" }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const loker = await db.loker.update({ where: { id }, data });
    return NextResponse.json({ loker });
  } catch { return NextResponse.json({ error: "Internal error" }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await db.loker.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Internal error" }, { status: 500 }); }
}
