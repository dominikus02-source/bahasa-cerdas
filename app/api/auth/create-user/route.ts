import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email("Email tidak valid").max(255),
  password: z.string().min(8, "Password minimal 8 karakter").max(128),
  fullName: z.string().min(1, "Nama harus diisi").max(100).trim(),
  role: z.enum(["GURU", "MURID"]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Data tidak valid" },
        { status: 400 }
      );
    }

    const { email, password, fullName, role } = parsed.data;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, full_name: fullName },
    });

    if (error) {
      const message = error.message || "";
      const normalized = message.toLowerCase();

      if (
        normalized.includes("already registered") ||
        normalized.includes("already been registered") ||
        normalized.includes("already exists")
      ) {
        return NextResponse.json(
          {
            error: "Email ini sudah terdaftar. Silakan masuk atau gunakan Lupa Kata Sandi.",
            code: "EMAIL_EXISTS",
          },
          { status: 409 }
        );
      }

      if (
        normalized.includes("password") &&
        (normalized.includes("weak") ||
          normalized.includes("least") ||
          normalized.includes("characters") ||
          normalized.includes("requirements"))
      ) {
        return NextResponse.json(
          {
            error: "Kata sandi belum memenuhi persyaratan keamanan.",
            code: "PASSWORD_INVALID",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Pendaftaran gagal. Silakan periksa data dan coba lagi." },
        { status: error.status && error.status >= 400 ? error.status : 400 }
      );
    }

    return NextResponse.json({ userId: data.user.id });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
