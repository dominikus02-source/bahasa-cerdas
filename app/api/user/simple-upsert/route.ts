import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGravatarUrl } from "@/lib/avatar";

export async function POST(request: NextRequest) {
  try {
    let supabaseId = "";
    let email = "";
    let fullName = "";
    let role: string | undefined;

    try {
      const body = await request.json();
      supabaseId = body.supabaseId || "";
      email = (body.email || "").toLowerCase();
      fullName = body.fullName || email.split("@")[0] || "User";
      role = body.role;
    } catch {
      const { searchParams } = new URL(request.url);
      supabaseId = searchParams.get("supabaseId") || "";
      email = (searchParams.get("email") || "").toLowerCase();
      fullName = searchParams.get("fullName") || email.split("@")[0] || "User";
      role = searchParams.get("role") || undefined;
    }

    if (!supabaseId || !email) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // Try to find existing user by supabaseId or email
    // NOTE: explicit select avoids 500 when DB schema is behind Prisma client
    const userSelect = {
      id: true, supabaseId: true, email: true, fullName: true, nickname: true,
      avatar: true, role: true, isFounder: true, isPremium: true, premiumPlan: true,
      xp: true, level: true, streak: true, coins: true, createdAt: true,
    } as const;
    let user = await db.user.findUnique({ where: { supabaseId }, select: userSelect });
    if (!user) user = await db.user.findFirst({ where: { email }, select: userSelect });

    if (user) {
      const updates: Record<string, unknown> = {};
      if (user.supabaseId !== supabaseId) updates.supabaseId = supabaseId;
      if (Object.keys(updates).length > 0) {
        await db.user.update({ where: { id: user.id }, data: updates });
      }
      return NextResponse.json({
        user: Object.keys(updates).length > 0
          ? await db.user.findUnique({ where: { id: user.id }, select: userSelect })
          : user,
      });
    }

    // GOOGLE ROLE SELECTION: creation requires an explicit allowlisted role.
    // Missing/invalid roles are rejected (route to role selection) instead of
    // silently provisioning MURID. Existing users are unaffected (returned
    // above with their role preserved).
    if (role !== "GURU" && role !== "MURID") {
      return NextResponse.json(
        { error: "Peran belum dipilih", code: "ROLE_REQUIRED" },
        { status: 400 }
      );
    }

    // Create new user — founder flag is set via DB, not email
    const newUser = await db.user.create({
      data: {
        supabaseId,
        email,
        fullName,
        avatar: getGravatarUrl(email),
        role,
      },
    });

    try { await db.profile.create({ data: { userId: newUser.id } }); } catch {}

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (e: any) {
    console.error("simple-upsert error:", e?.message || e);
    return NextResponse.json({ error: "Gagal: " + (e?.message || "unknown") }, { status: 500 });
  }
}
