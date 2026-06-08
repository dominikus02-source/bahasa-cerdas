import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Disabled in production" }, { status: 403 });
  }

  try {
    const user = await getUser();
    return NextResponse.json({ 
      user: user ? { id: user.id, role: user.role, email: user.email } : null,
      dbWorking: true 
    });
  } catch (err: any) {
    return NextResponse.json({ 
      user: null, 
      dbWorking: false, 
      error: err?.message || "Unknown error" 
    }, { status: 500 });
  }
}
