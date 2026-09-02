import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGravatarUrl } from "@/lib/avatar";
import { z } from "zod";
import { sanitize } from "@/lib/validations";
import { rateLimitRoute } from "@/lib/rate-limit";

const registerApiSchema = z.object({
  email: z.string().email("Email tidak valid").max(255),
  fullName: z.string().min(1, "Nama harus diisi").max(100).trim(),
  role: z.enum(["GURU", "MURID"]),
  supabaseId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimitRoute(req, { maxRequests: 5, windowSeconds: 60, identifier: "register" });
    if (rl) return rl;

    const body = await req.json();
    const parsed = registerApiSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Data tidak valid" },
        { status: 400 }
      );
    }

    const { email, fullName, role, supabaseId } = parsed.data;
    const sanitizedName = sanitize(fullName);

    const existingUser = await db.user.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { user: existingUser, redirect: `/${existingUser.role.toLowerCase()}/beranda` },
        { status: 200 }
      );
    }

    const newUser = await db.user.create({
      data: {
        supabaseId: supabaseId || ("pending-" + Date.now()),
        email: email.toLowerCase(),
        fullName: sanitizedName,
        avatar: getGravatarUrl(email),
        role,
      },
    });

    // Fire-and-forget non-critical ops — don't block response
    Promise.allSettled([
      db.profile.create({ data: { userId: newUser.id } }).catch(() => {}),
      (async () => {
        const founders = await db.user.findMany({ where: { isFounder: true }, select: { id: true } });
        if (founders.length > 0) {
          await db.notifikasi.createMany({
            data: founders.map(f => ({
              userId: f.id,
              title: "Pengguna Baru",
              body: `${sanitizedName} (${role}) baru saja mendaftar`,
              type: "admin_user",
              data: { userId: newUser.id, role, email: email.toLowerCase() },
            })),
          });
        }
      })().catch(() => {}),
    ]);

    return NextResponse.json(
      { user: newUser, redirect: `/${role.toLowerCase()}/beranda` },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
