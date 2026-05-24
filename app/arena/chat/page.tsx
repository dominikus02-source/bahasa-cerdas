import { getUser } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { ChatClient } from "./chat-client"

export default async function ChatPage() {
  const user = await getUser()
  if (!user) redirect("/auth/arena-login")

  const groups = await db.groupMember.findMany({
    where: { userId: user.id },
    include: {
      group: {
        select: { id: true, name: true, accessCode: true },
      },
    },
  })

  const groupIds = groups.map(g => g.group.id)

  const [memberCounts, onlineMembers, lastMessages] = await Promise.all([
    Promise.all(groupIds.map(gid =>
      db.groupMember.count({ where: { groupId: gid } })
    )),
    Promise.all(groupIds.map(gid =>
      db.groupMember.count({
        where: {
          groupId: gid,
          user: { lastActiveAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
        },
      })
    )),
    Promise.all(groupIds.map(gid =>
      db.chatMessage.findFirst({
        where: { groupId: gid },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { fullName: true } } },
      })
    )),
  ])

  const enriched = groups.map((g, i) => ({
    ...g.group,
    memberCount: memberCounts[i],
    onlineCount: onlineMembers[i],
    lastMessage: lastMessages[i],
  }))

  return <ChatClient userId={user.id} groups={enriched} />
}
