import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser, createClient } from "@/lib/supabase/server";
import { getGravatarUrl } from "@/lib/avatar";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const FOUNDER_EMAILS = ["hdsastra47@gmail.com", "dominikus.02@gmail.com", "alexsurya1968@gmail.com"];

async function findOrCreateUser(opts: {
  supabaseId: string;
  email: string;
  fullName: string;
  role: string;
}) {
  const { supabaseId, email, fullName, role } = opts;
  const lowerEmail = email.toLowerCase();

  let user = await db.user.findUnique({ where: { supabaseId } });
  if (!user) user = await db.user.findFirst({ where: { email: lowerEmail } });

  if (user) {
    const updates: Record<string, unknown> = {};
    if (user.supabaseId !== supabaseId) updates.supabaseId = supabaseId;
    if (FOUNDER_EMAILS.includes(lowerEmail) && !user.isFounder) {
      updates.isFounder = true;
      updates.isPremium = true;
      updates.premiumPlan = "PRO";
    }
    if (Object.keys(updates).length > 0) {
      await db.user.update({ where: { id: user.id }, data: updates });
    }
    return Object.keys(updates).length > 0
      ? db.user.findUnique({ where: { id: user.id } })
      : user;
  }

  const isFounder = FOUNDER_EMAILS.includes(lowerEmail);
  const newUser = await db.user.create({
    data: {
      supabaseId,
      email: lowerEmail,
      fullName,
      avatar: getGravatarUrl(lowerEmail),
      role: role === "GURU" ? "GURU" : "MURID",
      isFounder,
      isPremium: isFounder,
      premiumPlan: isFounder ? "PRO" : "FREE",
    },
  });

  try { await db.profile.create({ data: { userId: newUser.id } }); } catch {}
  return newUser;
}

export async function GET() {
  try {
    const dbUser = await getUser();
    if (dbUser) {
      const profile = await db.profile.findUnique({ where: { userId: dbUser.id } });
      return NextResponse.json({ user: { ...dbUser, ...profile } });
    }

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
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Priority 1: Server-side session verification
    const existingDbUser = await getUser();
    if (existingDbUser) return NextResponse.json({ user: existingDbUser });

    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    let resolvedUser = authUser;
    if (!resolvedUser) {
      const { data: { session } } = await supabase.auth.getSession();
      resolvedUser = session?.user ?? null;
    }

    if (resolvedUser?.email) {
      const user = await findOrCreateUser({
        supabaseId: resolvedUser.id,
        email: resolvedUser.email,
        fullName: resolvedUser.user_metadata?.full_name || resolvedUser.email.split("@")[0],
        role: (resolvedUser.user_metadata?.role as string)?.toUpperCase() === "GURU" ? "GURU" : "MURID",
      });
      return NextResponse.json({ user });
    }

    // Priority 2: Fallback to client-provided data from signInWithPassword
    let body: { supabaseId?: string; email?: string; fullName?: string; role?: string } = {};
    try { body = await request.json(); } catch {}

    if (body.supabaseId && body.email) {
      const user = await findOrCreateUser({
        supabaseId: body.supabaseId,
        email: body.email,
        fullName: body.fullName || body.email.split("@")[0],
        role: body.role || "MURID",
      });
      return NextResponse.json({ user });
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } catch (e: any) {
    console.error("POST /api/user/me error:", e?.message || e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
