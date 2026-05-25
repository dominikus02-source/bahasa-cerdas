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

  const members = await db.groupMember.findMany({
    where: { groupId },
    include: {
      user: {
        select: { id: true, fullName: true, avatar: true, xp: true, level: true },
      },
    },
  })

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
      userId: { in: members.map(m => m.userId) },
      unitId: { in: penugasans.map(p => p.unitId) },
    },
  })

  const data = {
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
    students: members.map(m => ({
      id: m.user.id,
      fullName: m.user.fullName,
      avatar: m.user.avatar,
      xp: m.user.xp,
      level: m.user.level,
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
  }

  return NextResponse.json({ data })
}
