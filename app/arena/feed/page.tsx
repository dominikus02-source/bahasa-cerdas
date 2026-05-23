import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Heart, MessageCircle, Eye, Clock, Sparkles, BookOpen, FileText, Smile, Music, MessageSquare, PenLine } from "lucide-react"

const typeIcon: Record<string, { icon: React.ReactNode; warna: string }> = {
  PUISI: { icon: <Sparkles className="w-4 h-4" />, warna: "from-fuchsia-500 to-pink-600" },
  CERPEN: { icon: <BookOpen className="w-4 h-4" />, warna: "from-blue-500 to-indigo-600" },
  ARTIKEL: { icon: <FileText className="w-4 h-4" />, warna: "from-emerald-500 to-teal-600" },
  ANEKDOT: { icon: <Smile className="w-4 h-4" />, warna: "from-amber-500 to-orange-600" },
  PANTUN: { icon: <Music className="w-4 h-4" />, warna: "from-violet-500 to-purple-600" },
  OPINI: { icon: <MessageSquare className="w-4 h-4" />, warna: "from-rose-500 to-red-600" },
}

const typeLabel: Record<string, string> = {
  PUISI: "Puisi", CERPEN: "Cerpen", ARTIKEL: "Artikel", ANEKDOT: "Anekdot", PANTUN: "Pantun", OPINI: "Opini",
}

export default async function FeedPage() {
  const user = await getUser()
  if (!user) redirect("/auth/arena-login")

  const karyaList = await db.studentKarya.findMany({
    include: {
      user: { select: { id: true, fullName: true, avatar: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { likesCount: "desc" },
    take: 20,
  })

  return (
    <div className="px-0 py-5">
      <div className="px-4 mb-5">
        <h1 className="text-xl font-extrabold text-gray-900">Feed Karya</h1>
        <p className="text-sm text-gray-500 mt-1">Karya terbaru dari murid-murid di seluruh Indonesia</p>
      </div>

      {karyaList.length === 0 && (
        <div className="text-center py-20 px-4">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-4">
            <PenLine className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">Belum ada karya nih!</p>
          <Link href="/arena/tulis" className="inline-block mt-3 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold">
            Tulis Karya Pertama
          </Link>
        </div>
      )}

      <div className="space-y-3 px-4">
        {karyaList.map((karya: any) => {
          const content = karya.content?.replace(/\n{3,}/g, "\n\n").trim() || ""

          return (
            <Link
              key={karya.id}
              href={`/arena/feed/${karya.id}`}
              className="block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all active:scale-[0.99]"
            >
              <div className="p-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${typeIcon[karya.type]?.warna || "from-gray-500 to-gray-600"} flex items-center justify-center text-white shrink-0`}>
                    {typeIcon[karya.type]?.icon || <FileText className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{karya.user?.fullName || "Pengguna"}</p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1">
                      <span className="font-semibold text-gray-500">{typeLabel[karya.type] || karya.type}</span>
                      {karya.user?.profile?.school && <><span>-</span> {karya.user.profile.school}</>}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {waktuLalu(karya.createdAt)}
                  </span>
                </div>

                <h3 className="font-bold text-gray-900 text-base mb-1.5 leading-snug">{karya.title}</h3>

                <p className="text-sm text-gray-600 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                  {content}
                </p>

                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Heart className="w-4 h-4 text-rose-400" />
                    {karya.likesCount}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <MessageCircle className="w-4 h-4 text-violet-400" />
                    {karya._count.comments}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
                    <Eye className="w-4 h-4 text-gray-400" />
                    {karya.viewsCount || 0}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function waktuLalu(date: Date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "baru saja"
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}j`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}h`
  return new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
}
