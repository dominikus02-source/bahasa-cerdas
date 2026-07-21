import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isCatalogAvatar, findAvatar } from "@/lib/avatar/katalog";

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

    // Catalogue avatars are earned by finishing Jalur Cerdas units. The picker
    // greys out the locked ones, but the lock has to hold here too — otherwise
    // any student could set a locked avatar by posting the path directly, and
    // the reward would be worth nothing. Uploaded avatars (Supabase Storage or
    // a Google photo) are not catalogue entries and pass through untouched.
    if (isCatalogAvatar(avatar)) {
      const item = findAvatar(avatar)!;
      if (item.unlockUnits > 0) {
        const completedUnits = await db.userUnitProgress.count({
          where: { userId: user.id, completed: true },
        });
        if (completedUnits < item.unlockUnits) {
          return NextResponse.json(
            {
              error: `Avatar ini terbuka setelah menyelesaikan ${item.unlockUnits} materi di Jalur Cerdas.`,
              code: "AVATAR_LOCKED",
            },
            { status: 403 }
          );
        }
      }
    }

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
