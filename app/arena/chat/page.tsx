import { getUser } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { ChatClient } from "./chat-client"

// OBROLAN 3.0 — Class Chat Workspace.
//
// Data integrity (prioritas 1): daftar kelas hanya memuat kelas AKTIF.
// `isActive: false` = kelas diarsipkan/dihapus oleh guru (lihat
// DELETE /api/group/[id]) — murid yang masih punya baris GroupMember TIDAK
// boleh melihat atau membuka chat-nya. Membership (GroupMember) tetap utuh di
// database; hanya akses chat yang dicabut. History ChatMessage aman.
//
// Anggota per kelas diambil sebagai pratinjau (maks 12) untuk panel Anggota
// dan avatar asli di sidebar — menggantikan inisial/avatar palsu lama.
const MEMBER_PREVIEW_LIMIT = 12

// Jendela "online": 5 menit sejak aktivitas terakhir (konsisten dengan API
// chat dan halaman Arena lain).
const ONLINE_WINDOW_MS = 5 * 60 * 1000

export default async function ChatPage() {
  const user = await getUser()
  if (!user) redirect("/arena/login")

  const memberships = await db.groupMember.findMany({
    where: { userId: user.id, group: { isActive: true } },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          accessCode: true,
          grade: true,
          members: {
            orderBy: { joinedAt: "asc" },
            take: MEMBER_PREVIEW_LIMIT,
            select: {
              user: { select: { id: true, fullName: true, avatar: true, lastActiveAt: true } },
            },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  })

  const groupIds = memberships.map((m) => m.group.id)

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

  const enriched = memberships.map((m, i) => ({
    ...m.group,
    memberCount: memberCounts[i],
    onlineCount: onlineMembers[i],
    lastMessage: lastMessages[i],
    members: m.group.members.map((mm) => mm.user),
  }))

  return <ChatClient userId={user.id} groups={enriched as any} />
}
