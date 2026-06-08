import { NextResponse } from "next/server";
import { requireFounder, forbiddenResponse } from "@/lib/supabase/server";

export async function GET() {
  try {
    await requireFounder();
  } catch {
    return forbiddenResponse();
  }

  return NextResponse.json({ status: "ok", dbWorking: true });
}
