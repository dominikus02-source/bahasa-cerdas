import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { isTeacherOrStudent } from "@/lib/teacher/students"
import { PusatEvaluasiClient } from "./client"

export const dynamic = "force-dynamic"

export default async function PusatEvaluasiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser || !isTeacherOrStudent(dbUser)) redirect("/login")

  return <PusatEvaluasiClient guruName={dbUser.fullName} />
}