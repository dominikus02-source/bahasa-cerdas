import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser, createClient } from "@/lib/supabase/server";
import { getGravatarUrl } from "@/lib/avatar";

const FOUNDER_EMAILS = ["hdsastra47@gmail.com", "dominikus.02@gmail.com", "alexsurya1968@gmail.com"];

export async function GET() {
  try {
    const dbUser = await getUser();
    if (!dbUser) {
      // Try to find/create via supabase session as fallback
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ user: null });
      const email = user.email?.toLowerCase() || "";
      const found = await db.user.findFirst({ where: { email } });
      if (!found) return NextResponse.json({ error: "User not found" }, { status: 404 });
      const updates: Record<string, unknown> = {};
      if (found.supabaseId !== user.id) updates.supabaseId = user.id;
      if (FOUNDER_EMAILS.includes(email) && !found.isFounder) {
        updates.isFounder = true;
        updates.isPremium = true;
        updates.premiumPlan = "PRO";
      }
      if (Object.keys(updates).length > 0) {
        await db.user.update({ where: { id: found.id }, data: updates });
      }
      const profile = await db.profile.findUnique({ where: { userId: found.id } });
      return NextResponse.json({ user: { ...found, ...profile, ...updates } });
    }

    const profile = await db.profile.findUnique({ where: { userId: dbUser.id } });
    return NextResponse.json({ user: { ...dbUser, ...profile } });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const existingDbUser = await getUser();
    if (existingDbUser) return NextResponse.json({ user: existingDbUser });

    const supabase = await createClient();

    // Try getUser first, then fallback to getSession
    const { data: { user: authUser } } = await supabase.auth.getUser();
    let resolvedUser = authUser;
    if (!resolvedUser) {
      const { data: { session } } = await supabase.auth.getSession();
      resolvedUser = session?.user ?? null;
    }

    if (!resolvedUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email = resolvedUser.email?.toLowerCase() || "";
    if (!email) return NextResponse.json({ error: "Email tidak ditemukan" }, { status: 400 });

    const fullName = resolvedUser.user_metadata?.full_name || email.split("@")[0] || "User";
    const role = (resolvedUser.user_metadata?.role as string)?.toUpperCase() === "GURU" ? "GURU" : "MURID";

    const existing = await db.user.findFirst({ where: { email } });
    if (existing) {
      const updates: Record<string, unknown> = {};
      if (existing.supabaseId !== resolvedUser.id) updates.supabaseId = resolvedUser.id;
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
    const newUser = await db.user.create({
      data: {
        supabaseId: resolvedUser.id,
        email,
        fullName,
        avatar: getGravatarUrl(email),
        role,
        isFounder,
        isPremium: isFounder,
        premiumPlan: isFounder ? "PRO" : "FREE",
      },
    });

    try { await db.profile.create({ data: { userId: newUser.id } }); } catch {}

    return NextResponse.json({ user: newUser });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
