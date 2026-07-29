import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGravatarUrl } from "@/lib/avatar";
import { transformImageUrl } from "@/lib/image-transform";
import cache from "@/lib/redis";
import { err } from "@/lib/api/response";
import { ERR } from "@/lib/api/errors";

const FOUNDER_EMAILS = ["hdsastra47@gmail.com", "dominikus.02@gmail.com", "alexsurya1968@gmail.com"];
const PROMO_PREMIUM_UNTIL = new Date();
PROMO_PREMIUM_UNTIL.setMonth(PROMO_PREMIUM_UNTIL.getMonth() + 2);

const userSessionFields = {
  id: true, supabaseId: true, email: true, fullName: true, nickname: true, nicknameUpdatedAt: true,
  avatar: true, role: true, isFounder: true, isPremium: true, premiumPlan: true, premiumUntil: true,
  xp: true, level: true, streak: true, league: true, coins: true, totalLikes: true, totalViews: true,
  createdAt: true, school: true, city: true, province: true, grade: true, bio: true,
} as const;

async function findOrCreateUser(opts: {
  supabaseId: string;
  email: string;
  fullName: string;
  role: string;
}) {
  const { supabaseId, email, fullName, role } = opts;
  const lowerEmail = email.toLowerCase();

  let user = await db.user.findUnique({ where: { supabaseId }, select: userSessionFields });
  if (!user) user = await db.user.findFirst({ where: { email: lowerEmail }, select: userSessionFields });

  if (user) {
    const updates: Record<string, unknown> = {};
    if (user.supabaseId !== supabaseId) updates.supabaseId = supabaseId;
    if (FOUNDER_EMAILS.includes(lowerEmail) && !user.isFounder) {
      updates.isFounder = true;
      updates.isPremium = true;
      updates.premiumPlan = "PRO";
    }
    // Promo 2 bulan: upgrade GURU ke PRO
    if (role === "GURU" && !user.isFounder && (!user.isPremium || !user.premiumUntil || user.premiumUntil < new Date())) {
      updates.isPremium = true;
      updates.premiumPlan = "PRO";
      updates.premiumUntil = PROMO_PREMIUM_UNTIL;
    }
    if (Object.keys(updates).length > 0) {
      await db.user.update({ where: { id: user.id }, data: updates });
    }
    return Object.keys(updates).length > 0
      ? db.user.findUnique({ where: { id: user.id }, select: userSessionFields })
      : user;
  }

  const isFounder = FOUNDER_EMAILS.includes(lowerEmail);
  const isGuru = role === "GURU";
  const newUser = await db.user.create({
    data: {
      supabaseId,
      email: lowerEmail,
      fullName,
      avatar: getGravatarUrl(lowerEmail),
      role: isGuru ? "GURU" : "MURID",
      isFounder,
      isPremium: isFounder || isGuru,
      premiumPlan: isFounder || isGuru ? "PRO" : "FREE",
      premiumUntil: isGuru && !isFounder ? PROMO_PREMIUM_UNTIL : undefined,
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
    if (!user) return NextResponse.json({ success: true, user: null, data: { user: null } });

    const email = user.email?.toLowerCase() || "";
    const cacheKey = `user:me:${email}`;
    const cached = await cache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json(
        { success: true, user: cached, data: { user: cached } },
        { headers: { "X-Cache": "HIT", "Cache-Control": "private, max-age=30" } }
      );
    }

    const existing = await db.user.findFirst({ where: { email }, select: userSessionFields });
    let found: any = existing;
    if (!found) {
      found = await findOrCreateUser({
        supabaseId: user.id,
        email,
        fullName: user.user_metadata?.full_name || email.split("@")[0],
        role: user.user_metadata?.role || "MURID",
      });
    }
    if (!found) return err(ERR.NOT_FOUND.error, ERR.NOT_FOUND.code, ERR.NOT_FOUND.status);

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
    const result = {
      ...found,
      ...profile,
      ...updates,
      avatar: transformImageUrl(found.avatar, { width: 160, height: 160, quality: 85 }),
    };

    // Cache for 30s — short enough to stay fresh, long enough to absorb bursts
    cache.set(cacheKey, result, 30);

    return NextResponse.json(
      { success: true, user: result, data: { user: result } },
      { headers: { "X-Cache": "MISS", "Cache-Control": "private, max-age=30" } }
    );
  } catch (e: any) {
    console.error("GET /api/user/me error:", e?.message || e);
    return err(ERR.INTERNAL.error, ERR.INTERNAL.code, ERR.INTERNAL.status);
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
      return err("Data tidak lengkap", "VALIDATION", 400);
    }

    const user = await findOrCreateUser({
      supabaseId: body.supabaseId,
      email: body.email,
      fullName: body.fullName || body.email.split("@")[0],
      role: body.role || "MURID",
    });

    return NextResponse.json({ success: true, user, data: { user } });
  } catch (e: any) {
    console.error("POST /api/user/me error:", e?.message || e, e?.stack || "");
    return err(ERR.INTERNAL.error, ERR.INTERNAL.code, ERR.INTERNAL.status);
  }
}
