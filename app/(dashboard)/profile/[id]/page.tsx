"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BookOpen, ShoppingBag, FileText, Award, Download,
  School, Calendar, Star, Crown,
  Target, GraduationCap, Zap, Flame, TrendingUp,
  ChevronLeft, Sparkles, Heart, Eye, Medal, Gem, PenLine, Loader2,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import UserAvatar from "@/components/arena/UserAvatar";
import UserName from "@/components/arena/UserName";
import { levelFromXp, getLevelProgress } from "@/lib/gamification/levels";
import { rankFromLevel } from "@/lib/gamification/ranks";
import { RankChip } from "@/components/gamification/RankChip";
import ProfileHero, { type HeroSocial } from "@/components/profile/ProfileHero";
import SocialProofStrip from "@/components/profile/SocialProofStrip";

interface ProfileUser {
  id: string;
  fullName: string;
  nickname?: string | null;
  displayName?: string | null;
  avatar: string | null;
  bio?: string | null;
  equippedFrame?: string | null;
  equippedNameColor?: string | null;
  equippedBadge?: string | null;
  role: string;
  isFounder: boolean;
  isPremium: boolean;
  premiumPlan: string;
  xp: number;
  level: number;
  streak: number;
  league: string;
  joinedAt: string;
  profile: {
    bio: string | null;
    nip: string | null;
    nuptk: string | null;
    school: string | null;
    subject: string | null;
  } | null;
  works?: { id: string; title: string; type: string; likesCount: number; viewsCount: number; createdAt: string }[];
  stats: {
    totalKarya: number;
    totalArtikel: number;
    totalSoal: number;
    totalMateri: number;
    totalSold: number;
    totalDownloads: number;
    totalLikes?: number;
  };
}

// Liga 4 tingkat dihapus — identitas publik memakai 9 rank resmi via RankChip.

