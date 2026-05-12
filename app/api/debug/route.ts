import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";

export async function GET() {
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
