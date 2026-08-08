import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { isTeacherOrStudent } from "@/lib/teacher/students"
import { EvaluasiSimulasiTabs } from "@/components/guru/simulasi/EvaluasiSimulasiTabs"

export const dynamic = "force-dynamic"

export default async function EvaluasiSimulasiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser || !isTeacherOrStudent(dbUser)) redirect("/login")

  return <EvaluasiSimulasiTabs guruName={dbUser.fullName} />
}