const KARYA_LABELS: Record<string, string> = {
  PUISI: "Puisi", CERPEN: "Cerpen", ARTIKEL: "Artikel",
  ANEKDOT: "Anekdot", PANTUN: "Pantun", OPINI: "Opini",
};

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [social, setSocial] = useState<HeroSocial | null>(null);

  useEffect(() => {
    async function fetchSocial() {
      try {
        const res = await fetch(`/api/user/profile/${params.id}/social`);
        if (res.ok) setSocial(await res.json());
      } catch {}
    }
    fetchSocial();
  }, [params.id]);

  const toggleFollow = async () => {
    try {
      const res = await fetch(`/api/user/profile/${params.id}/follow`, { method: "POST" });
      if (!res.ok) return null;
      const data = await res.json();
      setSocial(prev => prev ? { ...prev, isFollowing: data.following, followerCount: data.followerCount } : prev);
      return { following: data.following };
    } catch {
      return null;
    }
  };

  const toggleLike = async () => {
    try {
      const res = await fetch(`/api/user/profile/${params.id}/like`, { method: "POST" });
      if (!res.ok) return null;
      const data = await res.json();
      setSocial(prev => prev ? { ...prev, isLiked: data.liked, profileLikeCount: data.profileLikeCount } : prev);
      return { liked: data.liked };
    } catch {
      return null;
    }
  };

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`/api/user/profile/${params.id}`);
        if (!res.ok) {
          setError("Profil tidak ditemukan");
          return;
        }
        const data = await res.json();
        setUser({
          ...data.user,
          // API mengembalikan "createdAt", bukan "joinedAt" — sebelumnya field
          // ini selalu undefined sehingga selalu tampil "Bergabung Invalid Date".
          joinedAt: data.user.createdAt,
          stats: {
            totalKarya: data.stats?.karyaCount ?? 0,
            totalArtikel: data.stats?.totalArtikel ?? 0,
            totalSoal: data.stats?.totalSoal ?? 0,
            totalMateri: data.stats?.totalMateri ?? 0,
            totalSold: data.stats?.totalSold ?? 0,
            totalDownloads: data.stats?.totalDownloads ?? 0,
            totalLikes: data.stats?.totalLikes ?? 0,
          },
          works: data.works || [],
        });
      } catch {
        setError("Gagal memuat profil");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BookOpen size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">{error || "User tidak ditemukan"}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-sm text-violet-600 font-semibold hover:underline"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const initials = user.fullName.slice(0, 2).toUpperCase();
  const isGuru = user.role === "GURU";
  const playerLevel = levelFromXp(user.xp || 0);
  const rank = rankFromLevel(playerLevel);
  const levelProgress = getLevelProgress(user.xp || 0);

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => router.back()}
        className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors mb-4"
      >
        <ChevronLeft size={20} />
      </button>

      {/* PLAYER CARD — hero publik (mode pengunjung): avatar kiri, rank crest
          besar di kanan, tombol Ikuti / Suka, strip sosial. */}
      <ProfileHero
        persona={{
          id: user.id,
          displayName: user.displayName || user.fullName,
          fullName: user.fullName,
          nickname: user.nickname,
          avatar: user.avatar,
          equippedFrame: user.equippedFrame,
          equippedNameColor: user.equippedNameColor,
          equippedBadge: user.equippedBadge,
          bio: user.bio || user.profile?.bio || null,
          level: playerLevel,
          xp: user.xp || 0,
          levelProgress,
          streak: user.streak ?? 0,
          isFounder: user.isFounder,
          isPremium: user.isPremium,
        }}
        rank={rank}
        social={social}
        isOwn={false}
        extraChips={
          <>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${isGuru ? "bg-emerald-500/25 text-emerald-200 border border-emerald-300/25" : "bg-violet-500/25 text-violet-200 border border-violet-300/25"}`}>
              <GraduationCap size={11} /> {isGuru ? "Guru" : "Murid"}
            </span>
            {user.isFounder && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold bg-amber-400/90 text-amber-950">
                <Crown size={11} /> Founder
              </span>
            )}
            {!user.isFounder && user.isPremium && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold bg-gradient-to-r from-blue-400 to-purple-400 text-white">
                <Star size={11} /> PRO
              </span>
            )}
            {!user.isFounder && !user.isPremium && (
              <span className="rounded-full px-2.5 py-1 text-[11px] font-bold bg-white/10 border border-white/15 text-white/70">
                Free
              </span>
            )}
            {user.profile?.school && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-white/5 border border-white/10 text-white/60">
                <School size={11} /> {user.profile.school}
              </span>
            )}
          </>
        }
        onFollowToggle={toggleFollow}
        onLikeToggle={toggleLike}
      />

      {/* Social proof strip — statistik ringkas di atas konten */}
      <section
        className="mb-6 rounded-[24px] p-4 sm:p-5 shadow-lg"
        style={{ background: "linear-gradient(140deg, #141230 0%, #231a52 60%, #34166e 100%)" }}
      >
        <SocialProofStrip
          grid="grid-cols-3 md:grid-cols-6"
          stats={[
            { key: "level", label: "Level", value: playerLevel, icon: "trophy" },
            { key: "xp", label: "XP", value: user.xp || 0, icon: "sparkles" },
            { key: "streak", label: "Streak", value: user.streak || 0, icon: "flame" },
            { key: "karya", label: "Karya", value: user.stats.totalKarya, icon: "book" },
            { key: "apresiasi", label: "Apresiasi", value: user.stats.totalLikes ?? 0, icon: "heart" },
            ...(social ? [{ key: "pengikut", label: "Pengikut", value: social.followerCount, icon: "users" as const }] : []),
          ]}
        />
      </section>

      {/* Stats grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Statistik</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { icon: ShoppingBag, value: user.stats.totalKarya, label: "Karya", warna: "from-emerald-500 to-teal-600" },
            { icon: FileText, value: user.stats.totalArtikel, label: "Artikel", warna: "from-blue-500 to-indigo-600" },
            { icon: BookOpen, value: user.stats.totalSoal, label: "Soal", warna: "from-violet-500 to-purple-600" },
            { icon: Award, value: user.stats.totalSold, label: "Terjual", warna: "from-amber-500 to-orange-600" },
            { icon: Download, value: user.stats.totalDownloads, label: "Diunduh", warna: "from-cyan-500 to-blue-600" },
            { icon: Target, value: user.stats.totalMateri, label: "Materi", warna: "from-rose-500 to-pink-600" },
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-center">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.warna} flex items-center justify-center mx-auto mb-1.5 shadow-sm`}>
                <s.icon size={16} className="text-white" />
              </div>
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
              <p className="text-[10px] text-gray-500 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Karya — the student's actual writings. Absent before: the page
          showed only stat numbers, so a student's work never appeared on
          their own profile. Links go to /arena/feed/[id], which admits
          murid, guru and founder, unlike /murid/karya/[id] which bounces
          teachers. */}
      {user.role === "MURID" && (
        <div className="mb-6" id="karya">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
              <PenLine size={15} className="text-white" />
            </span>
            <h3 className="font-bold text-gray-900">Karya {user.fullName.split(" ")[0]}</h3>
            <span className="text-xs text-gray-400">({user.stats.totalKarya})</span>
          </div>

          {!user.works || user.works.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-100">
              <BookOpen size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">Belum ada karya.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {user.works.map((w) => (
                <Link
                  key={w.id}
                  href={`/arena/feed/${w.id}`}
                  className="block bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-violet-200 transition-all"
                >
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-violet-600 mb-1.5">
                    {KARYA_LABELS[w.type] || "Karya"}
                  </span>
                  <h4 className="font-bold text-sm text-gray-900 leading-snug mb-2 line-clamp-2">{w.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Heart size={12} />{w.likesCount}</span>
                    <span className="flex items-center gap-1"><Eye size={12} />{w.viewsCount}</span>
                    <span className="ml-auto">{new Date(w.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cerdas title */}
      <div className="text-center pb-6">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold shadow-md bg-gradient-to-r ${isGuru ? "from-emerald-500 to-teal-500" : "from-violet-500 to-purple-500"}`}>
          <Sparkles size={16} />
          {isGuru ? "Guru Cerdas" : "Murid Cerdas"}
        </div>
      </div>
    </div>
  );
}
