"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { loginSchema } from "@/lib/validations";

export async function loginUser(formData: FormData) {
  try {
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Data tidak valid";
      return { error: firstError };
    }

    const { email, password } = parsed.data;
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (error) {
      return { error: "Email atau password salah" };
    }

    if (!data.user) {
      return { error: "Login failed" };
    }

    const dbUser = await db.user.findFirst({ where: { email: email.toLowerCase() } });

    if (!dbUser) {
      await supabase.auth.signOut();
      return { error: "Akun belum terdaftar. Silakan daftar terlebih dahulu." };
    }

    redirect(`/${dbUser.role.toLowerCase()}/beranda`);
  } catch (err: any) {
    if (err?.message?.includes("NEXT_REDIRECT")) throw err;
    return { error: "Terjadi kesalahan. Silakan coba lagi." };
  }
}
