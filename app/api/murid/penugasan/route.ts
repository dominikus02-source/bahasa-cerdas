import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"

export async function GET() {
  try {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const groupIds = (
    await db.groupMember.findMany({
      where: { userId: user.id },
      select: { groupId: true },
    })
  ).map(gm => gm.groupId)

  if (groupIds.length === 0) {
    return NextResponse.json({ data: [] })
  }

  const penugasans = await db.penugasan.findMany({
    where: { groupId: { in: groupIds } },
    orderBy: { createdAt: "desc" },
    include: {
      unit: {
        select: {
          id: true,
          title: true,
          levelId: true,
          content: true,
          xpReward: true,
          coinReward: true,
        },
      },
      group: {
        select: { name: true, grade: true },
      },
      submissions: {
        where: { userId: user.id },
        select: { status: true, score: true, completedAt: true },
      },
    },
  })

  const data = penugasans.map(p => ({
    id: p.id,
    judul: p.judul,
    deskripsi: p.deskripsi,
    tenggat: p.tenggat,
    createdAt: p.createdAt,
    unitId: p.unit.id,
    unitTitle: p.unit.title,
    xpReward: p.unit.xpReward,
    coinReward: p.unit.coinReward,
    groupName: p.group.name,
    grade: p.group.grade,
    submission: p.submissions[0] ? {
      status: p.submissions[0].status,
      score: p.submissions[0].score,
      completedAt: p.submissions[0].completedAt,
    } : null,
  }))

  return NextResponse.json({ data })
  } catch (error) {
    console.error("GET /api/murid/penugasan error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { penugasanId, status } = await req.json()

  if (!penugasanId || !status) {
    return NextResponse.json({ error: "penugasanId dan status diperlukan" }, { status: 400 })
  }

  const penugasan = await db.penugasan.findUnique({
    where: { id: penugasanId },
    include: { group: { include: { members: { where: { userId: user.id } } } } },
  })

  if (!penugasan || penugasan.group.members.length === 0) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 })
  }

  const submission = await db.penugasanSubmission.upsert({
    where: { penugasanId_userId: { penugasanId, userId: user.id } },
    update: {
      status,
      ...(status === "IN_PROGRESS" ? { startedAt: new Date() } : {}),
      ...(status === "COMPLETED" ? { completedAt: new Date() } : {}),
    },
    create: {
      penugasanId,
      userId: user.id,
      status,
      startedAt: status === "IN_PROGRESS" ? new Date() : undefined,
      completedAt: status === "COMPLETED" ? new Date() : undefined,
    },
  })

  return NextResponse.json({ data: submission })
  } catch (error) {
    console.error("PATCH /api/murid/penugasan error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
