import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({
      where: { supabaseId: user.id },
    });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ user: dbUser });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
