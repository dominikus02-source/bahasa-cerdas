import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type")
  if (!type) return NextResponse.json({ count: 0 })

  const count = await db.studentKarya.count({
    where: { type: type as any },
  })

  return NextResponse.json({ count })
}
