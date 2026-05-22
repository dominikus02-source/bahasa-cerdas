"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

type KaryaType = "PUISI" | "CERPEN" | "ARTIKEL" | "ANEKDOT" | "PANTUN" | "OPINI";

interface Karya {
  id: string; title: string; content: string; excerpt: string;
  type: KaryaType; coverImage?: string; isFeatured: boolean;
  likesCount: number; viewsCount: number; createdAt: string;
  user: { id: string; fullName: string; avatar?: string; profile?: { school?: string; city?: string } };
}

const TYPE_META: Record<string, { label: string; badge: string }> = {
  PUISI:    { label: "Puisi",    badge: "bg-rose-100 text-rose-700" },
  CERPEN:   { label: "Cerpen",   badge: "bg-blue-100 text-blue-700" },
  ARTIKEL:  { label: "Artikel",  badge: "bg-amber-100 text-amber-700" },
  ANEKDOT:  { label: "Anekdot",  badge: "bg-orange-100 text-orange-700" },
  PANTUN:   { label: "Pantun",   badge: "bg-teal-100 text-teal-700" },
  OPINI:    { label: "Opini",    badge: "bg-violet-100 text-violet-700" },
};

function VioletHeart({ size, fill: f }: { size: number; fill?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={f ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" className="text-violet-500">
      <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function VioletComment({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-violet-400">
      <path d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function VioletEye({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-violet-400">
      <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function VioletClock({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-violet-400">
      <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VioletTulis() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-violet-700">
      <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HomeFeedPage() {
  const [user, setUser] = useState<any>(null);
  const [karyaList, setKaryaList] = useState<Karya[]>([]);
  const [featured, setFeatured] = useState<Karya[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeType, setActiveType] = useState<string>("");
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/user/me").then(r => r.ok ? r.json() : null).then(d => setUser(d?.user || null));
    fetch("/api/siswa/karya?featured=true&limit=5").then(r => r.ok ? r.json() : null).then(d => setFeatured(d?.karya || []));
  }, []);

  const fetchKarya = useCallback(async (pageNum: number, type: string, append: boolean) => {
    const params = new URLSearchParams({ page: String(pageNum), limit: "10" });
    if (type) params.set("type", type);
    const res = await fetch(`/api/siswa/karya?${params}`);
    const data = await res.json();
    setKaryaList(prev => append ? [...prev, ...data.karya] : data.karya);
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
        setPage(p => p + 1);
        fetchKarya(page + 1, activeType, true);
      }
    }, { threshold: 0.3 });
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [page, totalPages, loadingMore, activeType, fetchKarya]);

  const TYPES = ["", "PUISI", "CERPEN", "ARTIKEL", "ANEKDOT", "PANTUN", "OPINI"];

  return (
    <div className="max-w-xl mx-auto">
      {/* ── Header ── */}
      {user && (
        <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-2xl p-5 text-white mb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold border border-white/30 overflow-hidden">
                {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : user.fullName?.charAt(0).toUpperCase() || "M"}
              </div>
              <div className="leading-tight">
                <p className="font-bold text-sm">Halo, {user.fullName?.split(" ")[0]}!</p>
                <p className="text-[11px] text-violet-200">Indonesia Menulis</p>
              </div>
            </div>
            <Link href="/murid/karya/tulis" className="flex items-center gap-1.5 bg-white text-violet-700 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-violet-50 transition-all shadow-lg">
              <VioletTulis /> Tulis
            </Link>
          </div>
          <div className="flex gap-3 mt-3 text-[11px]">
            <span className="flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-full"><span>⚡</span>{user.xp?.toLocaleString() || 0} XP</span>
            <span className="flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-full"><span>🔥</span>{user.streak || 0} hr</span>
            <span className="flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-full"><span>🪙</span>{user.coins || 0}</span>
            <span className="flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-full"><span>🎯</span>Lv.{user.level || 1}</span>
          </div>
        </div>
      )}

      {/* ── League ── */}
      <LeagueWidget />

      {/* ── Quick links ── */}
      <div className="flex gap-2 mb-5">
        <Link href="/murid/kuest-harian" className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl text-xs font-semibold text-orange-600 hover:shadow-md transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
          Quest
        </Link>
        <Link href="/murid/toko-koin" className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-600 hover:shadow-md transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Toko
        </Link>
      </div>

      {/* ── Karya Pilihan ── */}
      {featured.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Karya Pilihan</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {featured.map(k => {
              const m = TYPE_META[k.type] || TYPE_META.OPINI;
              return (
                <Link key={k.id} href={`/murid/karya/${k.id}`} className="shrink-0 w-56 bg-gradient-to-br from-violet-500 to-purple-700 rounded-xl p-4 text-white hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.badge}`}>{m.label}</span>
                  <h3 className="font-bold text-sm mt-2 line-clamp-2 leading-snug">{k.title}</h3>
                  <p className="text-xs text-violet-200 mt-2 line-clamp-2">{k.excerpt?.slice(0, 80)}</p>
                  <p className="text-[10px] text-violet-300 mt-2">{k.user.fullName}</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Kategori ── */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-hide">
        {TYPES.map(type => (
          <button key={type} onClick={() => setActiveType(type)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeType === type
                ? "bg-violet-600 text-white shadow-lg shadow-violet-200"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
              {TYPE_META[type]?.label || type || "Semua"}
          </button>
        ))}
      </div>

      {/* ── Feed ── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-7 h-7 border-[3px] border-violet-500 border-t-transparent rounded-full" />
        </div>
      ) : karyaList.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4 text-2xl">📝</div>
          <p className="text-gray-500 font-medium">Belum ada karya</p>
          <p className="text-gray-400 text-sm mt-1">Jadilah yang pertama menulis!</p>
          <Link href="/murid/karya/tulis" className="inline-block mt-4 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">Tulis Karya</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {karyaList.map(karya => {
            const m = TYPE_META[karya.type] || TYPE_META.OPINI;
            return (
            <Link key={karya.id} href={`/murid/karya/${karya.id}`} className="block bg-white rounded-xl border border-gray-100 hover:shadow-lg hover:border-violet-200 transition-all overflow-hidden group">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.badge}`}>{m.label}</span>
                  {karya.isFeatured && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">⭐ Pilihan</span>}
                </div>

                <h2 className="font-bold text-gray-900 text-lg leading-snug group-hover:text-violet-700 transition-colors mb-2">{karya.title}</h2>

                <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed mb-4">
                  {karya.excerpt || karya.content.replace(/<[^>]*>/g, "").slice(0, 200)}
                </p>

                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {karya.user.avatar ? <img src={karya.user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : karya.user.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <span className="font-semibold text-gray-800">{karya.user.fullName}</span>
                    <span className="text-gray-400 mx-1">·</span>
                    <span className="text-gray-400">{karya.user.profile?.school ? karya.user.profile.school.split(" ").slice(0, 2).join(" ") : "Siswa"}</span>
                    {karya.user.profile?.city && <span className="text-gray-300 mx-1">·</span>}
                    {karya.user.profile?.city && <span className="text-gray-400">{karya.user.profile.city}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><VioletHeart size={13} />{karya.likesCount}</span>
                  <span className="flex items-center gap-1"><VioletComment size={13} />0</span>
                  <span className="flex items-center gap-1"><VioletEye size={13} />{karya.viewsCount}</span>
                  <span className="flex items-center gap-1 ml-auto"><VioletClock size={13} />{new Date(karya.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                </div>
              </div>
            </Link>
          );})}
          <div ref={loaderRef} className="flex justify-center py-4">
            {loadingMore && <div className="animate-spin w-6 h-6 border-[3px] border-violet-500 border-t-transparent rounded-full" />}
          </div>
        </div>
      )}
    </div>
  );
}

function LeagueWidget() {
  const [league, setLeague] = useState<any>(null);
  useEffect(() => { fetch("/api/siswa/league").then(r => r.ok ? r.json() : null).then(d => setLeague(d)); }, []);
  if (!league) return null;

  return (
    <Link href="/murid/progresku" className="flex items-center justify-between bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-100 px-4 py-3 mb-4 hover:shadow-md hover:border-violet-200 transition-all">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{league.emoji}</span>
        <div>
          <p className="text-[11px] text-gray-500 font-medium">Liga {league.label}</p>
          <p className="text-sm font-bold text-gray-900">#{league.rank} dari {league.total}</p>
        </div>
      </div>
      <div className="text-right text-[11px]">
        {league.xpToNext > 0 ? <p className="text-gray-500"><span className="font-semibold text-violet-600">{league.xpToNext}</span> XP ke {league.nextTier}</p> : <p className="text-emerald-600 font-semibold">Puncak! 🏆</p>}
        {league.promoted && <p className="text-emerald-600 font-bold mt-0.5">↑ Naik liga!</p>}
        {league.demoted && <p className="text-red-500 font-bold mt-0.5">↓ Turun</p>}
      </div>
    </Link>
  );
}
