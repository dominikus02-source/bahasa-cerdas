import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const users = await db.user.findMany({
      where: { lastActiveAt: { gte: fiveMinAgo }, role: "MURID" },
      select: { id: true, fullName: true, avatar: true },
      orderBy: { lastActiveAt: "desc" },
      take: 20,
    });
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ users: [] });
  }
}
