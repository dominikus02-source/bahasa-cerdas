import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { getUKBIPackages } from "@/lib/kompetensi/get-simulation-packages"
import { UKBISimulationClient } from "./client"

export const dynamic = "force-dynamic"

export default async function UKBISimulasiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) redirect("/login")
  // Founder/admin boleh melihat untuk pratinjau; murid = akses normal.
  if (dbUser.role !== "MURID" && dbUser.role !== "ADMIN" && !dbUser.isFounder) redirect("/guru/beranda")

  const tracks = await getUKBIPackages()

  return <UKBISimulationClient tracks={tracks} />
}
