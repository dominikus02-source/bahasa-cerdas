import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { z } from "zod";
import { sanitize } from "@/lib/validations";
import { rateLimitRoute } from "@/lib/rate-limit";
import { parseRoleSelection } from "@/lib/auth/role-intent";

const createUserSchema = z.object({
  email: z.string().email("Email tidak valid").max(255),
  password: z
    .string()
    .min(8, "Kata sandi minimal 8 karakter")
    .max(128, "Kata sandi maksimal 128 karakter"),
  fullName: z.string().min(1, "Nama harus diisi").max(100).trim(),
  // UMUM hanya lolos bila flag server ENABLE_ROLE_UMUM aktif DAN kategoriUmum
  // termasuk pilihan (lihat parseRoleSelection di bawah). GURU/MURID tak berubah.
  role: z.enum(["GURU", "MURID", "UMUM"]),
  kategoriUmum: z.string().max(20).optional(),
});

// One message for every "already exists" case (DB row or Auth-only identity),
// so the response never reveals which kind of account owns the email.
const EMAIL_EXISTS_MESSAGE =
  "Email ini sudah terdaftar. Silakan masuk dengan email dan kata sandi, " +
  "atau pilih \"Masuk dengan Google\" bila dulu mendaftar lewat Google. " +
  "Lupa kata sandi? Gunakan Lupa Kata Sandi.";

export async function POST(req: Request) {
  try {
    const rl = await rateLimitRoute(req, {
      // Pendaftaran siswa sering dilakukan serentak dari satu jaringan sekolah.
      // Batas harus cukup tinggi untuk satu kelas, tetapi tetap membatasi penyalahgunaan.
      maxRequests: 60,
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

    const selection = parseRoleSelection(parsed.data.role, parsed.data.kategoriUmum);
    if (!selection) {
      return NextResponse.json({ error: "Peran tidak valid" }, { status: 400 });
    }

    const { email, password, fullName } = parsed.data;
    const { role, kategoriUmum } = selection;
    const normalizedEmail = email.toLowerCase();
    const sanitizedName = sanitize(fullName);

    const existingDbUser = await db.user.findFirst({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingDbUser) {
      return NextResponse.json(
        {
          error: EMAIL_EXISTS_MESSAGE,
          code: "EMAIL_EXISTS",
        },
        { status: 409 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // SECURITY: this endpoint is public. It may only ever CREATE a brand-new
    // Auth identity. It must never adopt, modify, or delete an Auth identity
    // that already exists (e.g. a Google user who has not finished role
    // selection, or an abandoned registration). Adopting one would let an
    // unauthenticated caller set the password of someone else's account.
    const { data, error } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { role, full_name: fullName },
    });

    if (error || !data.user) {
      const message = error?.message || "";
      const normalized = message.toLowerCase();
      const errorCode = String((error as { code?: unknown } | null)?.code ?? "").toLowerCase();
      const alreadyExists =
        errorCode === "email_exists" ||
        errorCode === "user_already_exists" ||
        normalized.includes("already registered") ||
        normalized.includes("already been registered") ||
        normalized.includes("already exists") ||
        normalized.includes("email_exists") ||
        normalized.includes("user_already_exists");

      if (alreadyExists) {
        return NextResponse.json(
          {
            error: EMAIL_EXISTS_MESSAGE,
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

      if (
        normalized.includes("rate limit") ||
        normalized.includes("too many") ||
        error?.status === 429
      ) {
        return NextResponse.json(
          {
            error: "Terlalu banyak percobaan. Tunggu sekitar satu menit lalu coba lagi.",
            code: "RATE_LIMITED",
          },
          { status: 429 }
        );
      }

      if (!error) {
        return NextResponse.json(
          { error: "Akun Auth belum berhasil dibuat. Silakan coba lagi." },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          error: "Pendaftaran gagal. Silakan periksa data dan coba lagi.",
        },
        { status: error.status && error.status >= 400 ? error.status : 400 }
      );
    }

    // Only an identity created by THIS request may ever be rolled back.
    const authUserId = data.user.id;
    const createdByThisRequest = true;

    // Keep Supabase Auth and the application's User table in sync. If the
    // database write fails, remove the Auth user THIS request just created so
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
        await db.profile.create({
          data: {
            userId: newUser.id,
            ...(role === "UMUM" && kategoriUmum ? { kategoriUmum } : {}),
          },
        });
      } catch {
        // Profile is supplementary; the account itself remains valid.
      }

      return NextResponse.json({
        userId: authUserId,
        applicationUserId: newUser.id,
      });
    } catch (dbError) {
      if (createdByThisRequest) {
        try {
          await supabase.auth.admin.deleteUser(authUserId, false);
        } catch {
          // Best-effort rollback. The original DB error is still returned.
        }
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
