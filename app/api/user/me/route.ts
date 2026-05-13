import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({
      where: { supabaseId: user.id },
    });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

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
      if (existing.supabaseId !== user.id) {
        await db.user.update({ where: { id: existing.id }, data: { supabaseId: user.id } });
      }
      return NextResponse.json({ user: existing });
    }

    const isFounder = email === "dominus.02@gmail.com";
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
