import { db } from "@/lib/db";
import { getGravatarUrl } from "@/lib/avatar";
import type { GoogleRoleIntent } from "@/lib/auth/role-intent";

/**
 * Shared Google-provisioning primitive.
 *
 * - Finds the application User by supabaseId, then by email (backfills
 *   supabaseId on email match). Existing users are returned with
 *   created:false and their role is NEVER modified here.
 * - Creates only when no User exists, with an EXPLICIT caller-validated role.
 *   There is intentionally no default: callers must pass a role that came from
 *   a verified intent or an in-session explicit choice.
 */
export async function provisionGoogleUser(opts: {
  supabaseId: string;
  email: string;
  fullName: string;
  role: GoogleRoleIntent;
}) {
  const { supabaseId, role } = opts;
  const email = opts.email.toLowerCase();
  const fullName = opts.fullName || email.split("@")[0] || "User";

  let user = await db.user.findUnique({ where: { supabaseId } });
  if (!user) user = await db.user.findFirst({ where: { email } });

  if (user) {
    if (user.supabaseId !== supabaseId) {
      await db.user.update({ where: { id: user.id }, data: { supabaseId } });
    }
    return { user, created: false as const };
  }

  const created = await db.user.create({
    data: {
      supabaseId,
      email,
      fullName,
      avatar: getGravatarUrl(email),
      role,
    },
  });
  try {
    await db.profile.create({ data: { userId: created.id } });
  } catch {}
  return { user: created, created: true as const };
}

/** Read-only lookup used by callbacks: never creates, never mutates role. */
export async function findApplicationUser(opts: { supabaseId: string; email: string }) {
  const email = opts.email.toLowerCase();
  let user = await db.user.findUnique({ where: { supabaseId: opts.supabaseId } });
  if (!user && email) user = await db.user.findFirst({ where: { email } });
  return user;
}
