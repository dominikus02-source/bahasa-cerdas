import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Heart, MessageCircle, Eye, Clock, Sparkles, BookOpen, FileText, Smile, Music, MessageSquare } from "lucide-react"
import { ToggleLike } from "./toggle-like"

const typeIcon: Record<string, { icon: React.ReactNode }> = {
  PUISI: { icon: <Sparkles className="w-5 h-5" /> },
  CERPEN: { icon: <BookOpen className="w-5 h-5" /> },
  ARTIKEL: { icon: <FileText className="w-5 h-5" /> },
  ANEKDOT: { icon: <Smile className="w-5 h-5" /> },
  PANTUN: { icon: <Music className="w-5 h-5" /> },
  OPINI: { icon: <MessageSquare className="w-5 h-5" /> },
}
const typeLabel: Record<string, string> = {
  PUISI: "Puisi", CERPEN: "Cerpen", ARTIKEL: "Artikel", ANEKDOT: "Anekdot", PANTUN: "Pantun", OPINI: "Opini",
}

export default async function FeedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) redirect("/auth/arena-login")

  const { id } = await params

  const karya = await db.studentKarya.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, fullName: true, avatar: true } },
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: user.id }, take: 1 },
    },
  })

  if (!karya) redirect("/arena/feed")

  const comments = await db.studentKaryaComment.findMany({
    where: { karyaId: id },
    include: { user: { select: { id: true, fullName: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  await db.studentKarya.update({ where: { id }, data: { viewsCount: { increment: 1 } } })

  const userLiked = karya.likes.length > 0

  return (
    <div className="arena-page">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
        <Link href="/arena/feed" className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <p className="font-semibold text-gray-900 text-sm">Karya</p>
      </div>

      {/* Konten karya */}
      <div className="px-4 py-5">
        <div className="flex items-center gap-3 mb-4">
          {karya.user ? (
            <>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shrink-0">
                {karya.user.fullName?.charAt(0).toUpperCase() || "?"}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-base">{karya.user.fullName}</p>
                <p className="text-sm text-gray-500">
                  {typeLabel[karya.type] || karya.type}
                </p>
              </div>
            </>
          ) : (
            <div>
              <p className="font-bold text-gray-900 text-base">Pengguna</p>
              <p className="text-sm text-gray-500">{typeLabel[karya.type] || karya.type}</p>
            </div>
          )}
          <span className="ml-auto text-sm text-gray-400 flex items-center gap-1">
            <Clock className="w-4 h-4" /> {waktuLalu(karya.createdAt)}
          </span>
        </div>

        <h1 className="text-xl font-extrabold text-gray-900 mb-4 arena-balance">{karya.title}</h1>

        <div className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap mb-6">
          {karya.content}
        </div>

        {/* Stat bar */}
        <div className="flex items-center gap-4 py-4 border-t border-gray-100">
          <ToggleLike karyaId={karya.id} initialLiked={userLiked} initialCount={karya._count.likes} />
          <span className="flex items-center gap-1.5 text-sm text-gray-500">
            <MessageCircle className="w-5 h-5 text-violet-400" />
            {karya._count.comments}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-gray-500 ml-auto">
            <Eye className="w-5 h-5 text-gray-400" />
            {karya.viewsCount || 0}
          </span>
        </div>
      </div>

      {/* Komentar */}
      <div className="px-4 pb-6">
        <h2 className="font-bold text-gray-900 text-base mb-4">Komentar ({karya._count.comments})</h2>
        {comments.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">Belum ada komentar. Jadilah yang pertama!</p>
        )}
        <div className="space-y-4">
          {comments.map((c: any) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {c.user?.fullName?.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{c.user?.fullName}</p>
                  <span className="text-xs text-gray-400">{waktuLalu(c.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
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
