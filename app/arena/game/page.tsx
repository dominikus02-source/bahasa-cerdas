import { getUser } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Zap, Swords, Puzzle, Trophy, Type, Flame, BookOpen, Users, Clock, Crown, Mountain, ThumbsUp } from "lucide-react"
import BattleCard from "@/components/arena/BattleCard"
import { MULTIPLAYER_ENABLED } from "@/lib/features"

interface Game {
  title: string; desc: string; icon: any; href: string
  accentColor: string; iconGradient: string
  featured?: boolean; badge?: { text: string; type: "hot" | "new" }
  xp: string; players: string; time: string; multiplayer?: boolean
}

const GAMES: Game[] = [
  { title: "Menara Cerdas", desc: "Panjat menara dengan soal dari pelajaranmu! Makin tinggi, makin seru.", icon: Mountain, href: "/arena/game/menara", accentColor: "#8B5CF6", iconGradient: "from-violet-500 to-fuchsia-600", featured: true, badge: { text: "Baru", type: "new" }, xp: "+60 XP", players: "Solo", time: "~3 mnt" },
  { title: "Tantang Teman", desc: "Duel 10 soal melawan teman sekelasmu! Soal sama, siapa lebih jago?", icon: Users, href: "/arena/game/tantang", accentColor: "#D946EF", iconGradient: "from-fuchsia-500 to-pink-600", featured: true, badge: { text: "Baru", type: "new" }, xp: "+50 XP", players: "2 pemain", time: "~3 mnt" },
  { title: "Irama Kata", desc: "Kata jatuh di 4 jalur — ketuk hanya yang sesuai aturan! Ritme + refleks bahasa.", icon: Clock, href: "/arena/game/irama-kata", accentColor: "#F97316", iconGradient: "from-orange-500 to-rose-500", badge: { text: "Baru", type: "new" }, xp: "+60 XP", players: "Solo", time: "~1 mnt" },
  { title: "Benar atau Salah", desc: "Kuis kilat 60 detik! Tentukan jawaban yang muncul benar atau salah.", icon: ThumbsUp, href: "/arena/game/benar-salah", accentColor: "#14B8A6", iconGradient: "from-emerald-400 to-teal-600", badge: { text: "Baru", type: "new" }, xp: "+50 XP", players: "Solo", time: "~1 mnt" },
  { title: "Kuis Tempur", desc: "Lawan murid lain real-time! Siapa cepat dan benar dia menang.", icon: Swords, href: "/arena/game/kuis-tempur", accentColor: "#EF4444", iconGradient: "from-red-500 to-red-600", featured: true, badge: { text: "Terpopuler", type: "hot" }, xp: "+80 XP", players: "2-8 pemain", time: "~5 menit", multiplayer: true },
  { title: "KataPlay", desc: "Belajar membaca dari nol! 4 tingkat, puluhan soal seru!", icon: BookOpen, href: "/arena/game/kata-play", accentColor: "#7C3AED", iconGradient: "from-violet-500 to-purple-600", badge: { text: "Baru", type: "new" }, xp: "+50 XP", players: "Solo", time: "~3 mnt" },
  { title: "Tebak Kata", desc: "Tebak dari petunjuk. Seru bareng teman!", icon: Type, href: "/arena/game/tebak-kata", accentColor: "#06B6D4", iconGradient: "from-cyan-500 to-cyan-600", xp: "+60 XP", players: "Solo", time: "~3 mnt" },
  { title: "Susun Kata", desc: "Acak huruf jadi kata benar dalam waktu limit!", icon: Puzzle, href: "/arena/game/susun-kata", accentColor: "#10B981", iconGradient: "from-emerald-500 to-emerald-600", xp: "+50 XP", players: "Solo", time: "~3 mnt" },
  { title: "Lari Kata", desc: "60 detik, 20 soal. Jawab secepat kilat!", icon: Zap, href: "/arena/game/lari-kata", accentColor: "#F59E0B", iconGradient: "from-amber-500 to-amber-600", badge: { text: "Baru", type: "new" }, xp: "+70 XP", players: "~1 mnt", time: "~1 mnt" },
]

const INITIALS_COLORS = [
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-blue-600",
  "from-orange-500 to-amber-600",
]

function initials(name: string) {
  return name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"
}

