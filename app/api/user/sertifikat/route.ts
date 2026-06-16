import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import cache from "@/lib/redis";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cacheKey = `sertifikat:${user.id}`;
    const cached = await cache.get<{ data: unknown[] }>(cacheKey);
    if (cached) return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });

    const data = await db.kompetensiCertificate.findMany({
      where: { userId: user.id },
      include: { 
        paket: { select: { title: true, type: true } },
        user: { select: { fullName: true } }
      },
      orderBy: { issuedAt: "desc" },
      take: 50,
    });

    const result = { data };
    await cache.set(cacheKey, result, 120);

    return NextResponse.json(result, { headers: { "X-Cache": "MISS" } });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
