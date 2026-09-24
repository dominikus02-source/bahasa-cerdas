"use server";

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
    const sanitizedName = sanitize(fullName);

    const existingUser = await db.user.findFirst({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      if (existingUser.supabaseId === supabaseId) {
        // Existing accounts own their application role. Registration must
        // never mutate GURU ↔ MURID based on a new form submission or email
        // domain. Role changes are an account-management operation, not a
        // side effect of re-registration.
        return { ok: true, role: existingUser.role.toLowerCase() };
      }
      return { error: "Email sudah terdaftar dengan akun lain" };
    }

    const newUser = await db.user.create({
      data: {
        supabaseId,
        email: email.toLowerCase(),
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
