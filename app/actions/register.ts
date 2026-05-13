"use server";

import { db } from "@/lib/db";

export async function registerUser(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const supabaseId = formData.get("supabaseId") as string;
    const fullName = formData.get("fullName") as string;
    const role = formData.get("role") as "GURU" | "MURID";

    if (!email || !supabaseId || !fullName || !role) {
      return { error: "Missing fields" };
    }

    if (!["GURU", "MURID"].includes(role)) {
      return { error: "Invalid role" };
    }

    const isFounder = email === "dominus.02@gmail.com";

    const existingUser = await db.user.findFirst({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      if (existingUser.supabaseId === supabaseId) {
        return { ok: true, role: existingUser.role.toLowerCase() };
      }
      return { error: "Email sudah terdaftar dengan akun lain" };
    }

    const newUser = await db.user.create({
      data: {
        supabaseId,
        email: email.toLowerCase(),
        fullName,
        role,
        isFounder,
        isPremium: isFounder,
        premiumPlan: isFounder ? "PRO" : "FREE",
      },
    });

    try { await db.profile.create({ data: { userId: newUser.id } }); } catch {}

    return { ok: true, role: role.toLowerCase() };
  } catch (err: any) {
    return { error: err?.message || "Internal server error" };
  }
}