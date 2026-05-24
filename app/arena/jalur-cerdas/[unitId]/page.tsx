import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, BookOpen, PenLine, Swords, CheckCircle2, Circle, Lock, ArrowRight, Sprout, Image, Clipboard, BarChart3, Sparkles, Music, Trophy, Dumbbell, Mic, Target, MessageCircle } from "lucide-react"
import type { ReactNode } from "react"

const iconMap: Record<string, ReactNode> = {
  "🌱": <Sprout className="w-6 h-6 text-white" />,
  "✏️": <PenLine className="w-6 h-6 text-white" />,
  "📖": <BookOpen className="w-6 h-6 text-white" />,
  "💬": <MessageCircle className="w-6 h-6 text-white" />,
  "📝": <PenLine className="w-6 h-6 text-white" />,
  "📚": <BookOpen className="w-6 h-6 text-white" />,
  "🖼️": <Image className="w-6 h-6 text-white" />,
  "📋": <Clipboard className="w-6 h-6 text-white" />,
  "📊": <BarChart3 className="w-6 h-6 text-white" />,
  "🎭": <Sparkles className="w-6 h-6 text-white" />,
  "🌟": <Sparkles className="w-6 h-6 text-white" />,
  "🎶": <Music className="w-6 h-6 text-white" />,
  "🏆": <Trophy className="w-6 h-6 text-white" />,
  "💪": <Dumbbell className="w-6 h-6 text-white" />,
  "🎤": <Mic className="w-6 h-6 text-white" />,
  "🎯": <Target className="w-6 h-6 text-white" />,
}

interface KontenUnit {
  belajar: { tujuan: string[]; materi: { judul: string; isi: string[]; contoh: string[]; catatan?: string }[]; rangkuman: string[] }
  latihan: any[]
  praktik: { petunjuk: string; tips: string[]; contoh?: string }
  kuis: any[]
}

function getUnitIcon(emoji: string | null, fallback: ReactNode = <BookOpen className="w-6 h-6 text-white" />): ReactNode {
  return emoji && iconMap[emoji] ? iconMap[emoji] : fallback
}

export default async function UnitDetailPage({ params }: { params: Promise<{ unitId: string }> }) {
  const user = await getUser()
  if (!user) redirect("/auth/arena-login")

  const { unitId } = await params

  const unit = await db.learningUnit.findUnique({
    where: { id: unitId },
    include: { level: true },
  })

  if (!unit) redirect("/arena/jalur-cerdas")

  let konten: KontenUnit | null = null
  try { konten = unit.content ? JSON.parse(unit.content) : null } catch {}
  const hasBelajar = konten?.belajar?.materi?.length > 0
  const hasLatihan = konten?.latihan?.length > 0
  const hasPraktik = konten?.praktik?.petunjuk
  const hasKuis = konten?.kuis?.length > 0

  const progress = await db.userUnitProgress.findUnique({
    where: { userId_unitId: { userId: user.id, unitId } },
  })

  const isCompleted = progress?.completed ?? false

  return (
    <div className="px-4 py-6 arena-page">
      <Link href="/arena/jalur-cerdas" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-violet-600 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${unit.level.color} flex items-center justify-center shadow-lg`}>
          {getUnitIcon(unit.emoji)}
        </div>
        <div>
          <p className="text-xs text-violet-600 font-semibold">{unit.level.title}</p>
          <h1 className="text-xl font-bold text-gray-900">{unit.title}</h1>
          {unit.subtitle && <p className="text-sm text-gray-500">{unit.subtitle}</p>}
        </div>
      </div>

      {isCompleted && (
        <div className="flex items-center gap-2 p-3 mb-6 rounded-xl bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <p className="text-sm font-medium text-emerald-700">Kamu sudah menyelesaikan unit ini!</p>
        </div>
      )}

      <div className="space-y-3">
        <SectionCard
          icon={<BookOpen className="w-5 h-5 text-violet-500" />}
          title="Belajar"
          description="Baca teori, lihat contoh nyata"
          href={hasBelajar ? `/arena/jalur-cerdas/${unitId}/belajar` : `#`}
          color="violet"
          isComingSoon={!hasBelajar}
        />
        <SectionCard
          icon={<PenLine className="w-5 h-5 text-emerald-500" />}
          title="Latihan"
          description="Kerjakan soal pilihan ganda"
          href={hasLatihan ? `/arena/jalur-cerdas/${unitId}/latihan` : `#`}
          color="emerald"
          isComingSoon={!hasLatihan}
        />
        <SectionCard
          icon={<Swords className="w-5 h-5 text-orange-500" />}
          title="Praktik"
          description="Tulis karya sesuai materi"
          href={hasPraktik ? `/arena/jalur-cerdas/${unitId}/praktik` : `#`}
          color="orange"
          isComingSoon={!hasPraktik}
        />
        <SectionCard
          icon={<Swords className="w-5 h-5 text-rose-500" />}
          title="Kuis"
          description="Uji pemahaman dengan soal"
          href={hasKuis ? `/arena/jalur-cerdas/${unitId}/kuis` : `#`}
          color="rose"
          isComingSoon={!hasKuis}
        />
      </div>

      {unit.xpReward > 0 && (
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
          <p className="text-sm font-semibold text-amber-800">Reward</p>
          <p className="text-sm text-amber-700">
            +{unit.xpReward} XP • +{unit.coinReward} Koin Cerdas
          </p>
        </div>
      )}
    </div>
  )
}

function SectionCard({ icon, title, description, href, color, isComingSoon }: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
  color: string
  isComingSoon: boolean
}) {
  const colorMap: Record<string, string> = {
    violet: "hover:border-violet-200 hover:bg-violet-50/50",
    emerald: "hover:border-emerald-200 hover:bg-emerald-50/50",
    orange: "hover:border-orange-200 hover:bg-orange-50/50",
    rose: "hover:border-rose-200 hover:bg-rose-50/50",
  }

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-100 transition-all ${isComingSoon ? "opacity-60" : colorMap[color] || ""}`}>
      <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm text-gray-900">{title}</p>
          {isComingSoon && (
            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Segera</span>
          )}
        </div>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      {isComingSoon ? (
        <Lock className="w-4 h-4 text-gray-300 shrink-0" />
      ) : (
        <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
      )}
    </div>
  )
}