export default async function ArenaGimPage() {
  const user = await getUser()
  if (!user) redirect("/auth/arena-login")

  const limaMenitLalu = new Date(Date.now() - 5 * 60 * 1000)
  const sepuluhMenitLalu = new Date(Date.now() - 10 * 60 * 1000)

  const [totalMain, hasilAkhir, topUsers, onlineCount, recentBattles, recentPlayers] = await Promise.all([
    db.gameResult.count({ where: { userId: user.id } }),
    db.gameResult.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { room: { select: { code: true } } },
    }),
    db.user.findMany({
      where: { xp: { gt: 0 } },
      orderBy: { xp: "desc" },
      take: 5,
      select: { id: true, fullName: true, xp: true },
    }),
    db.user.count({ where: { lastActiveAt: { gte: limaMenitLalu }, role: "MURID" } }),
    db.gameResult.count({ where: { createdAt: { gte: sepuluhMenitLalu } } }),
    db.gameResult.findMany({
      where: { createdAt: { gte: sepuluhMenitLalu } },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
      distinct: ["userId"],
    }),
  ])

  const winCount = hasilAkhir.filter((h: any) => h.rank === 1).length
  const totalXp = user.xp || 0
  const userRank = topUsers.findIndex((u) => u.id === user.id) + 1

  // While the multiplayer server is offline, present multiplayer games as
  // "Segera Hadir". Their link lands on a guarded page showing a teaser screen.
  const games: Game[] = GAMES.map((g) =>
    g.multiplayer && !MULTIPLAYER_ENABLED
      ? { ...g, badge: { text: "Segera Hadir", type: "new" }, players: "Segera", desc: "Mode lawan real-time sedang kami siapkan. Segera hadir!" }
      : g
  )

  return (
    <div className="game-hub arena-page">
      <div className="game-ambient" />

      <div className="relative z-10 px-5 pb-6">
        <div className="pt-5 pb-5 flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-extrabold text-white">Arena Gim</h1>
            <p className="text-sm text-[#7C7A9E] mt-0.5">Buktikan kemampuan Bahasa Indonesia-mu!</p>
          </div>
          <div className="glow-pulse flex items-center gap-1.5 px-3.5 py-2 rounded-full" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <Zap size={15} className="text-amber-400" />
            <span className="text-sm font-bold text-amber-400">{totalXp.toLocaleString()} XP</span>
          </div>
        </div>

        {/* Live battle banner */}
        <div className="mb-6">
          <BattleCard onlineCount={onlineCount} recentBattles={recentBattles} recentPlayers={recentPlayers} />
        </div>

        {/* Pilih Gim */}
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-[13px] font-bold tracking-[1.5px] uppercase" style={{ color: "#7C7A9E" }}>Pilih Gim</h3>
          <Link href="/arena" className="text-xs font-semibold" style={{ color: "#A855F7" }}>Lihat semua &rarr;</Link>
        </div>

        {/* Game grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {games.map((g) => (
            <Link key={g.href} href={g.href}
              className={`game-card-anim relative overflow-hidden p-4 rounded-[20px] border active:scale-[0.96] transition-all hover:-translate-y-0.5 hover:shadow-xl game-card-hover`}
              style={{ background: "#16122A", borderColor: "rgba(124,58,237,0.2)" }}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[20px]" style={{ background: g.accentColor }} />
              <div className={`w-[52px] h-[52px] rounded-2xl bg-gradient-to-br ${g.iconGradient} flex items-center justify-center mb-3 shrink-0`}>
                <g.icon size={24} className="text-white" />
              </div>
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                {g.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${g.badge.type === "hot" ? "bg-gradient-to-r from-red-500 to-red-600" : "bg-gradient-to-r from-emerald-500 to-green-600"}`}>
                    {g.badge.type === "hot" ? <Flame size={10} className="inline mr-0.5" /> : <Zap size={10} className="inline mr-0.5" />}
                    {g.badge.text}
                  </span>
                )}
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>{g.players}</span>
              </div>
              <h4 className="text-[15px] font-bold text-white mb-1">{g.title}</h4>
              <p className="text-[11px] leading-relaxed mb-2" style={{ color: "#7C7A9E" }}>{g.desc}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>
                  <Zap size={9} className="inline mr-0.5" />{g.xp}
                </span>
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{g.time}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Stats ringkas */}
        <div className="mb-6 p-4 rounded-[20px] border" style={{ background: "#16122A", borderColor: "rgba(124,58,237,0.2)" }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#7C7A9E" }}>Statistik</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 text-center">
              <p className="text-2xl font-extrabold text-white">{totalMain}</p>
              <p className="text-[10px] font-semibold uppercase" style={{ color: "#7C7A9E" }}>Main</p>
            </div>
            <div className="w-px h-10" style={{ background: "rgba(255,255,255,0.07)" }} />
            <div className="flex-1 text-center">
              <p className="text-2xl font-extrabold" style={{ color: "#A855F7" }}>{winCount}</p>
              <p className="text-[10px] font-semibold uppercase" style={{ color: "#7C7A9E" }}>Juara 1</p>
            </div>
            <div className="w-px h-10" style={{ background: "rgba(255,255,255,0.07)" }} />
            <div className="flex-1 text-center">
              <p className="text-2xl font-extrabold" style={{ color: "#10B981" }}>{totalXp.toLocaleString()}</p>
              <p className="text-[10px] font-semibold uppercase" style={{ color: "#7C7A9E" }}>Total XP</p>
            </div>
          </div>
        </div>

        {/* League / Leaderboard */}
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-[13px] font-bold tracking-[1.5px] uppercase" style={{ color: "#7C7A9E" }}>Liga Minggu Ini</h3>
          <Link href="/arena/league" className="text-xs font-semibold" style={{ color: "#A855F7" }}>Lihat semua &rarr;</Link>
        </div>

        <div className="rounded-[20px] border overflow-hidden mb-6" style={{ background: "#16122A", borderColor: "rgba(124,58,237,0.2)" }}>
          <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <h3 className="font-bold text-white flex items-center gap-2">
              <Trophy size={16} className="text-amber-400" /> Liga Perunggu
            </h3>
            <div className="flex gap-1 p-0.5 rounded-[10px]" style={{ background: "rgba(255,255,255,0.05)" }}>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white" style={{ background: "#7C3AED" }}>Harian</span>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold" style={{ color: "#7C7A9E" }}>Mingguan</span>
            </div>
          </div>

          {topUsers.map((u, i) => {
            const isMe = u.id === user.id
            const rankColors = ["text-amber-400", "text-gray-400", "text-orange-700"]
            const rankEmoji = i === 0 ? <Crown size={13} className="text-amber-400" /> : null
            return (
              <div key={u.id} className="px-5 py-3 flex items-center gap-3 transition-colors border-b last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.04)", background: isMe ? "rgba(124,58,237,0.08)" : "transparent" }}>
                <div className="w-6 text-center shrink-0">
                  {rankEmoji || <span className={`text-sm font-extrabold ${rankColors[i] || ""}`} style={{ color: !rankColors[i] ? "#7C7A9E" : undefined }}>{i + 1}</span>}
                </div>
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${INITIALS_COLORS[i % INITIALS_COLORS.length]} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                  {initials(u.fullName || "")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {u.fullName}
                    {isMe && <span className="text-[11px] font-medium ml-1" style={{ color: "#A855F7" }}>(Kamu)</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[15px] font-extrabold" style={{ color: "#A855F7" }}>{u.xp.toLocaleString()}</p>
                  <p className="text-[10px]" style={{ color: "#7C7A9E" }}>XP</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Riwayat */}
        {hasilAkhir.length > 0 && (
          <div>
            <h3 className="text-[13px] font-bold tracking-[1.5px] uppercase mb-3.5" style={{ color: "#7C7A9E" }}>Riwayat</h3>
            <div className="space-y-2">
              {hasilAkhir.map((h: any) => (
                <div key={h.id} className="flex items-center gap-3 p-3.5 rounded-2xl border" style={{ background: "#16122A", borderColor: "rgba(124,58,237,0.2)" }}>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-sm font-bold shrink-0 ${h.rank === 1 ? "from-emerald-500 to-teal-600" : "from-gray-600 to-gray-700"}`}>
                    {h.rank === 1 ? <Crown size={16} className="text-amber-400" /> : "#" + (h.rank || "-")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{h.room?.code || "Gim"}</p>
                    <p className="text-xs" style={{ color: "#7C7A9E" }}>{h.finalScore} poin &bull; {waktuLalu(h.createdAt)}</p>
                  </div>
                  <span className="text-sm font-bold" style={{ color: "#10B981" }}>+{h.xpEarned || 0} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function waktuLalu(tanggal: Date) {
  const diff = Date.now() - new Date(tanggal).getTime()
  const menit = Math.floor(diff / 60000)
  if (menit < 1) return "baru saja"
  if (menit < 60) return `${menit}m`
  const jam = Math.floor(menit / 60)
  if (jam < 24) return `${jam}j`
  return `${Math.floor(jam / 24)}h`
}
