import { NextResponse } from "next/server";
import { requireFounder } from "@/lib/supabase/server";
import { configureBucket } from "@/lib/upload";

export async function POST() {
  try {
    await requireFounder();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 500 });
    }

    await configureBucket(supabaseUrl, serviceKey, "documents", 50 * 1024 * 1024);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Configure storage error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
