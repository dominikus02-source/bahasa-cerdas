"use server";

import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { registerSchema, sanitize } from "@/lib/validations";

// SECURITY: a Server Action is a public endpoint — anyone can invoke it with
// arbitrary form data. Identity (Supabase ID + email) therefore comes ONLY
// from the verified server session, never from the submitted form. The role
// is still validated against the GURU/MURID allowlist, but it can no longer
// create or re-bind an account: the application User row is provisioned by
// /api/auth/create-user (email) or the role-selection flow (Google).
const registerProfileSchema = registerSchema.pick({
  role: true,
  school: true,
  city: true,
  province: true,
});

export async function registerUser(formData: FormData) {
  try {
    const parsed = registerProfileSchema.safeParse({
      role: formData.get("role"),
      school: formData.get("school") || null,
      city: formData.get("city") || null,
      province: formData.get("province") || null,
    });

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Data tidak valid";
      return { error: firstError };
    }

    const { school, city, province } = parsed.data;

    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return { error: "Sesi tidak ditemukan. Silakan masuk terlebih dahulu." };
    }

    const existingUser = await db.user.findUnique({
      where: { supabaseId: authUser.id },
    });

    if (!existingUser) {
      // No legacy fallback: this action never creates accounts.
      return { error: "Akun belum siap. Silakan pilih peran terlebih dahulu.", code: "ROLE_REQUIRED" };
    }

    // Registration only enriches the optional profile fields, keeping the
    // flow idempotent. The stored role always wins over the submitted one.
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
  } catch {
    return { error: "Profil belum berhasil disimpan. Silakan coba lagi." };
  }
}
