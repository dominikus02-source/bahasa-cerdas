import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { getTKAPackages } from "@/lib/kompetensi/get-simulation-packages"
import { BookOpen, Database, TrendingUp } from "lucide-react"
import Link from "next/link"
import { TrackIcon } from "@/components/shared/TrackIcon"

export const dynamic = "force-dynamic"

export default async function GuruTKASimulasiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser || (dbUser.role !== "GURU" && dbUser.role !== "ADMIN")) redirect("/login")

  const tracks = await getTKAPackages()
  const totalPakets = tracks.filter(t => t.available).length
  const totalSoal = tracks.reduce((s, t) => s + t.questionCount, 0)

  return (
    <div>
      {/* Hero */}
      <div className="bc-guru-hero rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen size={24} />
          <h1 className="text-xl font-bold">Simulasi TKA — Guru</h1>
        </div>
        <p className="text-sm text-blue-100 max-w-2xl">
          Pantau paket simulasi TKA yang tersedia untuk murid. Lihat hasil dan kelola bank soal.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bc-guru-card rounded-xl p-4">
          <p className="text-xs text-gray-500">Paket Tersedia</p>
          <p className="text-2xl font-bold text-gray-900">{totalPakets}</p>
        </div>
        <div className="bc-guru-card rounded-xl p-4">
          <p className="text-xs text-gray-500">Total Soal</p>
          <p className="text-2xl font-bold text-gray-900">{totalSoal}</p>
        </div>
      </div>

      {/* Track Cards */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        {tracks.map(track => (
          <div key={track.id} className={`bc-guru-card rounded-xl p-5 ${track.available ? "" : "opacity-60"}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${track.bgGradient} flex items-center justify-center`}>
                <TrackIcon name={track.icon} className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{track.label}</h3>
                <p className="text-[11px] text-gray-500">{track.target}</p>
              </div>
            </div>
            <div className="text-xs text-gray-400 mb-3">
              {track.available ? `${track.questionCount} soal · ${track.duration} menit` : "Segera tersedia"}
            </div>
            <div className="flex items-center gap-3 mt-2">
              {track.available && track.paketId && (
                <Link
                  href={`/kompetisi/${track.paketId}`}
                  className="text-xs text-blue-700 font-bold bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors inline-flex items-center gap-1"
                >
                  <BookOpen size={12} /> Coba Simulasi
                </Link>
              )}
              {track.available && (
                <Link
                  href="/guru/hasil-simulasi"
                  className="text-xs text-gray-500 font-semibold hover:underline flex items-center gap-1"
                >
                  <TrendingUp size={12} /> Lihat Hasil Murid
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href="/guru/hasil-simulasi"
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          <TrendingUp size={16} /> Lihat Hasil Murid
        </Link>
        <Link
          href="/guru/bank-soal"
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
        >
          <Database size={16} /> Kelola Bank Soal
        </Link>
      </div>
    </div>
  )
}
