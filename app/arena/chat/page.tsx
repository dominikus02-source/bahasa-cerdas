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

  return <ChatClient userId={user.id} groups={groups.map((g: any) => g.group)} />
}
