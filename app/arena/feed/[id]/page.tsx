import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Heart, MessageCircle, Eye, Clock, Sparkles, BookOpen, FileText, Smile, Music, MessageSquare } from "lucide-react"
import { ToggleLike } from "./toggle-like"
import CommentSection from "@/components/arena/CommentSection"
import DeleteKaryaButton from "@/components/arena/DeleteKaryaButton"
import KaryaRewardToast from "@/components/arena/KaryaRewardToast"
import { getDisplayName } from "@/lib/nickname"

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
      user: { select: { id: true, fullName: true, nickname: true, avatar: true } },
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: user.id }, take: 1 },
    },
  })

  if (!karya) redirect("/arena/feed")

  const isGuruViewer = user.role === "GURU" || user.isFounder
  const authorName = karya.user ? (isGuruViewer ? karya.user.fullName : getDisplayName(karya.user, "peer")) : "Pengguna"

  const rawComments = await db.studentKaryaComment.findMany({
    where: { karyaId: id },
    include: { user: { select: { id: true, fullName: true, nickname: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  })
  const comments = rawComments.map(c => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    user: { ...c.user, displayName: isGuruViewer ? c.user.fullName : getDisplayName(c.user, "peer") },
  }))

  await db.studentKarya.update({ where: { id }, data: { viewsCount: { increment: 1 } } })

  const userLiked = karya.likes.length > 0

  return (
    <div className="arena-page">
      <KaryaRewardToast />
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
        <Link href="/arena/feed" className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <p className="font-semibold text-gray-900 text-sm">Karya</p>
      </div>

      <div className="px-4 py-5">
        <div className="flex items-center gap-3 mb-4">
          {karya.user ? (
            <>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shrink-0 overflow-hidden">
                {karya.user.avatar ? <img src={karya.user.avatar} alt="" className="w-full h-full object-cover" /> : authorName.charAt(0).toUpperCase() || "?"}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-base">{authorName}</p>
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

        {karya.coverImage && (
          <img
            src={karya.coverImage}
            alt={karya.title}
            className="w-full rounded-2xl border border-gray-100 mb-5 object-cover max-h-96"
          />
        )}

        <div className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap mb-6">
          {karya.content}
        </div>

        {karya.photos.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-6">
            {karya.photos.map((url) => (
              <img key={url} src={url} alt={karya.title} className="w-full aspect-square rounded-xl border border-gray-100 object-cover" />
            ))}
          </div>
        )}

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
          <DeleteKaryaButton karyaId={karya.id} isOwner={karya.user.id === user.id} />
        </div>
      </div>

      <div className="px-4 pb-6">
        <CommentSection
          karyaId={karya.id}
          initialComments={comments}
          initialCount={karya._count.comments}
          currentUserId={user.id}
        />
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
