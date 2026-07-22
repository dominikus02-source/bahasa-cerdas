"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BookOpen, ShoppingBag, FileText, Award, Download,
  MapPin, School, Briefcase, Calendar, Star, Crown,
  Target, GraduationCap, Zap, Flame, TrendingUp,
  ChevronLeft, Sparkles, Users, Heart, Eye, Medal, Gem, PenLine
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface ProfileUser {
  id: string;
  fullName: string;
  avatar: string | null;
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

const LEAGUE_COLORS: Record<string, string> = {
  BRONZE: "from-amber-700 to-amber-600",
  SILVER: "from-slate-400 to-slate-300",
  GOLD: "from-yellow-500 to-amber-400",
  DIAMOND: "from-cyan-500 to-blue-400",
};

// Real icons, not emoji, per the no-emoji-as-icon rule.
const LEAGUE_ICONS: Record<string, LucideIcon> = {
  BRONZE: Medal,
  SILVER: Medal,
  GOLD: Award,
  DIAMOND: Gem,
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
        setUser(data.user);
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400">Memuat profil...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <BookOpen size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">{error || "User tidak ditemukan"}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-sm text-emerald-600 font-semibold hover:underline"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const initials = user.fullName.slice(0, 2).toUpperCase();
  const isGuru = user.role === "GURU";
  const leagueColor = LEAGUE_COLORS[user.league] || LEAGUE_COLORS.BRONZE;
  const LeagueIcon = LEAGUE_ICONS[user.league] || LEAGUE_ICONS.BRONZE;

  const gradientFrom = isGuru ? "from-emerald-600" : "from-violet-600";
  const gradientVia = isGuru ? "via-teal-500" : "via-purple-500";
  const gradientTo = isGuru ? "to-cyan-500" : "to-pink-500";
  const accentColor = isGuru ? "emerald" : "violet";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-12">
      {/* Cover */}
      <div className={`relative bg-gradient-to-br ${gradientFrom} ${gradientVia} ${gradientTo}`}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

        {/* Back button */}
        <div className="relative z-10 px-4 pt-4 pb-24">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
      </div>

      {/* Profile section - overlapping cover */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 -mt-20">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
          {/* Profile header */}
          <div className="px-6 pt-0 pb-6">
            {/* Avatar */}
            <div className="flex justify-center -mt-12 mb-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg ring-4 ring-white">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.fullName} className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                {/* Premium badge */}
                {user.isFounder && (
                  <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg ring-2 ring-white">
                    <Crown size={14} className="text-white" />
                  </div>
                )}
                {!user.isFounder && user.isPremium && (
                  <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-lg ring-2 ring-white">
                    <Star size={14} className="text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Name & badge */}
            <div className="text-center mb-4">
              <h1 className="text-xl font-bold text-gray-900">{user.fullName}</h1>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  isGuru ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"
                }`}>
                  <GraduationCap size={12} className="inline mr-1" />
                  {isGuru ? "Guru" : "Murid"}
                </span>
                {user.isFounder && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-amber-100 text-amber-700 flex items-center gap-1">
                    <Crown size={10} /> Founder
                  </span>
                )}
                {!user.isFounder && user.isPremium && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center gap-1 shadow-sm">
                    <Star size={10} /> PRO
                  </span>
                )}
                {!user.isFounder && !user.isPremium && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-gray-100 text-gray-600">
                    Free
                  </span>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-100 mb-4" />

            {/* Bio */}
            {user.profile?.bio && (
              <p className="text-sm text-gray-600 text-center leading-relaxed mb-4">
                {user.profile.bio}
              </p>
            )}

            {/* Info chips */}
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {user.profile?.school && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 text-xs">
                  <School size={14} className="text-gray-400" />
                  {user.profile.school}
                </div>
              )}
              {user.profile?.subject && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 text-xs">
                  <BookOpen size={14} className="text-gray-400" />
                  {user.profile.subject}
                </div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 text-xs">
                <Calendar size={14} className="text-gray-400" />
                Bergabung {new Date(user.joinedAt).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
              </div>
            </div>

            {/* XP & Level */}
            <div className="flex items-center justify-center gap-4 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                  <Zap size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">XP</p>
                  <p className="text-sm font-bold text-amber-700">{user.isFounder ? "∞" : user.xp.toLocaleString()}</p>
                </div>
              </div>
              <div className="w-px h-8 bg-amber-200" />
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${leagueColor} flex items-center justify-center shadow-sm`}>
                  <LeagueIcon size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Level</p>
                  <p className="text-sm font-bold text-gray-800">{user.isFounder ? "∞" : user.level}</p>
                </div>
              </div>
              <div className="w-px h-8 bg-amber-200" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-sm">
                  <Flame size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Streak</p>
                  <p className="text-sm font-bold text-red-600">{user.isFounder ? "∞" : user.streak}</p>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-100 text-center">
                <ShoppingBag size={18} className="mx-auto text-emerald-500 mb-1" />
                <p className="text-lg font-bold text-emerald-700">{user.stats.totalKarya}</p>
                <p className="text-[10px] text-emerald-500 font-medium">Karya</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-100 text-center">
                <FileText size={18} className="mx-auto text-blue-500 mb-1" />
                <p className="text-lg font-bold text-blue-700">{user.stats.totalArtikel}</p>
                <p className="text-[10px] text-blue-500 font-medium">Artikel</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-50 to-violet-100/50 border border-violet-100 text-center">
                <BookOpen size={18} className="mx-auto text-violet-500 mb-1" />
                <p className="text-lg font-bold text-violet-700">{user.stats.totalSoal}</p>
                <p className="text-[10px] text-violet-500 font-medium">Soal</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-100 text-center">
                <Award size={18} className="mx-auto text-amber-500 mb-1" />
                <p className="text-lg font-bold text-amber-700">{user.stats.totalSold}</p>
                <p className="text-[10px] text-amber-500 font-medium">Terjual</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-cyan-100/50 border border-cyan-100 text-center">
                <Download size={18} className="mx-auto text-cyan-500 mb-1" />
                <p className="text-lg font-bold text-cyan-700">{user.stats.totalDownloads}</p>
                <p className="text-[10px] text-cyan-500 font-medium">Diunduh</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-rose-50 to-rose-100/50 border border-rose-100 text-center">
                <Target size={18} className="mx-auto text-rose-500 mb-1" />
                <p className="text-lg font-bold text-rose-700">{user.stats.totalMateri}</p>
                <p className="text-[10px] text-rose-500 font-medium">Materi</p>
              </div>
            </div>
          </div>
        </div>

        {/* Karya — the student's actual writings. Absent before: the page
            showed only stat numbers, so a student's work never appeared on
            their own profile. Links go to /arena/feed/[id], which admits
            murid, guru and founder, unlike /murid/karya/[id] which bounces
            teachers. */}
        {user.role === "MURID" && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <PenLine size={16} className="text-violet-500" />
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
        <div className="mt-6 text-center">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold shadow-md ${
            isGuru ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-violet-500 to-purple-500"
          }`}>
            <Sparkles size={16} />
            {isGuru ? "Guru Cerdas" : "Murid Cerdas"}
          </div>
        </div>
      </div>
    </div>
  );
}
