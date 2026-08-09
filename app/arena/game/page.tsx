import { getUser } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import cache from "@/lib/redis"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Zap, Swords, Puzzle, Type, Flame, BookOpen, Users, Clock, Crown, Mountain, ThumbsUp, TreePine } from "lucide-react"
import BattleCard from "@/components/arena/BattleCard"
import GameHubLeagueTabs from "./league-tabs"
import { MULTIPLAYER_ENABLED } from "@/lib/features"
import { weekKey } from "@/lib/gamification/season"

interface Game {
  title: string; desc: string; icon: any; href: string
  accentColor: string; iconGradient: string
  featured?: boolean; badge?: { text: string; type: "hot" | "new" }
  xp: string; players: string; time: string; multiplayer?: boolean
  /**
   * Gim multiplayer yang punya mode solo melawan bot saat server pertandingan
   * mati. Tanpa penanda ini ia ikut dilabeli "Segera Hadir" — memberi tahu murid
   * bahwa gim yang sebenarnya BISA dimainkan sedang tidak tersedia.
   */
  soloSaatOffline?: { players: string; desc: string }
}

const GAMES: Game[] = [
  // Paling atas: satu-satunya gim bertema pertarungan, dan kini selalu bisa
  // dimainkan berkat mode solo. Sebelumnya ia terkubur di bawah karena
  // bergantung pada server pertandingan yang mati.
  {
    title: "Kuis Tempur", desc: "Lawan murid lain real-time! Siapa cepat dan benar dia menang.",
    icon: Swords, href: "/arena/game/kuis-tempur", accentColor: "#EF4444",
    iconGradient: "from-red-500 to-red-600", featured: true,
    badge: { text: "Terpopuler", type: "hot" }, xp: "+80 XP", players: "2-8 pemain",
    time: "~5 menit", multiplayer: true,
    // Punya mode solo saat server mati, jadi ia TIDAK ikut dilabeli "Segera
    // Hadir" maupun disingkirkan ke bawah — gimnya memang bisa dimainkan.
    soloSaatOffline: {
      players: "Solo vs bot",
      desc: "Bertahan di arena! Jawab benar untuk menyerang, salah kamu yang terluka.",
    },
  },
  { title: "Menara Cerdas", desc: "Panjat menara dengan soal dari pelajaranmu! Makin tinggi, makin seru.", icon: Mountain, href: "/arena/game/menara", accentColor: "#8B5CF6", iconGradient: "from-violet-500 to-fuchsia-600", featured: true, badge: { text: "Baru", type: "new" }, xp: "+60 XP", players: "Solo", time: "~3 mnt" },
  { title: "Irama Kata", desc: "Kata jatuh di 4 jalur — ketuk hanya yang sesuai aturan! Ritme + refleks bahasa.", icon: Clock, href: "/arena/game/irama-kata", accentColor: "#F97316", iconGradient: "from-orange-500 to-rose-500", badge: { text: "Baru", type: "new" }, xp: "+60 XP", players: "Solo", time: "~1 mnt" },
  { title: "Benar atau Salah", desc: "Kuis kilat 60 detik! Tentukan jawaban yang muncul benar atau salah.", icon: ThumbsUp, href: "/arena/game/benar-salah", accentColor: "#14B8A6", iconGradient: "from-emerald-400 to-teal-600", badge: { text: "Baru", type: "new" }, xp: "+50 XP", players: "Solo", time: "~1 mnt" },
  { title: "Petualangan Kata", desc: "Bantu Si Cerdik Zelby menangkap kata yang benar di hutan! Seru, cepat, dan bikin jago Bahasa!", icon: TreePine, href: "/arena/game/petualangan-kata", accentColor: "#10B981", iconGradient: "from-emerald-500 to-green-600", featured: true, badge: { text: "Baru", type: "new" }, xp: "+90 XP", players: "Solo", time: "~1,5 mnt" },
  { title: "KataPlay", desc: "Belajar membaca dari nol! 4 tingkat, puluhan soal seru!", icon: BookOpen, href: "/arena/game/kata-play", accentColor: "#7C3AED", iconGradient: "from-violet-500 to-purple-600", badge: { text: "Baru", type: "new" }, xp: "+50 XP", players: "Solo", time: "~3 mnt" },
  { title: "Tebak Kata", desc: "Tebak dari petunjuk. Seru bareng teman!", icon: Type, href: "/arena/game/tebak-kata", accentColor: "#06B6D4", iconGradient: "from-cyan-500 to-cyan-600", xp: "+60 XP", players: "Solo", time: "~3 mnt" },
  { title: "Susun Kata", desc: "Acak huruf jadi kata benar dalam waktu limit!", icon: Puzzle, href: "/arena/game/susun-kata", accentColor: "#10B981", iconGradient: "from-emerald-500 to-emerald-600", xp: "+50 XP", players: "Solo", time: "~3 mnt" },
  { title: "Lari Kata", desc: "60 detik, 20 soal. Jawab secepat kilat!", icon: Zap, href: "/arena/game/lari-kata", accentColor: "#F59E0B", iconGradient: "from-amber-500 to-amber-600", badge: { text: "Baru", type: "new" }, xp: "+70 XP", players: "~1 mnt", time: "~1 mnt" },
]

