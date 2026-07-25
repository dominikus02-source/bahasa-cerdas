import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const karya = await db.studentKarya.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true, title: true, type: true, excerpt: true, content: true,
      likesCount: true, viewsCount: true, createdAt: true, isFeatured: true,
    },
  });

  return NextResponse.json({
    karya: karya.map(k => ({ ...k, createdAt: k.createdAt.toISOString() })),
  });
}
