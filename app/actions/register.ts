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

    const isFounder = process.env.FOUNDER_EMAILS?.split(",")
      .map((e) => e.trim().toLowerCase())
      .includes(email.toLowerCase()) ?? false;

    const existingUser = await db.user.findFirst({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      if (existingUser.supabaseId === supabaseId) {
        if (existingUser.role !== role) {
          await db.user.update({ where: { id: existingUser.id }, data: { role } });
        }
        return { ok: true, role: role.toLowerCase() };
      }
      return { error: "Email sudah terdaftar dengan akun lain" };
    }

    const newUser = await db.user.create({
      data: {
        supabaseId,
        email: email.toLowerCase(),
        fullName: sanitizedName,
        role,
        isFounder,
        isPremium: isFounder,
        premiumPlan: isFounder ? "PRO" : "FREE",
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
