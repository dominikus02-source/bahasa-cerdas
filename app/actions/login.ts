"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export async function loginUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Missing credentials" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Login failed" };
  }

  try {
    const dbUser = await db.user.findUnique({
      where: { supabaseId: data.user.id },
    });

    if (!dbUser) {
      return { error: "Akun belum terdaftar", needsRegister: true };
    }

    redirect(`/${dbUser.role.toLowerCase()}/beranda`);
  } catch (e: any) {
    if (e?.message?.includes("NEXT_REDIRECT")) throw e;
    return { error: "Terjadi kesalahan. Silakan coba lagi." };
  }
}
