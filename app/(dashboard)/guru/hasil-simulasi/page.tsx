import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { isTeacherOrStudent } from "@/lib/teacher/students"
import { HasilSimulasiView } from "@/components/guru/simulasi/HasilSimulasiView"

export const dynamic = "force-dynamic"

// Route legacy — tetap hidup (backward compatible). UI utama ada di hub
// /guru/evaluasi-simulasi?tab=hasil (Laporan Simulasi).
export default async function PusatEvaluasiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser || !isTeacherOrStudent(dbUser)) redirect("/login")

  return <HasilSimulasiView guruName={dbUser.fullName} />
}
