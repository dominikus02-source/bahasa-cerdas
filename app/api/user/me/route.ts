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

    // The authenticated Supabase ID is the stable account identity.
    // Never use email as the primary lookup key: Auth email can legitimately
    // change (e.g. teacher changes from an old school address to a new one).
    // Looking up by the new email first can make an existing account appear
    // "missing" even though the Supabase session is perfectly valid.
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims?.sub) {
      return NextResponse.json({ success: true, user: null, data: { user: null } });
    }

    const supabaseId = String(data.claims.sub);
    const email = String(data.claims.email || "").toLowerCase();
    const cacheKey = `user:me:id:${supabaseId}`;
    const cached = await cache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json(
        { success: true, user: cached, data: { user: cached } },
        { headers: { "X-Cache": "HIT", "Cache-Control": "private, max-age=30" } }
      );
    }

    // PRIMARY: stable Supabase identity.
    let found: any = await db.user.findUnique({
      where: { supabaseId },
      select: userSessionFields,
    });

    // Legacy repair path: if the account predates supabaseId linkage, recover it
    // by email ONCE, then attach the stable Supabase ID. This path never changes
    // the stored application role.
    if (!found && email) {
      found = await db.user.findFirst({
        where: { email },
        select: userSessionFields,
      });
    }

    // GET never provisions a new application User and never changes role.
    if (!found) return err(ERR.NOT_FOUND.error, ERR.NOT_FOUND.code, ERR.NOT_FOUND.status);

    const updates: Record<string, unknown> = {};
    if (found.supabaseId !== supabaseId) updates.supabaseId = supabaseId;

    // Keep the application email synchronized with Supabase Auth when the
    // authenticated owner changed email. Do not overwrite another account's
    // email: an email collision must remain an explicit account-management
    // problem rather than becoming an implicit account merge.
    if (email && found.email !== email) {
      const emailOwner = await db.user.findFirst({
        where: { email, NOT: { id: found.id } },
        select: { id: true },
      });
      if (!emailOwner) {
        updates.email = email;
      } else {
        console.error("AUTH_EMAIL_SYNC_CONFLICT", {
          supabaseId,
          userId: found.id,
        });
      }
    }

    let synced = found;
    if (Object.keys(updates).length > 0) {
      await db.user.update({ where: { id: found.id }, data: updates });
      synced = { ...found, ...updates };
    }

    const profile = await db.profile.findUnique({ where: { userId: found.id } });
    const result = {
      ...synced,
      ...profile,
      avatar: synced.avatar || "",
    };

    // Cache by immutable Supabase ID, not email. Email changes therefore do
    // not strand the session behind a stale cache key.
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
    let body: { fullName?: string; role?: string } = {};
    try { body = await request.json(); } catch {}

    // Never trust supabaseId/email supplied by the browser. This endpoint is
    // reachable from /api/* without a middleware auth gate, so accepting those
    // fields from the client could let an attacker impersonate/link another
    // application account. The Supabase JWT is the source of identity.
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    if (claimsError || !claimsData?.claims?.sub) {
      return err("Sesi tidak valid", "UNAUTHORIZED", 401);
    }

    const supabaseId = String(claimsData.claims.sub);
    const email = String(claimsData.claims.email || "").toLowerCase();
    if (!email) return err("Email akun tidak tersedia", "UNAUTHORIZED", 401);

    // GOOGLE ROLE SELECTION: creation requires an explicit allowlisted role.
    // Existing accounts are always returned with their stored role; the client
    // cannot mutate GURU ↔ MURID through this sync endpoint.
    if (body.role !== undefined && body.role !== "GURU" && body.role !== "MURID") {
      return err("Peran tidak valid", "VALIDATION", 400);
    }

    const user = await findOrCreateUser({
      supabaseId,
      email,
      fullName: body.fullName || email.split("@")[0],
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
