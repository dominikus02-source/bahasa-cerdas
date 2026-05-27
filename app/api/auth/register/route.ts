import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGravatarUrl } from "@/lib/avatar";
import { z } from "zod";
import { sanitize } from "@/lib/validations";

const registerApiSchema = z.object({
  email: z.string().email("Email tidak valid").max(255),
  fullName: z.string().min(1, "Nama harus diisi").max(100).trim(),
  role: z.enum(["GURU", "MURID"]),
  supabaseId: z.string().uuid().optional(),
});

function isFounderEmail(email: string): boolean {
  const founders = process.env.FOUNDER_EMAILS?.split(",")
    .map((e) => e.trim().toLowerCase()) ?? [];
  return founders.includes(email.toLowerCase());
}

export async function POST(req: NextRequest) {
  try {
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
    const isFounder = isFounderEmail(email);

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
        isFounder,
        isPremium: isFounder,
        premiumPlan: isFounder ? "PRO" : "FREE",
      },
    });

    try {
      await db.profile.create({
        data: { userId: newUser.id },
      });
    } catch (e) {
      console.log("Profile creation note:", e);
    }

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
