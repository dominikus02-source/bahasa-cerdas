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

interface ProfileUser {
  id: string;
  fullName: string;
  avatar: string | null;
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
  };
}

const LEAGUE_META: Record<string, { label: string; gradient: string; icon: LucideIcon }> = {
  BRONZE: { label: "Perunggu", gradient: "from-amber-500 to-orange-600", icon: Medal },
  SILVER: { label: "Perak", gradient: "from-slate-400 to-slate-600", icon: Medal },
  GOLD: { label: "Emas", gradient: "from-yellow-400 to-amber-500", icon: Award },
  DIAMOND: { label: "Berlian", gradient: "from-cyan-400 to-blue-500", icon: Gem },
};

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
  const league = LEAGUE_META[user.league] || LEAGUE_META.BRONZE;
  const LeagueIcon = league.icon;

  // Gradasi hero tetap dalam (bukan pastel) apapun ligan­ya, senada dengan
  // hero profil sendiri — supaya kontras teks putih selalu tinggi.
  const heroGradient = isGuru
    ? "linear-gradient(135deg, #042f2e 0%, #0f5c52 55%, #059669 100%)"
    : "linear-gradient(135deg, #1B1035 0%, #3B1878 55%, #6D28D9 100%)";
  const roleBadgeClass = isGuru ? "bg-emerald-500/90" : "bg-violet-500/90";

  return (
    <div className="max-w-3xl mx-auto">
      <style>{`
        @keyframes profile-shine{0%{transform:translateX(-120%) rotate(20deg)}100%{transform:translateX(220%) rotate(20deg)}}
      `}</style>

      <button
        onClick={() => router.back()}
        className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors mb-4"
      >
        <ChevronLeft size={20} />
      </button>

      {/* Hero — struktur & warna senada dengan halaman profil sendiri */}
      <div className="relative overflow-hidden rounded-[24px] p-6 md:p-8 text-white mb-6 shadow-2xl" style={{ background: heroGradient }}>
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full -translate-y-1/3 translate-x-1/3 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full translate-y-1/3 -translate-x-1/3 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.1), transparent 70%)" }} />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-1/4 h-[250%] bg-white/10" style={{ animation: "profile-shine 3.5s ease-in-out infinite", transform: "skewX(-20deg)" }} />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <UserAvatar
                size={80}
                avatar={user.avatar}
                frame={user.equippedFrame}
                initials={initials}
                gradient=""
                textClassName="text-2xl"
                className="bg-white/10 backdrop-blur border-4 border-white/20 shadow-lg"
              />
              {user.isFounder && (
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg ring-2 ring-white/80">
                  <Crown size={13} className="text-white" />
                </div>
              )}
              {!user.isFounder && user.isPremium && (
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-lg ring-2 ring-white/80">
                  <Star size={13} className="text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">
                <UserName
                  name={user.fullName}
                  color={user.equippedNameColor}
                  badge={user.equippedBadge}
                  onDark
                  badgeSize={18}
                />
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className={`${roleBadgeClass} backdrop-blur rounded-full px-2.5 py-1 text-[11px] font-bold flex items-center gap-1`}>
                  <GraduationCap size={11} /> {isGuru ? "Guru" : "Murid"}
                </span>
                {!isGuru && (
                  <span className={`bg-gradient-to-r ${league.gradient} rounded-full px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 shadow-sm`}>
                    <LeagueIcon size={11} /> {league.label}
                  </span>
                )}
                {user.isFounder && (
                  <span className="text-[11px] px-2.5 py-1 rounded-full font-bold bg-amber-400/90 text-amber-950 flex items-center gap-1">
                    <Crown size={11} /> Founder
                  </span>
                )}
                {!user.isFounder && user.isPremium && (
                  <span className="text-[11px] px-2.5 py-1 rounded-full font-bold bg-gradient-to-r from-blue-400 to-purple-400 flex items-center gap-1">
                    <Star size={11} /> PRO
                  </span>
                )}
                {!user.isFounder && !user.isPremium && (
                  <span className="text-[11px] px-2.5 py-1 rounded-full font-bold bg-white/10 border border-white/10">
                    Free
                  </span>
                )}
              </div>
            </div>
          </div>

          {user.profile?.bio && (
            <p className="text-sm text-white/70 leading-relaxed mt-4">{user.profile.bio}</p>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            {user.profile?.school && (
              <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur rounded-full px-3 py-1.5 text-xs border border-white/10">
                <School size={12} className="text-white/50" /> {user.profile.school}
              </div>
            )}
            {user.profile?.subject && (
              <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur rounded-full px-3 py-1.5 text-xs border border-white/10">
                <BookOpen size={12} className="text-white/50" /> {user.profile.subject}
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur rounded-full px-3 py-1.5 text-xs border border-white/10">
              <Calendar size={12} className="text-white/50" />
              {user.joinedAt
                ? `Bergabung ${new Date(user.joinedAt).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}`
                : "Bergabung baru-baru ini"}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-5">
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur rounded-2xl pl-2 pr-3.5 py-1.5 text-sm font-bold border border-white/10">
              <span className="w-6 h-6 rounded-lg bg-amber-400/20 flex items-center justify-center text-amber-300"><Zap size={13} /></span>
              {user.isFounder ? "∞" : user.xp.toLocaleString()}
            </div>
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur rounded-2xl pl-2 pr-3.5 py-1.5 text-sm font-bold border border-white/10">
              <span className="w-6 h-6 rounded-lg bg-violet-400/20 flex items-center justify-center text-violet-200"><TrendingUp size={13} /></span>
              Level {user.isFounder ? "∞" : user.level}
            </div>
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur rounded-2xl pl-2 pr-3.5 py-1.5 text-sm font-bold border border-white/10">
              <span className="w-6 h-6 rounded-lg bg-orange-400/20 flex items-center justify-center text-orange-300"><Flame size={13} /></span>
              {user.isFounder ? "∞" : user.streak}
            </div>
          </div>
        </div>
      </div>

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
        <div className="mb-6">
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
