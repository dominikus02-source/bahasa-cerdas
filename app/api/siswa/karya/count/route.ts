import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getWeeklyChallenge } from "@/lib/weekly-challenge"

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type")
  if (!type) return NextResponse.json({ count: 0 })

  // Feed memakai angka ini sebagai "X karya masuk" pada kartu tantangan, jadi
  // yang dihitung harus karya yang masuk pada periode tantangan berjalan.
  // Sebelumnya ini menghitung seluruh karya sejenis sepanjang masa, sehingga
  // tantangan baru pun langsung tampil dengan ratusan "peserta".
  const challenge = getWeeklyChallenge()
  const scopedToChallenge = type === challenge.type

  const count = await db.studentKarya.count({
    where: {
      type: type as any,
      ...(scopedToChallenge ? { createdAt: { gte: challenge.startsAt } } : {}),
    },
  })

  return NextResponse.json({ count })
}
