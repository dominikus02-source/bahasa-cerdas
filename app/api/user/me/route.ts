import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

const FOUNDER_EMAILS = ["hdsastra47@gmail.com", "dominikus.02@gmail.com", "alexsurya1968@gmail.com"];

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email = user.email?.toLowerCase() || "";
    let dbUser = await db.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!dbUser) {
      dbUser = await db.user.findFirst({ where: { email } });
      if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
      if (dbUser.supabaseId !== user.id) {
        await db.user.update({ where: { id: dbUser.id }, data: { supabaseId: user.id } });
      }
    }

    if (FOUNDER_EMAILS.includes(email) && !dbUser.isFounder) {
      dbUser = await db.user.update({
        where: { id: dbUser.id },
        data: { isFounder: true, isPremium: true, premiumPlan: "PRO" },
      });
    }

    return NextResponse.json({ user: dbUser });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email = user.email?.toLowerCase() || "";
    const fullName = user.user_metadata?.full_name || email.split("@")[0] || "User";
    const role = (user.user_metadata?.role as string)?.toUpperCase() === "GURU" ? "GURU" : "MURID";

    const existing = await db.user.findFirst({ where: { email } });
    if (existing) {
      const updates: any = {};
      if (existing.supabaseId !== user.id) updates.supabaseId = user.id;
      if (FOUNDER_EMAILS.includes(email) && !existing.isFounder) {
        updates.isFounder = true;
        updates.isPremium = true;
        updates.premiumPlan = "PRO";
      }
      if (Object.keys(updates).length > 0) {
        await db.user.update({ where: { id: existing.id }, data: updates });
      }
      const updated = Object.keys(updates).length > 0
        ? await db.user.findUnique({ where: { id: existing.id } })
        : existing;
      return NextResponse.json({ user: updated });
    }

    const isFounder = FOUNDER_EMAILS.includes(email);
    const dbUser = await db.user.create({
      data: {
        supabaseId: user.id,
        email,
        fullName,
        role,
        isFounder,
        isPremium: isFounder,
        premiumPlan: isFounder ? "PRO" : "FREE",
      },
    });

    try { await db.profile.create({ data: { userId: dbUser.id } }); } catch {}

    return NextResponse.json({ user: dbUser });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
