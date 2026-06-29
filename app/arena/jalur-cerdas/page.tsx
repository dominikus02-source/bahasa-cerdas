import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"
import Link from "next/link"
import { redirect } from "next/navigation"
import { CheckCircle2, ChevronRight, Sprout, PenLine, BookOpen, Image, Clipboard, BarChart3, Sparkles, Music, Trophy, Dumbbell, Mic, Target, MessageCircle, Crown, Lock } from "lucide-react"
import type { ReactNode } from "react"

const iconMap: Record<string, ReactNode> = {
  "🌱": <Sprout className="w-5 h-5" />,
  "✏️": <PenLine className="w-5 h-5" />,
  "📖": <BookOpen className="w-5 h-5" />,
  "💬": <MessageCircle className="w-5 h-5" />,
  "📝": <PenLine className="w-5 h-5" />,
  "📚": <BookOpen className="w-5 h-5" />,
  "🖼️": <Image className="w-5 h-5" />,
  "📋": <Clipboard className="w-5 h-5" />,
  "📊": <BarChart3 className="w-5 h-5" />,
  "🎭": <Sparkles className="w-5 h-5" />,
  "🌟": <Sparkles className="w-5 h-5" />,
  "🎶": <Music className="w-5 h-5" />,
  "🏆": <Trophy className="w-5 h-5" />,
  "💪": <Dumbbell className="w-5 h-5" />,
  "🎤": <Mic className="w-5 h-5" />,
  "🎯": <Target className="w-5 h-5" />,
}

function getIcon(emoji: string | null, fallback: ReactNode = <BookOpen className="w-5 h-5" />): ReactNode {
  return emoji && iconMap[emoji] ? iconMap[emoji] : fallback
}

export default async function JalurCerdasPage() {
  const user = await getUser()
  if (!user) redirect("/auth/arena-login")

  const [levels, progress] = await Promise.all([
    db.learningLevel.findMany({
      where: { type: "JALUR" },
      orderBy: { level: "asc" },
      include: {
        units: {
          where: { isActive: true },
          orderBy: { order: "asc" },
        },
      },
    }),
    db.userUnitProgress.findMany({
      where: { userId: user.id },
    }),
  ])

  const completedMap = new Map(progress.filter(p => p.completed).map(p => [p.unitId, p]))
  const hasProgress = (unitId: string) => progress.some(p => p.unitId === unitId)

    const totalUnits = levels.reduce((s, l) => s + l.units.length, 0)
  const totalDone = levels.reduce((s, l) => s + l.units.filter(u => completedMap.has(u.id)).length, 0)
  const allDone = totalUnits > 0 && totalDone === totalUnits

  return (
    <div className="px-4 py-6 arena-page">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Jalur Cerdas</h1>
        <p className="text-sm text-gray-500 mt-1">Latihan Bahasa Indonesia dari nol sampai mahir</p>
        <p className="text-xs text-violet-500 font-medium mt-0.5">Cocok untuk semua usia &middot; Mulai dari dasar</p>
      </div>

      {/* Overall progress */}
      {totalUnits > 0 && (
        <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-2xl p-5 shadow-lg mb-6">
          <div className="flex items-center gap-4">
            {allDone ? (
              <div className="w-14 h-14 rounded-full bg-yellow-400 flex items-center justify-center">
                <Crown className="w-8 h-8 text-yellow-900" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <Trophy className="w-8 h-8 text-white" />
              </div>
            )}
            <div className="flex-1">
              {allDone ? (
                <>
                  <p className="text-lg font-bold text-white">Selamat! 🎉</p>
                  <p className="text-sm text-yellow-200">Kamu sudah menyelesaikan semua materi!</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-white">Progress Belajar</p>
                  <p className="text-sm text-violet-200">{totalDone}/{totalUnits} materi selesai</p>
                </>
              )}
            </div>
            <span className="text-2xl font-extrabold text-white">{Math.round((totalDone / totalUnits) * 100)}%</span>
          </div>
          <div className="w-full h-2.5 bg-white/20 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${totalUnits > 0 ? (totalDone / totalUnits) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {levels.map((level, levelIdx) => {
        const unitsInLevel = level.units.length
        const completedInLevel = level.units.filter(u => completedMap.has(u.id)).length
        const progressPercent = unitsInLevel > 0 ? Math.round((completedInLevel / unitsInLevel) * 100) : 0
        const unlocked = true // all levels unlocked
        const levelDone = unitsInLevel > 0 && completedInLevel === unitsInLevel

        return (
          <div key={level.id} className={`mb-8 ${!unlocked ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${level.color} flex items-center justify-center text-white shadow-lg`}>
                {levelDone ? <Trophy className="w-6 h-6" /> : unlocked ? getIcon(level.emoji, <BookOpen className="w-6 h-6" />) : <Lock className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-lg text-gray-900">{level.title}</h2>
                  {levelDone && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Selesai</span>}
                </div>
                <p className="text-xs text-gray-500">{level.subtitle}</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-gray-900">{completedInLevel}/{unitsInLevel}</span>
                <div className="w-20 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                  <div className="h-full rounded-full transition-all bg-violet-500" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {unitsInLevel === 0 && (
                <p className="text-sm text-gray-400 italic ml-2">Segera hadir...</p>
              )}
              {level.units.map((unit, idx) => {
                const unitCompleted = completedMap.has(unit.id)
                const unitUnlocked = true // all units unlocked
                return (
                  <Link
                    key={unit.id}
                    href={`/arena/jalur-cerdas/${unit.id}`}
                    className={`flex items-center gap-3 p-3.5 rounded-xl bg-white border transition-all ${
                      unitCompleted
                        ? "border-emerald-200 bg-emerald-50/50"
                        : "border-gray-100 hover:border-violet-200 hover:shadow-md"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        unitCompleted ? "bg-emerald-100" : "bg-violet-50"
                      }`}>
                        {unitCompleted ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        ) : (
                          <div className="text-violet-600">{getIcon(unit.emoji, <BookOpen className="w-5 h-5" />)}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm truncate ${unitCompleted ? "text-emerald-700" : "text-gray-900"}`}>
                        {unit.title}
                        {unitCompleted && <span className="ml-1.5 text-emerald-500">✓</span>}
                      </p>
                      {unit.subtitle && <p className="text-xs truncate text-gray-400">{unit.subtitle}</p>}
                      {hasProgress(unit.id) && !unitCompleted && (
                        <p className="text-[10px] text-violet-500 font-medium mt-0.5">Sedang dipelajari</p>
                      )}
                    </div>
                    {!unitCompleted && <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />}
                    {unitCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}

      {allDone && (
        <div className="text-center py-8 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl border border-amber-200 mb-4">
          <Crown className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <p className="text-lg font-extrabold text-amber-800">Luar Biasa!</p>
          <p className="text-sm text-amber-600 mt-1">Kamu sudah menyelesaikan semua level. Siap untuk UKBI!</p>
        </div>
      )}
    </div>
  )
}
