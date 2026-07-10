import Link from "next/link"
import { Swords, Zap, Sparkles } from "lucide-react"
import { MULTIPLAYER_ENABLED } from "@/lib/features"

interface RecentPlayer {
  userId: string
  user: { fullName: string } | null
}

interface BattleCardProps {
  onlineCount: number
  recentBattles: number
  recentPlayers: RecentPlayer[]
}

const colores = ["#7C3AED", "#EC4899", "#10B981", "#F59E0B", "#06B6D4"]

export default function BattleCard({ onlineCount, recentBattles, recentPlayers }: BattleCardProps) {
  const total = Math.max(recentBattles, onlineCount)

  // Multiplayer server is offline — show a teaser instead of a live link.
  if (!MULTIPLAYER_ENABLED) {
    return (
      <div
        className="block relative overflow-hidden rounded-[20px]"
        style={{ background: "linear-gradient(135deg, #1A0A3D, #2D1566)", boxShadow: "0 8px 28px rgba(108,53,222,0.2)" }}
      >
        <div className="absolute top-[-40px] right-[-40px] w-[180px] h-[180px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.35), transparent 70%)" }} />
        <div className="relative z-10 p-[18px]">
          <div className="inline-flex items-center gap-1 bg-amber-400 text-amber-950 px-2.5 py-1 rounded-full text-[11px] font-extrabold tracking-wider mb-2.5">
            <Sparkles size={12} /> SEGERA HADIR
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Swords size={18} className="text-pink-400" />
            <h3 className="font-extrabold text-xl text-white">Adu Cepat</h3>
          </div>
          <p className="text-xs mb-3.5" style={{ color: "rgba(255,255,255,0.55)" }}>
            Mode lawan murid lain sedang kami siapkan agar bisa menampung banyak pemain sekaligus. Nantikan, ya!
          </p>
          <div className="w-full py-3 rounded-xl text-center font-bold text-white/70 text-sm flex items-center justify-center gap-2" style={{ background: "rgba(255,255,255,0.08)" }}>
            <Zap size={16} /> Segera Hadir
          </div>
        </div>
      </div>
    )
  }

  return (
    <Link
      href="/arena/game/adu-cepat"
      className="block relative overflow-hidden rounded-[20px] active:scale-[0.98] transition-transform"
      style={{
        background: "linear-gradient(135deg, #1A0A3D, #2D1566)",
        boxShadow: "0 8px 28px rgba(108,53,222,0.3)",
      }}
    >
      {/* Glow orbs */}
      <div
        className="absolute top-[-40px] right-[-40px] w-[180px] h-[180px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.4), transparent 70%)" }}
      />
      <div
        className="absolute bottom-[-30px] left-[20px] w-[120px] h-[120px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,71,87,0.2), transparent 70%)" }}
      />

      <div className="relative z-10 p-[18px]">
        {/* LIVE badge */}
        <div className="inline-flex items-center gap-1 bg-red-500 px-2.5 py-1 rounded-full text-[11px] font-extrabold text-white tracking-wider mb-2.5">
          <span className="w-1.5 h-1.5 bg-white rounded-full" style={{ animation: "blink-dot 0.9s ease-in-out infinite" }} />
          LIVE
        </div>

        {/* Title */}
        <div className="flex items-center gap-2 mb-1">
          <Swords size={18} className="text-pink-400" />
          <h3 className="font-extrabold text-xl text-white">Adu Cepat</h3>
        </div>

        {/* Description */}
        <p className="text-xs mb-3.5" style={{ color: "rgba(255,255,255,0.55)" }}>
          {total} murid sedang bertanding sekarang — jangan ketinggalan!
        </p>

        {/* Social proof avatars */}
        <div className="flex items-center mb-3.5">
          {recentPlayers.slice(0, 5).map((r, i) => (
            <div
              key={r.userId}
              className="w-7 h-7 rounded-[9px] border-2 border-[#2D1566] -ml-1.5 first:ml-0 flex items-center justify-center text-[11px] font-bold text-white"
              style={{ background: colores[i] }}
            >
              {r.user?.fullName?.charAt(0).toUpperCase() || "?"}
            </div>
          ))}
          <span className="ml-2 text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
            +<strong className="text-white font-bold">{Math.max(0, onlineCount - recentPlayers.length)}</strong> lainnya online
          </span>
        </div>

        {/* CTA */}
        <div
          className="w-full py-3 rounded-xl text-center font-bold text-white text-sm flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg, #7C3AED, #EC4899)",
            boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
          }}
        >
          <Zap size={16} /> Cari Lawan Sekarang
        </div>
      </div>
    </Link>
  )
}
