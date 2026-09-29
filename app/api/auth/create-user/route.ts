import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { z } from "zod";
import { sanitize } from "@/lib/validations";
import { rateLimitRoute } from "@/lib/rate-limit";

const createUserSchema = z.object({
  email: z.string().email("Email tidak valid").max(255),
  password: z.string().min(8, "Password minimal 8 karakter").max(128),
  fullName: z.string().min(1, "Nama harus diisi").max(100).trim(),
  role: z.enum(["GURU", "MURID"]),
});

export async function POST(req: Request) {
  try {
    const rl = await rateLimitRoute(req, {
      maxRequests: 5,
      windowSeconds: 60,
      identifier: "register-create-user",
    });
    if (rl) return rl;

    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Data tidak valid" },
        { status: 400 }
      );
    }

    const { email, password, fullName, role } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const sanitizedName = sanitize(fullName);

    const existingDbUser = await db.user.findFirst({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingDbUser) {
      return NextResponse.json(
        {
          error: "Email ini sudah terdaftar. Silakan masuk atau gunakan Lupa Kata Sandi.",
          code: "EMAIL_EXISTS",
        },
        { status: 409 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let authUserId: string | null = null;

    const { data, error } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { role, full_name: fullName },
    });

    if (!error && data.user) {
      authUserId = data.user.id;
    }

    if (error) {
      const message = error.message || "";
      const normalized = message.toLowerCase();
      const alreadyExists =
        normalized.includes("already registered") ||
        normalized.includes("already been registered") ||
        normalized.includes("already exists") ||
        normalized.includes("email_exists") ||
        normalized.includes("user_already_exists");

      if (alreadyExists) {
        // Recover an orphaned Supabase Auth user created by an earlier
        // registration attempt that failed before the application User row
        // was persisted. This is safe because we only adopt Auth users that
        // have no matching application User record.
        let authUser = null;
        let page = 1;

        while (!authUser) {
          const { data: listed, error: listError } =
            await supabase.auth.admin.listUsers({ page, perPage: 1000 });

          if (listError) break;

          authUser =
            listed.users.find(
              (user) => user.email?.toLowerCase() === normalizedEmail
            ) ?? null;

          if (listed.users.length < 1000) break;
          page += 1;
        }

        if (authUser) {
          const { data: updatedAuth, error: updateError } =
            await supabase.auth.admin.updateUserById(authUser.id, {
              password,
              email_confirm: true,
              user_metadata: {
                ...authUser.user_metadata,
                role,
                full_name: fullName,
              },
            });

          if (!updateError && updatedAuth.user) {
            authUserId = updatedAuth.user.id;
          }
        }
      }

      if (!authUserId) {
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

        if (
          normalized.includes("rate limit") ||
          normalized.includes("too many") ||
          error.status === 429
        ) {
          return NextResponse.json(
            {
              error: "Terlalu banyak percobaan. Tunggu sekitar satu menit lalu coba lagi.",
              code: "RATE_LIMITED",
            },
            { status: 429 }
          );
        }

        return NextResponse.json(
          {
            error: "Pendaftaran gagal. Silakan periksa data dan coba lagi.",
          },
          { status: error.status && error.status >= 400 ? error.status : 400 }
        );
      }
    }

    // Keep Supabase Auth and the application's User table in sync. If the
    // database write fails, remove the newly-created/recovered Auth user so
    // the next registration attempt is not blocked by an orphan account.
    try {
      const newUser = await db.user.create({
        data: {
          supabaseId: authUserId,
          email: normalizedEmail,
          fullName: sanitizedName,
          role,
        },
      });

      try {
        await db.profile.create({ data: { userId: newUser.id } });
      } catch {
        // Profile is supplementary; the account itself remains valid.
      }

      return NextResponse.json({
        userId: authUserId,
        applicationUserId: newUser.id,
      });
    } catch (dbError) {
      try {
        await supabase.auth.admin.deleteUser(authUserId, false);
      } catch {
        // Best-effort rollback. The original DB error is still returned.
      }

      console.error("[register/create-user] application user creation failed:", dbError);
      return NextResponse.json(
        { error: "Akun belum berhasil dibuat. Silakan coba lagi." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[register/create-user] unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
