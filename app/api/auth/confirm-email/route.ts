import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: "Verifikasi email hanya melalui tautan atau kode yang dikirim ke pemilik email." }, { status: 410 });
}
