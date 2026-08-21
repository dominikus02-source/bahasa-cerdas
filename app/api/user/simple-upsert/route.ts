import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGravatarUrl } from "@/lib/avatar";

const FOUNDER_EMAILS = ["hdsastra47@gmail.com", "dominikus.02@gmail.com", "alexsurya1968@gmail.com"];

export async function POST(request: NextRequest) {
  try {
    let supabaseId = "";
    let email = "";
    let fullName = "";
    let role = "MURID";

    try {
      const body = await request.json();
      supabaseId = body.supabaseId || "";
      email = (body.email || "").toLowerCase();
      fullName = body.fullName || email.split("@")[0] || "User";
      role = body.role || "MURID";
    } catch {
      const { searchParams } = new URL(request.url);
      supabaseId = searchParams.get("supabaseId") || "";
      email = (searchParams.get("email") || "").toLowerCase();
      fullName = searchParams.get("fullName") || email.split("@")[0] || "User";
      role = searchParams.get("role") || "MURID";
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
      if (FOUNDER_EMAILS.includes(email) && !user.isFounder) {
        updates.isFounder = true;
        updates.isPremium = true;
        updates.premiumPlan = "PRO";
      }
      if (Object.keys(updates).length > 0) {
        await db.user.update({ where: { id: user.id }, data: updates });
      }
      return NextResponse.json({
        user: Object.keys(updates).length > 0
          ? await db.user.findUnique({ where: { id: user.id }, select: userSelect })
          : user,
      });
    }

    // Create new user
    const isFounder = FOUNDER_EMAILS.includes(email);
    const newUser = await db.user.create({
      data: {
        supabaseId,
        email,
        fullName,
        avatar: getGravatarUrl(email),
        role: role === "GURU" ? "GURU" : "MURID",
        isFounder,
        isPremium: isFounder,
        premiumPlan: isFounder ? "PRO" : "FREE",
      },
    });

    try { await db.profile.create({ data: { userId: newUser.id } }); } catch {}

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (e: any) {
    console.error("simple-upsert error:", e?.message || e);
    return NextResponse.json({ error: "Gagal: " + (e?.message || "unknown") }, { status: 500 });
  }
}
