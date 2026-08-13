"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Heart, Clock, Eye, PenLine, BookOpen, Newspaper, MessageCircle, Lightbulb, Music } from "lucide-react";
import SafeMediaImage from "@/components/shared/safe-media-image";
import ShareKaryaButton from "@/components/arena/ShareKaryaButton";
import CommentSection from "@/components/arena/CommentSection";
import UserAvatar from "@/components/arena/UserAvatar";
import UserName from "@/components/arena/UserName";
import { RankChip } from "@/components/gamification/RankChip";

interface CosmeticFields {
  equippedFrame?: string | null;
  equippedNameColor?: string | null;
  equippedBadge?: string | null;
}

interface KaryaDetail {
  id: string; title: string; content: string; excerpt?: string;
  type: string; coverImage?: string; photos?: string[]; likesCount: number; viewsCount: number;
  createdAt: string;
  user: { id: string; fullName: string; displayName?: string; avatar?: string; profile?: { school?: string; city?: string }; rank?: string } & CosmeticFields;
  comments: { id: string; content: string; createdAt: string; parentId: string | null; user: { id: string; fullName: string; displayName?: string; avatar: string | null; rank?: string } & CosmeticFields }[];
}

const nameOf = (u: { fullName: string; displayName?: string }) => u.displayName || u.fullName;

const TYPE_ICON: Record<string, any> = { PUISI: PenLine, CERPEN: BookOpen, ARTIKEL: Newspaper, ANEKDOT: MessageCircle, PANTUN: Music, OPINI: Lightbulb };
const TYPE_LABELS: Record<string, string> = { PUISI: "Puisi", CERPEN: "Cerpen", ARTIKEL: "Artikel", ANEKDOT: "Anekdot", PANTUN: "Pantun", OPINI: "Opini" };

function TypeIcon({ type, size = 14 }: { type: string; size?: number }) {
  const Icon = TYPE_ICON[type];
  if (!Icon) return null;
  return <Icon size={size} className="inline" />;
}

export default function DetailKaryaPage() {
  const { id } = useParams();
  const router = useRouter();
  const [karya, setKarya] = useState<KaryaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/siswa/karya/${id}`).then(r => r.ok ? r.json() : null),
      fetch("/api/user/me").then(r => r.ok ? r.json() : null),
    ]).then(([kData, uData]) => {
      setKarya(kData?.karya || null);
      setCurrentUserId(uData?.user?.id || uData?.user?.userId || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const isOwner = currentUserId && karya?.user.id === currentUserId;

  const handleDelete = async () => {
    if (!confirm("Yakin ingin menghapus karya ini? Tindakan ini tidak bisa dibatalkan.")) return;
    setDeleting(true);
    const res = await fetch(`/api/siswa/karya/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/murid/profile");
    } else {
      alert("Gagal menghapus karya. Silakan coba lagi.");
      setDeleting(false);
    }
  };

  const handleLike = async () => {
    const res = await fetch(`/api/siswa/karya/${id}/like`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setLiked(data.liked);
      setKarya(prev => prev ? { ...prev, likesCount: prev.likesCount + (data.liked ? 1 : -1) } : prev);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" /></div>;
  if (!karya) return <div className="text-center py-20 text-gray-500 dark:text-slate-400">Karya tidak ditemukan</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-slate-100 mb-4 transition-colors">
        <ArrowLeft size={16} /> Kembali
      </button>

      <div className="flex items-center gap-3 mb-6">
        <Link href={`/profile/${karya.user.id}`} className="shrink-0">
          <UserAvatar
            size={40}
            avatar={karya.user.avatar}
            frame={karya.user.equippedFrame}
            initials={nameOf(karya.user).charAt(0)}
            gradient="from-violet-400 to-purple-500"
            textClassName="text-sm"
          />
        </Link>
        <div className="flex-1">
          <UserName
            name={nameOf(karya.user)}
            href={`/profile/${karya.user.id}`}
            color={karya.user.equippedNameColor}
            badge={karya.user.equippedBadge}
            className="text-sm font-semibold text-gray-900 dark:text-slate-100 hover:text-violet-600"
            badgeSize={15}
          />
          {karya.user.rank && <RankChip rank={karya.user.rank} size={16} showTitle={false} compact className="mt-1" />}
          <p className="text-xs text-gray-400">
            {karya.user.profile?.school && `${karya.user.profile.school}${karya.user.profile.city ? ` · ${karya.user.profile.city}` : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock size={12} />
          {new Date(karya.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 ${
        karya.type === "PUISI" ? "bg-rose-100 text-rose-600" :
        karya.type === "CERPEN" ? "bg-blue-100 text-blue-600 dark:text-blue-400" :
        karya.type === "ARTIKEL" ? "bg-amber-100 text-amber-700 dark:text-amber-300" :
        karya.type === "ANEKDOT" ? "bg-orange-100 text-orange-600 dark:text-orange-400" :
        karya.type === "PANTUN" ? "bg-teal-100 text-teal-600" : "bg-violet-100 text-violet-600 dark:text-violet-400"
      }`}>
          <TypeIcon type={karya.type} />
          <span>{TYPE_LABELS[karya.type]}</span>
      </div>

      {karya.coverImage && (
        <div className="relative w-full h-64 rounded-xl overflow-hidden bg-gradient-to-br from-violet-100 to-violet-200">
          <SafeMediaImage
            src={karya.coverImage}
            alt=""
            fallbackType="default"
            containerClassName="w-full h-full"
          />
        </div>
      )}

      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-slate-100 mb-6 leading-snug">{karya.title}</h1>

      <div className="prose prose-gray max-w-none mb-8 whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-slate-300">
        {karya.content}
      </div>

      {karya.photos && karya.photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-8">
          {karya.photos.map((url) => (
            <img key={url} src={url} alt={karya.title} className="w-full aspect-square rounded-xl border border-gray-100 dark:border-slate-800 object-cover" />
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-100 dark:border-slate-800">
        <button onClick={handleLike} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
          liked ? "bg-red-50 text-red-500" : "bg-gray-50 dark:bg-slate-800/60 text-gray-500 hover:bg-red-50 hover:text-red-500"
        }`}>
          <Heart size={18} fill={liked ? "currentColor" : "none"} />
          {karya.likesCount} Suka
        </button>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 dark:bg-slate-800/60 text-gray-500 text-sm">
          <Eye size={18} /> {karya.viewsCount} Dilihat
        </div>
        <ShareKaryaButton karyaId={karya.id} title={karya.title} className="gap-2 px-4 py-2 rounded-xl bg-gray-50 dark:bg-slate-800/60 text-gray-500 hover:bg-blue-50 hover:text-blue-500 ml-auto" />
        {isOwner && (
          <button onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 hover:bg-red-100 text-sm font-medium transition-all disabled:opacity-50"
          >
            {deleting ? (
              <div className="animate-spin w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            )}
            Hapus
          </button>
        )}
      </div>

      <div className="mb-6">
        <CommentSection
          karyaId={karya.id}
          initialComments={karya.comments}
          initialCount={karya.comments.length}
          currentUserId={currentUserId || ""}
        />
      </div>
    </div>
  );
}
