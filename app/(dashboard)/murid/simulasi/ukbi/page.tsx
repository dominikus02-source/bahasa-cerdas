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
  if (!dbUser || dbUser.role !== "MURID") redirect("/login")

  const tracks = await getUKBIPackages()

  return <UKBISimulationClient tracks={tracks} />
}
