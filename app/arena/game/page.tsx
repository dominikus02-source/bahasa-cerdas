import { getUser } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Clock, Swords, Puzzle, BookOpen, Trophy, Type, Zap } from "lucide-react"

const gimList = [
  { title: "Adu Cepat", desc: "Cari lawan langsung! Auto-matchmaking 1v1 real-time rebut XP.", icon: Zap, warna: "from-violet-500 to-purple-600", href: "/arena/game/adu-cepat", hot: true },
  { title: "Kuis Tempur", desc: "Lawan murid lain real-time! Siapa cepat dan benar dia menang.", icon: Swords, warna: "from-rose-500 to-pink-600", href: "/arena/game/kuis-tempur" },
  { title: "Tebak Kata", desc: "Tebak kata berdasarkan petunjuk. Seru bareng teman!", icon: Type, warna: "from-blue-500 to-cyan-600", href: "/arena/game/tebak-kata" },
  { title: "Susun Kata", desc: "Acak huruf jadi kata yang benar dalam waktu terbatas!", icon: Puzzle, warna: "from-emerald-500 to-teal-600", href: "/arena/game/susun-kata" },
  { title: "Katastra", desc: "Tebak kata setiap hari. Asah kosakatamu!", icon: BookOpen, warna: "from-violet-500 to-purple-600", href: "/arena/game/katastra" },
]

export default async function ArenaGimPage() {
  const user = await getUser()
  if (!user) redirect("/auth/arena-login")

  const totalMain = await db.gameResult.count({ where: { userId: user.id } })
  const hasilAkhir = await db.gameResult.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      room: { select: { code: true } },
    },
  })

  return (
    <div className="px-4 py-5 arena-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Gim</h1>
        <p className="text-base text-gray-500 mt-1">Pilih gim dan buktikan kemampuanmu!</p>
      </div>

      {/* Stat ringkas */}
      {totalMain > 0 && (
        <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-5 mb-5">
          <div className="flex-1 text-center">
            <p className="text-2xl font-extrabold text-gray-900">{totalMain}</p>
            <p className="text-xs text-gray-500 font-medium uppercase">Main</p>
          </div>
          <div className="w-px h-10 bg-gray-100" />
          <div className="flex-1 text-center">
            <p className="text-2xl font-extrabold text-violet-600">
              {hasilAkhir.filter((h: any) => h.rank === 1).length}
            </p>
            <p className="text-xs text-gray-500 font-medium uppercase">Juara 1</p>
          </div>
          <div className="w-px h-10 bg-gray-100" />
          <div className="flex-1 text-center">
            <p className="text-2xl font-extrabold text-emerald-600">
              {hasilAkhir.reduce((sum: number, h: any) => sum + (h.xpEarned || 0), 0)}
            </p>
            <p className="text-xs text-gray-500 font-medium uppercase">Total XP</p>
          </div>
        </div>
      )}

      {/* Daftar gim */}
      <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Pilih Gim</h2>
      <div className="space-y-3 mb-6">
        {gimList.map((gim) => (
          <Link
            key={gim.href}
            href={gim.href}
            className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all active:scale-[0.98] arena-card"
          >
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gim.warna} flex items-center justify-center text-white shadow-md shrink-0 ${gim.hot ? "ring-2 ring-violet-300 ring-offset-2" : ""}`}>
              <gim.icon className="w-8 h-8" />
              {gim.hot && <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center"><Zap className="w-2.5 h-2.5 text-white" /></span>}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900">{gim.title}</h3>
              <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{gim.desc}</p>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-300 shrink-0" />
          </Link>
        ))}
      </div>

      {/* Riwayat */}
      {hasilAkhir.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Riwayat Gim</h2>
          <div className="space-y-2">
            {hasilAkhir.map((h: any) => (
              <div key={h.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${h.rank === 1 ? "from-emerald-500 to-teal-600" : "from-gray-400 to-gray-500"} flex items-center justify-center text-white text-base font-bold`}>
                  {h.rank === 1 ? <Trophy className="w-4 h-4 text-amber-500" /> : "#" + (h.rank || "-")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{h.room?.code || "Gim"}</p>
                  <p className="text-xs text-gray-400">{h.finalScore} poin • {waktuLalu(h.createdAt)}</p>
                </div>
                <span className="text-sm font-bold text-emerald-600">+{h.xpEarned || 0} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function waktuLalu( tanggal: Date) {
  const diff = Date.now() - new Date(tanggal).getTime()
  const menit = Math.floor(diff / 60000)
  if (menit < 1) return "baru saja"
  if (menit < 60) return `${menit}m`
  const jam = Math.floor(menit / 60)
  if (jam < 24) return `${jam}j`
  return `${Math.floor(jam / 24)}h`
}
