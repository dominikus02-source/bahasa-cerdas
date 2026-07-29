import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { HasilSimulasiClient } from "./client"

export const dynamic = "force-dynamic"

export default async function HasilSimulasiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser || (dbUser.role !== "GURU" && dbUser.role !== "ADMIN")) redirect("/login")

  // Hanya tampilkan hasil murid dari kelas guru ini
  const groupMemberIds = await db.groupMember.findMany({
    where: { group: { teacherId: dbUser.id, isActive: true } },
    select: { userId: true },
  })
  const myStudentIds = [...new Set(groupMemberIds.map(m => m.userId))]

  const results = await db.progresKompetensi.findMany({
    where: { status: "COMPLETED", userId: { in: myStudentIds } },
    orderBy: { finishedAt: "desc" },
    take: 50,
    include: {
      user: { select: { id: true, fullName: true } },
      paket: { select: { id: true, title: true, type: true } },
    },
  })

  const progresIds = results.map(r => r.id)
  const certs = await db.kompetensiCertificate.findMany({
    where: { progresId: { in: progresIds } },
    select: { progresId: true, id: true, certificateNo: true },
  })
  const certMap = new Map(certs.map(c => [c.progresId, c]))

  const serialized = results.map(r => ({
    id: r.id,
    userId: r.userId,
    userName: r.user.fullName,
    paketId: r.paketId,
    paketTitle: r.paket.title,
    paketType: r.paket.type,
    attemptNumber: r.attemptNumber,
    totalScore: r.totalScore,
    predikat: r.predikat,
    percentage: r.percentage,
    finishedAt: r.finishedAt?.toISOString() || null,
    hasCert: certMap.has(r.id),
  }))

  return <HasilSimulasiClient results={serialized} />
}
