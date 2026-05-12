import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { email, fullName, role } = body;

    if (!email || !fullName || !role) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (!["GURU", "MURID"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const isFounder = email === "dominus.02@gmail.com";

    const existingUser = await db.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (existingUser) {
      return NextResponse.json({ user: existingUser, redirect: `/${existingUser.role.toLowerCase()}/beranda` }, { status: 200 });
    }

    const newUser = await db.user.create({
      data: {
        supabaseId: user.id,
        email,
        fullName,
        role: role as "GURU" | "MURID",
        isFounder,
        isPremium: isFounder,
        premiumPlan: isFounder ? "PRO" : "FREE",
      },
    });

    await db.profile.create({
      data: { userId: newUser.id },
    });

    return NextResponse.json({ user: newUser, redirect: `/${role.toLowerCase()}/beranda` }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}