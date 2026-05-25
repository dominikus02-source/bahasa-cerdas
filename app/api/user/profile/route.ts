import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    const users = await db.user.findMany({
      where: query ? { fullName: { contains: query, mode: "insensitive" } } : undefined,
      select: { id: true, fullName: true, avatar: true, role: true, xp: true, level: true, streak: true, league: true },
      take: 20,
    });

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { fullName, avatar, bio, nip, nuptk, school, city, province, subject, grade } = body;

    await db.user.update({
      where: { id: user.id },
      data: { fullName, avatar },
    });

    const profileData: Record<string, any> = { bio, school, city, province };
    if (grade) profileData.grade = grade;
    if (nip) profileData.nip = nip;
    if (nuptk) profileData.nuptk = nuptk;
    if (subject) profileData.subject = subject;

    const existing = await db.profile.findUnique({ where: { userId: user.id } });
    if (existing) {
      await db.profile.update({ where: { userId: user.id }, data: profileData });
    } else {
      await db.profile.create({ data: { userId: user.id, ...profileData } });
    }

    return NextResponse.json({ message: "Updated" });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
