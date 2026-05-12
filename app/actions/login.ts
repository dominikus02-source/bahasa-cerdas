"use server";

import { createClient as createSupabase } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export async function loginUser(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      return { error: "Missing credentials" };
    }

    const supabase = createSupabase(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: error.message };
    }

    if (!data.user) {
      return { error: "Login failed" };
    }

    const dbUser = await db.user.findUnique({ where: { supabaseId: data.user.id } });

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
