import { getUser } from "@/lib/supabase/server"
import { isApk } from "@/lib/apk"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { ChatClient } from "./chat-client"

// OBROLAN 4.0 — Class Chat Workspace.
//
// Data integrity (prioritas 1): daftar kelas hanya memuat kelas AKTIF.
// `isActive: false` = kelas diarsipkan/dihapus oleh guru (lihat
// DELETE /api/group/[id]) — murid yang masih punya baris GroupMember TIDAK
// boleh melihat atau membuka chat-nya. Membership (GroupMember) tetap utuh di
// database; hanya akses chat yang dicabut. History ChatMessage aman.
//
// Guru kelas bukan GroupMember, jadi sidebar memuat dua sumber:
//  1. kelas tempat user menjadi anggota (GroupMember),
//  2. kelas yang diampu user (Group.teacherId === user.id) — guru bisa masuk
//     dan memoderasi chat kelasnya sendiri.
const MEMBER_PREVIEW_LIMIT = 12

// Jendela "online": 5 menit sejak aktivitas terakhir (konsisten dengan API
// chat dan halaman Arena lain).
const ONLINE_WINDOW_MS = 5 * 60 * 1000

const GROUP_SELECT = {
  id: true,
  name: true,
  accessCode: true,
  grade: true,
  chatLocked: true,
  teacherId: true,
  teacher: { select: { id: true, fullName: true, avatar: true } },
  members: {
    orderBy: { joinedAt: "asc" },
    take: MEMBER_PREVIEW_LIMIT,
    select: {
      user: { select: { id: true, fullName: true, avatar: true, lastActiveAt: true } },
    },
  },
} as const

export default async function ChatPage() {
  const user = await getUser()
  if (!user) redirect("/arena/login")

  const isPotentialTeacher = user.role === "GURU" || user.role === "ADMIN" || user.isFounder

  const [memberships, ownedGroups] = await Promise.all([
    db.groupMember.findMany({
      where: { userId: user.id, group: { isActive: true } },
      include: { group: { select: GROUP_SELECT } },
      orderBy: { joinedAt: "desc" },
    }),
    isPotentialTeacher
      ? db.group.findMany({
          where: { teacherId: user.id, isActive: true },
          select: GROUP_SELECT,
        })
      : Promise.resolve([]),
  ])

  const seen = new Set<string>()
  const groups: Array<(typeof memberships)[number]["group"]> = []
  for (const m of memberships) {
    if (!seen.has(m.group.id)) {
      seen.add(m.group.id)
      groups.push(m.group)
    }
  }
  for (const g of ownedGroups) {
    if (!seen.has(g.id)) {
      seen.add(g.id)
      groups.push(g)
    }
  }

  const groupIds = groups.map((g) => g.id)

  const [memberCounts, onlineMembers, lastMessages] = await Promise.all([
    Promise.all(groupIds.map((gid) => db.groupMember.count({ where: { groupId: gid } }))),
    Promise.all(
      groupIds.map((gid) =>
        db.groupMember.count({
          where: {
            groupId: gid,
            user: { lastActiveAt: { gte: new Date(Date.now() - ONLINE_WINDOW_MS) } },
          },
        })
      )
    ),
    Promise.all(
      groupIds.map((gid) =>
        db.chatMessage.findFirst({
          where: { groupId: gid },
          orderBy: { createdAt: "desc" },
          include: { user: { select: { fullName: true } } },
        })
      )
    ),
  ])

  const enriched = groups.map((g, i) => ({
    ...g,
    memberCount: memberCounts[i],
    onlineCount: onlineMembers[i],
    lastMessage: lastMessages[i],
    isTeacher: g.teacherId === user.id,
    members: g.members.map((mm) => mm.user),
  }))

  // FIX FIRST-PAINT: apk dibaca server-side (cookie bc_apk via lib/apk.ts) dan
  // dikirim sebagai prop — ChatClient tidak lagi membaca document.cookie lewat
  // useEffect (useIsApkClient lama), sehingga kelas pertama yang dirender sama
  // dengan kelas setelah refresh (tinggi workspace & CTA join tidak ber-flip).
  const apk = await isApk()

  return <ChatClient userId={user.id} groups={enriched as any} apk={apk} />
}
