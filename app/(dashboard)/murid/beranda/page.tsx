"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { Heart, MessageCircle, Eye, Clock, Plus, Target, ShoppingBag } from "lucide-react";

type KaryaType = "PUISI" | "CERPEN" | "ARTIKEL" | "ANEKDOT" | "PANTUN" | "OPINI";

interface Karya {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  type: KaryaType;
  coverImage?: string;
  likesCount: number;
  viewsCount: number;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    avatar?: string;
    profile?: { school?: string; city?: string };
  };
}

const TYPE_LABELS: Record<string, string> = {
  PUISI: "Puisi", CERPEN: "Cerpen", ARTIKEL: "Artikel",
  ANEKDOT: "Anekdot", PANTUN: "Pantun", OPINI: "Opini",
};
const TYPE_COLORS: Record<string, string> = {
  PUISI: "bg-rose-100 text-rose-600",
  CERPEN: "bg-blue-100 text-blue-600",
  ARTIKEL: "bg-amber-100 text-amber-700",
  ANEKDOT: "bg-orange-100 text-orange-600",
  PANTUN: "bg-teal-100 text-teal-600",
  OPINI: "bg-violet-100 text-violet-600",
};
const TYPE_EMOJIS: Record<string, string> = {
  PUISI: "🖋️", CERPEN: "📖", ARTIKEL: "📰",
  ANEKDOT: "😄", PANTUN: "🎵", OPINI: "💭",
};

