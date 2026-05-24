import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"

export async function GET(req: Request, { params }: { params: Promise<{ unitId: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { unitId } = await params

  const unit = await db.learningUnit.findUnique({
    where: { id: unitId },
    include: { level: true },
  })

  if (!unit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let konten = null
  try { konten = unit.content ? JSON.parse(unit.content) : null } catch {}

  return NextResponse.json({ unit, konten })
}
