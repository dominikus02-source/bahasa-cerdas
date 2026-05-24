import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN" && !user.isFounder) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 })

  const target = await db.user.update({
    where: { email },
    data: { isFounder: true },
  })

  return NextResponse.json({ success: true, email: target.email, fullName: target.fullName })
}
