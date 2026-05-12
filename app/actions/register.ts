"use server";

import { createClient as createSupabase } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export async function registerUser(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const fullName = formData.get("fullName") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as "GURU" | "MURID";

    if (!email || !fullName || !password || !role) {
      return { error: "Missing fields" };
    }

    if (!["GURU", "MURID"].includes(role)) {
      return { error: "Invalid role" };
    }

    const supabase = createSupabase(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const isFounder = email === "dominus.02@gmail.com";

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role, full_name: fullName } },
    });

    if (signUpError) {
      return { error: signUpError.message };
    }

    if (!data.user) {
      return { error: "Registration failed" };
    }

    const existingUser = await db.user.findFirst({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      redirect(`/${existingUser.role.toLowerCase()}/beranda`);
    }

    const newUser = await db.user.create({
      data: {
        supabaseId: data.user.id,
        email,
        fullName,
        role,
        isFounder,
        isPremium: isFounder,
        premiumPlan: isFounder ? "PRO" : "FREE",
      },
    });

    try { await db.profile.create({ data: { userId: newUser.id } }); } catch {}

    redirect(`/${role.toLowerCase()}/beranda`);
  } catch (err: any) {
    if (err?.message?.includes("NEXT_REDIRECT")) throw err;
    return { error: err?.message || "Internal server error" };
  }
}
