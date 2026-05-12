import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, fullName, role, supabaseId } = body;

    if (!email || !fullName || !role) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (!["GURU", "MURID"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const isFounder = email === "dominus.02@gmail.com";

    const existingUser = await db.user.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json({ user: existingUser, redirect: `/${existingUser.role.toLowerCase()}/beranda` }, { status: 200 });
    }

    const newUser = await db.user.create({
      data: {
        supabaseId: supabaseId || ("pending-" + Date.now()),
        email,
        fullName,
        role: role as "GURU" | "MURID",
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

    return NextResponse.json({ user: newUser, redirect: `/${role.toLowerCase()}/beranda` }, { status: 201 });
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}