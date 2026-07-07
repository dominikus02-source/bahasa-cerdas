import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"

export async function GET(req: Request) {
  const user = await getUser()
  if (!user || (user.role !== "GURU" && !user.isFounder)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const groupId = searchParams.get("groupId")

  const groups = await db.group.findMany({
    where: { teacherId: user.id, isActive: true },
    select: { id: true, name: true, grade: true },
    orderBy: { createdAt: "desc" },
  })

  if (!groupId) {
    return NextResponse.json({ data: groups })
  }

  // Verify teacher owns this group
  const group = await db.group.findFirst({
    where: { id: groupId, teacherId: user.id },
  })
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 })
  }

  const members = await db.groupMember.findMany({
    where: { groupId },
    include: {
      user: {
        select: { id: true, fullName: true, avatar: true, xp: true, level: true },
      },
    },
  })

  // Get categories for this group
  const kategoris = await db.nilaiKategori.findMany({
    where: { groupId },
    orderBy: { createdAt: "asc" },
  })

  // Get all nilai records for these students in this group
  const userIds = members.map(m => m.userId)
  const nilais = await db.nilai.findMany({
    where: {
      groupId,
      userId: { in: userIds },
    },
  })

  // Get penugasans for this group (old style - keep for backward compat)
  const penugasans = await db.penugasan.findMany({
    where: { groupId },
    include: {
      unit: {
        select: { id: true, title: true, grade: true, semester: true, order: true, xpReward: true },
      },
      submissions: true,
    },
    orderBy: { createdAt: "desc" },
  })

  const studentProgress = await db.userUnitProgress.findMany({
    where: {
      userId: { in: userIds },
      unitId: { in: penugasans.map(p => p.unitId) },
    },
  })

  // Compute stats per category
  const kategoriStats = kategoris.map(k => {
    const scores = nilais.filter(n => n.kategoriId === k.id).map(n => n.skor)
    return {
      id: k.id,
      nama: k.nama,
      bobot: k.bobot,
      count: scores.length,
      average: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      max: scores.length > 0 ? Math.max(...scores) : 0,
      min: scores.length > 0 ? Math.min(...scores) : 0,
    }
  })

  const data = {
    kategoris: kategoris,
    kategoriStats,
    students: members.map(m => ({
      id: m.user.id,
      fullName: m.user.fullName,
      avatar: m.user.avatar,
      xp: m.user.xp,
      level: m.user.level,
      // Nilai model entries per category
      scores: kategoris.map(k => {
        const entries = nilais.filter(n => n.userId === m.user.id && n.kategoriId === k.id)
        if (entries.length === 0) return null
        const avg = Math.round(entries.reduce((sum, n) => sum + n.skor, 0) / entries.length)
        return {
          skor: avg,
          sumberType: entries[0].sumberType,
          keterangan: entries.map(e => e.keterangan).filter(Boolean).join("; "),
          count: entries.length,
        }
      }),
      overall: (() => {
        const studentNilais = kategoris.map(k => {
          const entries = nilais.filter(n => n.userId === m.user.id && n.kategoriId === k.id)
          if (entries.length === 0) return null
          return Math.round(entries.reduce((sum, n) => sum + n.skor, 0) / entries.length)
        }).filter((s): s is number => s !== null)
        if (studentNilais.length === 0) return null
        return Math.round(studentNilais.reduce((a, b) => a + b, 0) / studentNilais.length)
      })(),
      // Legacy penugasan progress (keep for backward compat)
      progress: penugasans.map(p => {
        const sub = p.submissions.find(s => s.userId === m.user.id)
        const up = studentProgress.find(sp => sp.userId === m.user.id && sp.unitId === p.unit.id)
        return {
          unitId: p.unit.id,
          penugasanId: p.id,
          completed: up?.completed || false,
          score: up?.score || sub?.score || 0,
          status: sub?.status || (up?.completed ? "COMPLETED" : "ASSIGNED"),
        }
      }),
    })),
    penugasans: penugasans.map(p => ({
      id: p.id,
      title: p.unit.title,
      grade: p.unit.grade,
      semester: p.unit.semester,
      unitOrder: p.unit.order,
      unitId: p.unit.id,
      xpReward: p.unit.xpReward,
      createdAt: p.createdAt,
    })),
  }

  return NextResponse.json({ data })
}
