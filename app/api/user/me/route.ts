import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGravatarUrl } from "@/lib/avatar";

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
    const { createClient } = await import("@/lib/supabase/server");
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
  } catch (e: any) {
    console.error("GET /api/user/me error:", e?.message || e);
    return NextResponse.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: { supabaseId?: string; email?: string; fullName?: string; role?: string } = {};
    try { body = await request.json(); } catch {}

    if (!body.supabaseId || !body.email) {
      // Try reading query params as last resort
      const { searchParams } = new URL(request.url);
      body.supabaseId = body.supabaseId || searchParams.get("supabaseId") || undefined;
      body.email = body.email || searchParams.get("email") || undefined;
      body.fullName = body.fullName || searchParams.get("fullName") || undefined;
      body.role = body.role || searchParams.get("role") || undefined;
    }

    if (!body.supabaseId || !body.email) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const user = await findOrCreateUser({
      supabaseId: body.supabaseId,
      email: body.email,
      fullName: body.fullName || body.email.split("@")[0],
      role: body.role || "MURID",
    });

    return NextResponse.json({ user });
  } catch (e: any) {
    console.error("POST /api/user/me error:", e?.message || e, e?.stack || "");
    return NextResponse.json({ error: `Gagal: ${e?.message || "Internal server error"}` }, { status: 500 });
  }
}