export default function HomeFeedPage() {
  const [user, setUser] = useState<any>(null);
  const [karyaList, setKaryaList] = useState<Karya[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeType, setActiveType] = useState<string>("");
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/user/me").then(r => r.ok ? r.json() : null).then(d => setUser(d?.user || null));
  }, []);

  const fetchKarya = useCallback(async (pageNum: number, type: string, append: boolean) => {
    const params = new URLSearchParams({ page: String(pageNum), limit: "10" });
    if (type) params.set("type", type);
    const res = await fetch(`/api/siswa/karya?${params}`);
    const data = await res.json();
    if (append) {
      setKaryaList(prev => [...prev, ...data.karya]);
    } else {
      setKaryaList(data.karya);
    }
    setTotalPages(data.totalPages);
    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    setKaryaList([]);
    setPage(1);
    fetchKarya(1, activeType, false);
  }, [activeType, fetchKarya]);

  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingMore && page < totalPages) {
        setLoadingMore(true);
        const nextPage = page + 1;
        setPage(nextPage);
        fetchKarya(nextPage, activeType, true);
      }
    }, { threshold: 0.5 });
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [page, totalPages, loadingMore, activeType, fetchKarya]);

  const TYPES = ["", "PUISI", "CERPEN", "ARTIKEL", "ANEKDOT", "PANTUN"];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Compact Stats Header */}
      {user && (
        <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-2xl p-5 text-white mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-lg border border-white/30">
                {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full rounded-xl object-cover" /> : user.fullName?.charAt(0).toUpperCase() || "M"}
              </div>
              <div>
                <h1 className="font-bold">Halo, {user.fullName?.split(" ")[0]}!</h1>
                <p className="text-xs text-violet-200">Selamat datang di BahasaCerdas</p>
              </div>
            </div>
            <Link href="/murid/karya/tulis" className="flex items-center gap-1.5 bg-white text-violet-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-50 transition-all shadow-lg">
              <Plus size={16} />
              Tulis
            </Link>
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1 bg-white/15 px-3 py-1.5 rounded-full">
              <span>⚡</span>
              <span className="font-semibold">{user.xp?.toLocaleString() || 0} XP</span>
            </div>
            <div className="flex items-center gap-1 bg-white/15 px-3 py-1.5 rounded-full">
              <span>🔥</span>
              <span className="font-semibold">{user.streak || 0} hari</span>
            </div>
            <div className="flex items-center gap-1 bg-white/15 px-3 py-1.5 rounded-full">
              <span>🪙</span>
              <span className="font-semibold">{user.coins || 0}</span>
            </div>
            <div className="flex items-center gap-1 bg-white/15 px-3 py-1.5 rounded-full">
              <span>🌟</span>
              <span className="font-semibold">Lv.{user.level || 1}</span>
            </div>
          </div>
        </div>
      )}

      {/* League Widget */}
      <LeagueWidget />

      {/* Quick Links */}
      <div className="flex gap-2 mb-4">
        <Link href="/murid/kuest-harian" className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 border border-orange-200 rounded-xl text-xs font-semibold text-orange-600 hover:bg-orange-100 transition-all">
          <Target size={14} /> Quest
        </Link>
        <Link href="/murid/toko-koin" className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-600 hover:bg-amber-100 transition-all">
          <ShoppingBag size={14} /> Toko Koin
        </Link>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {TYPES.map(type => (
          <button key={type} onClick={() => setActiveType(type)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeType === type
                ? "bg-violet-600 text-white shadow-lg shadow-violet-200"
                : "bg-white text-gray-600 border border-gray-200 hover:border-violet-300 hover:text-violet-600"
            }`}
          >
            {type ? `${TYPE_EMOJIS[type]} ${TYPE_LABELS[type]}` : "📋 Semua"}
          </button>
        ))}
      </div>

      {/* Karya Feed */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" />
        </div>
      ) : karyaList.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📝</span>
          </div>
          <p className="text-gray-500 font-medium">Belum ada karya</p>
          <p className="text-gray-400 text-sm mt-1">Jadilah yang pertama menulis!</p>
          <Link href="/murid/karya/tulis" className="inline-block mt-4 px-6 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
            Tulis Karya
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {karyaList.map(karya => (
            <Link key={karya.id} href={`/murid/karya/${karya.id}`} className="block bg-white rounded-2xl border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden">
              <div className="p-5">
                {/* Author Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {karya.user.avatar ? <img src={karya.user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : karya.user.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{karya.user.fullName}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {karya.user.profile?.school || "Siswa"} {karya.user.profile?.city ? `· ${karya.user.profile.city}` : ""}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${TYPE_COLORS[karya.type]}`}>
                    {TYPE_LABELS[karya.type]}
                  </span>
                </div>

                {/* Title & Excerpt */}
                <h2 className="font-bold text-gray-900 text-lg leading-snug mb-2">{karya.title}</h2>
                <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                  {karya.excerpt || karya.content.replace(/<[^>]*>/g, "").slice(0, 200)}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Heart size={14} /> {karya.likesCount}</span>
                  <span className="flex items-center gap-1"><MessageCircle size={14} /> 0</span>
                  <span className="flex items-center gap-1"><Eye size={14} /> {karya.viewsCount}</span>
                  <span className="flex items-center gap-1 ml-auto">
                    <Clock size={14} />
                    {new Date(karya.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </Link>
          ))}
          <div ref={loaderRef} className="flex justify-center py-4">
            {loadingMore && <div className="animate-spin w-6 h-6 border-3 border-violet-500 border-t-transparent rounded-full" />}
          </div>
        </div>
      )}
    </div>
  );
}

function LeagueWidget() {
  const [league, setLeague] = useState<any>(null);

  useEffect(() => {
    fetch("/api/siswa/league").then(r => r.ok ? r.json() : null).then(d => setLeague(d));
  }, []);

  if (!league) return null;

  return (
    <Link href="/murid/progresku" className="block bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-100 p-4 mb-4 hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{league.emoji}</span>
          <div>
            <p className="text-xs text-gray-500">Liga {league.label}</p>
            <p className="font-bold text-gray-900">
              Peringkat #{league.rank} dari {league.total}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">
            {league.xpToNext > 0 ? `${league.xpToNext} XP menuju ${league.nextTier || "puncak"}` : "Puncak!"}
          </p>
          {league.promoted && <p className="text-xs font-semibold text-emerald-600 mt-0.5">↑ Naik liga!</p>}
          {league.demoted && <p className="text-xs font-semibold text-red-500 mt-0.5">↓ Turun liga</p>}
        </div>
      </div>
    </Link>
  );
}
