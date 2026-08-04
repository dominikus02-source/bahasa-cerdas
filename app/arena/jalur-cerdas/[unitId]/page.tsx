import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Lock, Zap, Trophy, BookOpen, ArrowRight, Sparkles, Coins, ListChecks } from "lucide-react"
import { UnitIcon } from "@/components/arena/UnitIcon"

export default async function UnitDetailPage({ params }: { params: Promise<{ unitId: string }> }) {
  const user = await getUser()
  if (!user) redirect("/arena/login")

  const { unitId } = await params

  const unit = await db.learningUnit.findUnique({
    where: { id: unitId },
    include: { level: true },
  })

  if (!unit) redirect("/arena/jalur-cerdas")

  let konten: any = null
  try { konten = unit.content ? JSON.parse(unit.content) : null } catch {}

  const questionCount = konten?.questions?.length ?? 0

  let isCompleted = false
  let userProgress = null
  try {
    userProgress = await db.userUnitProgress.findUnique({
      where: { userId_unitId: { userId: user.id, unitId } },
    })
    isCompleted = userProgress?.completed ?? false
  } catch {}

  const prevUnits = await db.learningUnit.findMany({
    where: {
      levelId: unit.levelId,
      order: { lt: unit.order },
      isActive: true,
    },
    orderBy: { order: "desc" },
    take: 1,
    select: { id: true },
  })

  let isUnlocked = unit.order === 1
  if (!isUnlocked && prevUnits.length > 0) {
    const prevProgress = await db.userUnitProgress.findUnique({
      where: { userId_unitId: { userId: user.id, unitId: prevUnits[0].id } },
    })
    isUnlocked = prevProgress?.completed ?? false
  }

  let nextUnit = null
  if (isCompleted) {
    nextUnit = await db.learningUnit.findFirst({
      where: {
        levelId: unit.levelId,
        order: { gt: unit.order },
        isActive: true,
      },
      orderBy: { order: "asc" },
      select: { id: true, title: true },
    })
    if (!nextUnit) {
      const currentLevel = unit.level
      if (currentLevel) {
        const nextLevel = await db.learningLevel.findFirst({
          where: { type: "JALUR", level: { gt: currentLevel.level } },
          orderBy: { level: "asc" },
          select: { id: true },
        })
        if (nextLevel) {
          nextUnit = await db.learningUnit.findFirst({
            where: { levelId: nextLevel.id, isActive: true },
            orderBy: { order: "asc" },
            select: { id: true, title: true },
          })
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 px-4 py-6">
      <Link href="/arena/jalur-cerdas" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-violet-600 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${unit.level?.color ?? "from-violet-500 to-purple-600"} flex items-center justify-center shadow-lg`}>
          <UnitIcon emoji={unit.emoji} className="w-7 h-7 text-white" />
        </div>
        <div>
          {unit.level && <p className="text-xs text-violet-600 font-semibold">{unit.level.title}</p>}
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-gray-500">Kemajuan</span>
          <span className="text-sm font-bold text-violet-600">
            {isCompleted ? "100%" : "0%"}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all ${isCompleted ? "bg-emerald-500" : "bg-violet-200"}`}
            style={{ width: isCompleted ? "100%" : "0%" }}
          />
        </div>
        {questionCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ListChecks className="w-4 h-4 text-violet-400" />
            {questionCount} soal latihan
          </div>
        )}
      </div>

      {isUnlocked ? (
        <Link
          href={`/arena/jalur-cerdas/${unitId}/lesson`}
          className="flex items-center justify-center gap-2 w-full bg-violet-600 text-white font-bold text-lg py-4 rounded-2xl hover:bg-violet-700 transition-colors active:scale-[0.98] shadow-lg shadow-violet-200 mb-4"
        >
          {isCompleted ? (
            <>
              <Sparkles className="w-5 h-5" />
              Coba lagi
            </>
          ) : (
            <>
              <BookOpen className="w-5 h-5" />
              Mulai latihan
            </>
          )}
        </Link>
      ) : (
        <div className="flex items-center justify-center gap-2 w-full bg-gray-200 text-gray-400 font-bold text-lg py-4 rounded-2xl mb-4 cursor-not-allowed">
          <Lock className="w-5 h-5" />
          Selesaikan unit sebelumnya
        </div>
      )}

      {isCompleted && nextUnit && (
        <Link
          href={`/arena/jalur-cerdas/${nextUnit.id}`}
          className="flex items-center justify-center gap-2 w-full bg-emerald-600 text-white font-semibold py-3 rounded-2xl hover:bg-emerald-700 transition-colors"
        >
          Lanjut ke unit berikutnya
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}

      <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-4 h-4 text-amber-600" />
          <p className="text-sm font-semibold text-amber-800">Hadiah</p>
        </div>
        <p className="text-sm text-amber-700">
          <Zap className="w-4 h-4 inline mr-0.5" />+{unit.xpReward || 50} XP
          <span className="mx-1">&middot;</span>
          <Coins className="w-4 h-4 inline mr-0.5" />+{unit.coinReward || 10} Koin Cerdas
        </p>
      </div>
    </div>
  )
}
