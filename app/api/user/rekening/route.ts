import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import cache from "@/lib/redis";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cacheKey = `rekening:${user.id}`;
    const cached = await cache.get<{ bank: string; holder: string; number: string }>(cacheKey);
    if (cached) return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
      select: { bank: true, bankHolder: true, bankNumber: true },
    });

    const result = {
      bank: profile?.bank || "",
      holder: profile?.bankHolder || "",
      number: profile?.bankNumber || "",
    };

    await cache.set(cacheKey, result, 120); // 2 min — bank info rarely changes

    return NextResponse.json(result, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { bank, holder, number } = body;

    const existing = await db.profile.findUnique({ where: { userId: user.id } });
    if (existing) {
      await db.profile.update({
        where: { userId: user.id },
        data: { bank, bankHolder: holder, bankNumber: number },
      });
    } else {
      await db.profile.create({
        data: { userId: user.id, bank, bankHolder: holder, bankNumber: number },
      });
    }

    // Invalidate cache
    await cache.del(`rekening:${user.id}`);

    return NextResponse.json({ message: "Rekening berhasil disimpan" });
  } catch (error) {
    console.error("Rekening update error:", error);
    return NextResponse.json({ error: "Gagal menyimpan rekening" }, { status: 500 });
  }
}