export default async function ArenaGimPage() {
  const user = await getUser()
  if (!user) redirect("/arena/login")

  const limaMenitLalu = new Date(Date.now() - 5 * 60 * 1000)
  const sepuluhMenitLalu = new Date(Date.now() - 10 * 60 * 1000)

  const [totalMain, hasilAkhir, leagueRows, dailyCoinRows, onlineCount, recentBattles, recentPlayers] = await Promise.all([
    db.gameResult.count({ where: { userId: user.id } }),
    db.gameResult.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { room: { select: { code: true } } },
    }),
    // Same cache key as the Arena beranda's LeagueMini — shares the hit, one query for both pages.
    // Weekly (reset tiap Senin 00:00 WIB): baca PlayerProfile.weeklyXP, bukan XP seumur hidup.
    cache.getOrSet(`arena:league-mini:weekly:${weekKey()}:v1`, async () =>
      db.playerProfile.findMany({
        where: { weeklyXP: { gt: 0 }, user: { role: "MURID" } },
        orderBy: [{ weeklyXP: "desc" }, { totalXP: "desc" }],
        take: 5,
        include: { user: { select: { id: true, fullName: true, nickname: true } } },
      }).then(rows =>
        rows.map(p => ({ id: p.userId, fullName: p.user.fullName, nickname: p.user.nickname, xp: p.weeklyXP })),
      ),
      120
    ),
    cache.getOrSet("arena:league-mini:daily:v2", async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const earned = await db.coinTransaction.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: today }, amount: { gt: 0 }, user: { role: "MURID" } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 5,
      })
      const userIds = earned.map((e) => e.userId)
      if (userIds.length === 0) return []
      const users = await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true, nickname: true } })
      return earned.map((e) => {
        const u = users.find((us) => us.id === e.userId)
        return { id: e.userId, fullName: u?.fullName || "", nickname: u?.nickname, xp: e._sum.amount || 0 }
      })
    }, 120),
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

  // While the multiplayer server is offline, present multiplayer games as
  // "Segera Hadir" AND sink them below every playable game — a mislabeled
  // "Terpopuler" badge sitting mid-grid on a dead link is worse than the
  // label alone. Sort is stable, so playable games keep their authored order.
  // Gim multiplayer yang punya mode solo dikecualikan dari perlakuan itu: ia
  // tetap bisa dimainkan, cuma lawannya bot. Melabelinya "Segera Hadir" akan
  // menyuruh murid menjauh dari gim yang sebenarnya jalan.
  const offline = (g: Game) => Boolean(g.multiplayer) && !MULTIPLAYER_ENABLED && !g.soloSaatOffline

  const games: Game[] = GAMES.map((g): Game => {
    if (!g.multiplayer || MULTIPLAYER_ENABLED) return g
    if (g.soloSaatOffline) {
      return { ...g, players: g.soloSaatOffline.players, desc: g.soloSaatOffline.desc }
    }
    return { ...g, badge: { text: "Segera Hadir", type: "new" as const }, players: "Segera", desc: "Mode lawan real-time sedang kami siapkan. Segera hadir!" }
  }).sort((a, b) => Number(offline(a)) - Number(offline(b)))

  return (
    <div className="game-hub arena-page">
      <div className="game-ambient" />

      <div className="relative z-10 px-5 pb-6">
        <div className="pt-5 pb-5 flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-extrabold text-white font-game-display">Arena Gim</h1>
            <p className="text-sm text-[#7C7A9E] mt-0.5">Buktikan kemampuan Bahasa Indonesia-mu!</p>
          </div>
          <div className="glow-pulse flex items-center gap-1.5 px-3.5 py-2 rounded-full" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <Zap size={15} className="text-amber-400" />
            <span className="text-sm font-bold text-amber-400">{totalXp.toLocaleString()} XP</span>
          </div>
        </div>

        {/* Live battle banner */}
        <div className="mb-4">
          <BattleCard onlineCount={onlineCount} recentBattles={recentBattles} recentPlayers={recentPlayers} />
        </div>

        {/* Banner Arena — 2 informasi bersebelahan (kiri: Rank BC → Pemain, kanan: Arena Gim → Kuis Tempur) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <Link
            href="/arena/player"
            className="block relative overflow-hidden rounded-[20px] active:scale-[0.98] transition-transform group"
            style={{ boxShadow: "0 8px 28px rgba(220,38,38,0.25)" }}
          >
            <img
              src="/banners/rank-bc-banner.webp"
              alt="Profil Pemain — naikkan peringkatmu!"
              className="block w-full h-auto"
            />
          </Link>
          <Link
            href="/arena/game/kuis-tempur"
            className="block relative overflow-hidden rounded-[20px] active:scale-[0.98] transition-transform group"
            style={{ boxShadow: "0 8px 28px rgba(43,75,255,0.25)" }}
          >
            <img
              src="/Rank%20BC/banner%20arena%20gim.png"
              alt="Kuis Tempur — kini bisa main solo!"
              className="block w-full h-auto"
            />
          </Link>
        </div>

        {/* Petualangan Kata — Announcement Banner */}
        <Link
          href="/arena/game/petualangan-kata"
          className="block relative overflow-hidden rounded-[20px] mb-4 active:scale-[0.98] transition-transform group"
          style={{ background: "linear-gradient(120deg, #065F46, #059669 50%, #10B981)", boxShadow: "0 8px 28px rgba(5,150,105,0.25)" }}
        >
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
          <div className="absolute top-[-20px] right-[5px] w-[180px] h-[180px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.2), transparent 70%)" }} />
          <div className="relative z-10 p-[18px] flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0 border border-white/20 group-hover:scale-110 transition-transform">
              <TreePine size={30} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1 bg-emerald-400/30 backdrop-blur px-2 py-0.5 rounded-full text-[10px] font-extrabold text-emerald-100 tracking-wider mb-1.5">
                <Zap size={10} /> GIM BARU!
              </div>
              <h3 className="font-extrabold text-lg text-white leading-tight">
                Petualangan Kata bareng Si Cerdik Zelby!
              </h3>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.85)" }}>
                Ayo bantu Zelby menangkap kata BENDA, KERJA, atau SIFAT yang benar di hutan ajaib.
                Seru banget — poin combo, frenzy mode, dan skor tinggi!
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-md text-white">
                  &#x1F3AE; Gerakan jari
                </span>
                <span className="text-[10px] font-bold bg-amber-400/30 px-2 py-0.5 rounded-md text-amber-200">
                  +90 XP
                </span>
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>~1,5 menit</span>
              </div>
            </div>
            <div className="shrink-0 w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white group-hover:bg-white/25 transition-colors">
              &rarr;
            </div>
          </div>
        </Link>

        {/* Tantang Teman — promo card khusus, biar murid ngeh ini fitur duel yang beneran jalan */}
        <Link
          href="/arena/game/tantang"
          className="block relative overflow-hidden rounded-[20px] mb-6 active:scale-[0.98] transition-transform group"
          style={{ background: "linear-gradient(120deg, #4C1D95, #A21CAF 55%, #DB2777)", boxShadow: "0 8px 28px rgba(190,24,190,0.25)" }}
        >
          <div className="absolute top-[-30px] right-[10px] w-[160px] h-[160px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%)" }} />
          <div className="relative z-10 p-[18px] flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0 border border-white/20 group-hover:scale-105 transition-transform">
              <Users size={30} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white tracking-wider mb-1.5">
                <Swords size={10} /> DUEL 1 LAWAN 1
              </div>
              <h3 className="font-extrabold text-lg text-white leading-tight">Tantang Teman Sekelas!</h3>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.75)" }}>10 soal sama, siapa jawab lebih cepat & benar menang. Yuk buktikan!</p>
            </div>
            <div className="shrink-0 w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white group-hover:bg-white/25 transition-colors">
              &rarr;
            </div>
          </div>
        </Link>

        {/* Pilih Gim */}
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-[13px] font-bold tracking-[1.5px] uppercase" style={{ color: "#7C7A9E" }}>Pilih Gim</h3>
          <Link href="/arena" className="text-xs font-semibold" style={{ color: "#A855F7" }}>Lihat semua &rarr;</Link>
        </div>

        {/* Game grid — kartu pertama (featured) tampil lebar biar tidak terasa kaku */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {games.map((g, i) => {
            const isHero = i === 0
            return (
              <Link key={g.href} href={g.href}
                className={`game-card-anim relative overflow-hidden rounded-[20px] border active:scale-[0.96] transition-all hover:-translate-y-0.5 hover:shadow-xl game-card-hover ${isHero ? "col-span-2 p-5 flex items-center gap-4" : "p-4"}`}
                style={{ background: "#16122A", borderColor: "rgba(124,58,237,0.2)" }}
              >
                <div
                  className="absolute rounded-full pointer-events-none"
                  style={isHero
                    ? { top: -30, right: -30, width: 140, height: 140, background: `radial-gradient(circle, ${g.accentColor}33, transparent 70%)` }
                    : { top: -20, right: -20, width: 90, height: 90, background: `radial-gradient(circle, ${g.accentColor}22, transparent 70%)` }}
                />
                {!isHero && <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[20px]" style={{ background: g.accentColor }} />}

                <div className={`relative z-10 rounded-2xl bg-gradient-to-br ${g.iconGradient} flex items-center justify-center shrink-0 ${isHero ? "w-16 h-16" : "w-[52px] h-[52px] mb-3"}`}>
                  <g.icon size={isHero ? 28 : 24} className="text-white" />
                </div>

                <div className="relative z-10 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    {g.badge && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${g.badge.type === "hot" ? "bg-gradient-to-r from-red-500 to-red-600" : "bg-gradient-to-r from-emerald-500 to-green-600"}`}>
                        {g.badge.type === "hot" ? <Flame size={10} className="inline mr-0.5" /> : <Zap size={10} className="inline mr-0.5" />}
                        {g.badge.text}
                      </span>
                    )}
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>{g.players}</span>
                  </div>
                  <h4 className={`font-bold text-white mb-1 ${isHero ? "text-lg" : "text-[15px]"}`}>{g.title}</h4>
                  <p className={`leading-relaxed mb-2 ${isHero ? "text-xs" : "text-[11px]"}`} style={{ color: "#7C7A9E" }}>{g.desc}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>
                      <Zap size={9} className="inline mr-0.5" />{g.xp}
                    </span>
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{g.time}</span>
                  </div>
                </div>
              </Link>
            )
          })}
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
              <p className="text-[10px] font-semibold uppercase" style={{ color: "#7C7A9E" }}>XP Total</p>
            </div>
          </div>
        </div>

        {/* League / Leaderboard */}
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-[13px] font-bold tracking-[1.5px] uppercase" style={{ color: "#7C7A9E" }}>Liga Minggu Ini</h3>
          <Link href="/arena/league" className="text-xs font-semibold" style={{ color: "#A855F7" }}>Lihat semua &rarr;</Link>
        </div>

        <GameHubLeagueTabs
          userId={user.id}
          harian={dailyCoinRows.map((u) => ({ id: u.id, fullName: u.fullName, displayName: u.nickname || undefined, xp: u.xp }))}
          mingguan={leagueRows.map((u) => ({ id: u.id, fullName: u.fullName, displayName: u.nickname || undefined, xp: u.xp }))}
        />

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
