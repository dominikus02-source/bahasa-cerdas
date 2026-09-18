import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGravatarUrl } from "@/lib/avatar";

import cache from "@/lib/redis";
import { err } from "@/lib/api/response";
import { ERR } from "@/lib/api/errors";

const userSessionFields = {
  id: true, supabaseId: true, email: true, fullName: true, nickname: true, nicknameUpdatedAt: true,
  avatar: true, role: true, isFounder: true, isPremium: true, premiumPlan: true, premiumUntil: true,
  xp: true, level: true, streak: true, league: true, coins: true, totalLikes: true, totalViews: true,
  equippedNameColor: true, equippedBadge: true,
  equippedFrame: true, equippedBackground: true, equippedNameplate: true,
  createdAt: true,
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
    if (Object.keys(updates).length > 0) {
      await db.user.update({ where: { id: user.id }, data: updates });
    }
    return Object.keys(updates).length > 0
      ? db.user.findUnique({ where: { id: user.id }, select: userSessionFields })
      : user;
  }

  // GOOGLE ROLE SELECTION: never silently provision here. New users complete
  // provisioning via /auth/pilih-peran (POST /api/auth/complete-role) or an
  // OAuth callback carrying a verified role intent. Only an EXPLICIT,
  // allowlisted role may create a row — anything else returns null so the
  // caller routes to role selection instead of a default MURID account.
  if (role !== "GURU" && role !== "MURID") return null;

  const newUser = await db.user.create({
    data: {
      supabaseId,
      email: lowerEmail,
      fullName,
      avatar: getGravatarUrl(lowerEmail),
      role,
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
    // GOOGLE ROLE SELECTION: GET never provisions. A session without an
    // application User means provisioning is incomplete (new Google user) —
    // return null so clients route to /auth/pilih-peran instead of receiving
    // a silently defaulted MURID account.
    const found: any = existing;
    if (!found) return err(ERR.NOT_FOUND.error, ERR.NOT_FOUND.code, ERR.NOT_FOUND.status);

    const updates: Record<string, unknown> = {};
    if (found.supabaseId !== user.id) updates.supabaseId = user.id;
    if (Object.keys(updates).length > 0) {
      await db.user.update({ where: { id: found.id }, data: updates });
    }

    const profile = await db.profile.findUnique({ where: { userId: found.id } });
    const result = {
      ...found,
      ...profile,
      ...updates,
      avatar: found.avatar || "",
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

    // GOOGLE ROLE SELECTION: creation requires an explicit allowlisted role.
    // Missing/invalid roles are rejected (route to role selection) instead of
    // silently provisioning MURID.
    if (body.role !== undefined && body.role !== "GURU" && body.role !== "MURID") {
      return err("Peran tidak valid", "VALIDATION", 400);
    }

    const user = await findOrCreateUser({
      supabaseId: body.supabaseId,
      email: body.email,
      fullName: body.fullName || body.email.split("@")[0],
      role: body.role ?? "",
    });
    if (!user) {
      return err("Peran belum dipilih", "ROLE_REQUIRED", 400);
    }

    return NextResponse.json({ success: true, user, data: { user } });
  } catch (e: any) {
    console.error("POST /api/user/me error:", e?.message || e, e?.stack || "");
    return err(ERR.INTERNAL.error, ERR.INTERNAL.code, ERR.INTERNAL.status);
  }
}
