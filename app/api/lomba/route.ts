import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const level = searchParams.get("level");
    const type = searchParams.get("type");

    const where: any = {};
    if (status) where.status = status;
    if (level) where.level = level;
    if (type) where.type = type;

    const lombas = await db.lomba.findMany({
      where,
      orderBy: { date: "asc" },
      take: 50,
    });

    return NextResponse.json({ lombas });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, description, type, level, date, registrationDeadline, prize, rules, posterUrl, location, contact, registrationUrl } = body;

    const lomba = await db.lomba.create({
      data: {
        title,
        description,
        type,
        level,
        date: new Date(date),
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        prize,
        rules,
        posterUrl,
        location,
        contact,
        registrationUrl,
      },
    });

    return NextResponse.json({ lomba }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}