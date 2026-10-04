import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: "Gunakan alur pendaftaran akun yang aman.", code: "LEGACY_REGISTRATION_DISABLED" }, { status: 410 });
}
