import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secret = process.env.GAME_SERVER_SHARED_SECRET;
  if (!secret) {
    console.error("GAME_SERVER_SHARED_SECRET is not configured");
    return NextResponse.json({ error: "Server pertandingan belum dikonfigurasi." }, { status: 503 });
  }

  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true, fullName: true, nickname: true, avatar: true },
  });
  if (!profile) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

  const payload = Buffer.from(
    JSON.stringify({
      v: 1,
      sub: profile.id,
      name: profile.nickname || profile.fullName,
      avatar: profile.avatar || null,
      exp: Date.now() + 5 * 60 * 1000,
    }),
    "utf8"
  ).toString("base64url");

  const signature = createHmac("sha256", secret).update(payload).digest("base64url");

  return NextResponse.json(
    { token: `${payload}.${signature}` },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
