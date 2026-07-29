import { redirect } from "next/navigation"
import { getUser } from "@/lib/supabase/server"

export const metadata = {
  title: "Arena Junior — BahasaCerdas",
  description: "Petualangan bahasa Indonesia untuk anak TK sampai kelas 6 SD.",
}

/**
 * Arena Junior berdiri terpisah dari /arena (SMP–SMA): bahasa visualnya beda
 * total — tombol besar, warna hangat, tanpa bilah navigasi padat. Karena itu
 * layout ini tidak memakai shell Arena.
 */
export default async function ArenaJuniorLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect("/auth/arena-login")
  // Guru boleh mengintip dasbor murid (mode pratinjau), sama seperti di Arena.
  if (user.role !== "MURID" && user.role !== "GURU" && !user.isFounder) redirect("/guru/beranda")

  return <div className="min-h-screen bg-[#FFF8E6] text-slate-800">{children}</div>
}
