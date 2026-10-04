"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { registerSchema, sanitize } from "@/lib/validations";

export async function registerUser(formData: FormData) {
  try {
    const parsed = registerSchema.safeParse({
      email: formData.get("email"),
      supabaseId: formData.get("supabaseId"),
      fullName: formData.get("fullName"),
      role: formData.get("role"),
      school: formData.get("school") || null,
      city: formData.get("city") || null,
      province: formData.get("province") || null,
    });

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Data tidak valid";
      return { error: firstError };
    }

    const { email, supabaseId, fullName, role, school, city, province } = parsed.data;
    const auth = await createClient();
    const { data } = await auth.auth.getClaims();
    if (data?.claims?.sub !== supabaseId || data.claims.email?.toLowerCase() !== email.toLowerCase()) return { error: "Masuk terlebih dahulu untuk melengkapi profil." };
    const normalizedEmail = email.toLowerCase();
    const sanitizedName = sanitize(fullName);

    const existingUser = await db.user.findFirst({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      if (existingUser.supabaseId === supabaseId) {
        // The Auth + User rows were already provisioned by /api/auth/create-user.
        // Registration now only enriches the optional profile fields, making
        // the flow idempotent instead of failing after Auth succeeds.
        try {
          await db.profile.upsert({
            where: { userId: existingUser.id },
            update: {
              ...(school ? { school: sanitize(school) } : {}),
              ...(city ? { city: sanitize(city) } : {}),
              ...(province ? { province: sanitize(province) } : {}),
            },
            create: {
              userId: existingUser.id,
              ...(school ? { school: sanitize(school) } : {}),
              ...(city ? { city: sanitize(city) } : {}),
              ...(province ? { province: sanitize(province) } : {}),
            },
          });
        } catch {
          // Profile fields are supplementary; don't block account creation.
        }

        return { ok: true, role: existingUser.role.toLowerCase() };
      }

      return { error: "Email sudah terdaftar dengan akun lain" };
    }

    // Legacy fallback for callers that still reach this action without the
    // new create-user provisioning step.
    const newUser = await db.user.create({
      data: {
        supabaseId,
        email: normalizedEmail,
        fullName: sanitizedName,
        role,
      },
    });

    try {
      await db.profile.create({
        data: {
          userId: newUser.id,
          ...(school ? { school: sanitize(school) } : {}),
          ...(city ? { city: sanitize(city) } : {}),
          ...(province ? { province: sanitize(province) } : {}),
        },
      });
    } catch {}

    return { ok: true, role: role.toLowerCase() };
  } catch (err: any) {
    return { error: err?.message || "Internal server error" };
  }
}
