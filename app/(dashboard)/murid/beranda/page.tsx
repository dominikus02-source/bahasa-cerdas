"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { IconBolt, IconFlame, IconCoin, IconTarget, IconPen, IconChat, IconHeart, IconEye, IconClock } from "@/lib/icons";
import { RankChip } from "@/components/gamification/RankChip";

type KaryaType = "PUISI" | "CERPEN" | "ARTIKEL" | "ANEKDOT" | "PANTUN" | "OPINI";

interface Karya {
  id: string; title: string; content: string; excerpt: string;
  type: KaryaType; coverImage?: string; isFeatured: boolean;
  likesCount: number; viewsCount: number; createdAt: string;
  user: { id: string; fullName: string; displayName?: string; avatar?: string; profile?: { school?: string; city?: string }; rank?: string };
  _count?: { likes: number; comments: number };
}

interface MuridAktif {
  id: string; displayName: string; avatar?: string; lastActiveAt: string;
}

interface RingkasanKelas {
  tugas: { id: string; jenis: string; judul: string; tenggat?: string; link: string }[];
  totalTugas: number;
  pengumuman: { id: string; judul: string; guru: string; createdAt: string; link: string }[];
  materi: { id: string; judul: string; deskripsi?: string; guru: string; link: string }[];
  leaderboard: { posisiGlobal: number; totalPemain: number; posisiKelas: number | null } | null;
}

const nameOf = (u: { fullName: string; displayName?: string }) => u.displayName || u.fullName;

const TYPE_META: Record<string, { label: string; badge: string }> = {
  PUISI:    { label: "Puisi",    badge: "bg-rose-100 text-rose-700" },
  CERPEN:   { label: "Cerpen",   badge: "bg-blue-100 text-blue-700" },
  ARTIKEL:  { label: "Artikel",  badge: "bg-amber-100 text-amber-700" },
  ANEKDOT:  { label: "Anekdot",  badge: "bg-orange-100 text-orange-700" },
  PANTUN:   { label: "Pantun",   badge: "bg-teal-100 text-teal-700" },
  OPINI:    { label: "Opini",    badge: "bg-violet-100 text-violet-700" },
};

export default function HomeFeedPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [karyaList, setKaryaList] = useState<Karya[]>([]);
  const [featured, setFeatured] = useState<Karya[]>([]);
  const [aktif, setAktif] = useState<{ count: number; users: MuridAktif[] }>({ count: 0, users: [] });
  const [ringkasan, setRingkasan] = useState<RingkasanKelas | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeType, setActiveType] = useState<string>("");
  const [userError, setUserError] = useState<string | null>(null);
  const [featuredError, setFeaturedError] = useState<string | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [showLeague, setShowLeague] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const detak = () => {
      // Tab di latar belakang tidak sedang "aktif" — tidak perlu dilaporkan.
      if (document.visibilityState !== "visible") return;
      fetch("/api/user/heartbeat", { method: "POST" }).catch(() => {});
    };
    // Dulu tiap 60 detik. Penanda "sedang online" tidak butuh setepat itu,
    // sementara tiap panggilan memvalidasi sesi ke server Auth Supabase —
    // dengan ~200 murid, itu 12.000 panggilan auth per jam hanya untuk ini.
    const hb = setInterval(detak, 300000);
    const hbTimeout = setTimeout(detak, 5000);
    return () => { clearInterval(hb); clearTimeout(hbTimeout); };
  }, []);

  useEffect(() => {
    setLoadingUser(true);
    setLoadingFeatured(true);
    setUserError(null);
    setFeaturedError(null);
    setFeedError(null);

    fetch("/api/user/me")
      .then(r => { if (!r.ok) throw new Error("Gagal memuat user"); return r.json(); })
      .then(d => { setUser(d.user || d); setLoadingUser(false); })
      .catch(e => { setUserError(e.message); setLoadingUser(false); });

    fetch("/api/siswa/karya?limit=6&featured=true")
      .then(r => { if (!r.ok) throw new Error("Gagal memuat featured"); return r.json(); })
      .then(d => { setFeatured(d.karya || []); setLoadingFeatured(false); })
      .catch(e => { setFeaturedError(e.message); setLoadingFeatured(false); });

    fetch("/api/siswa/aktif")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setAktif({ count: d.count || 0, users: d.users || [] }))
      .catch(() => {});

    fetch("/api/murid/dashboard/summary")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setRingkasan(d))
      .catch(() => {});

    fetch("/api/siswa/karya?limit=10")
      .then(r => { if (!r.ok) throw new Error("Gagal memuat feed"); return r.json(); })
      .then(d => {
        setKaryaList(d.karya || []);
        setCursor(d.nextCursor);
        setHasMore(!!d.nextCursor);
        setLoading(false);
      })
      .catch(e => { setFeedError(e.message); setLoading(false); });
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !cursor) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: "10", cursor });
      if (activeType) params.set("type", activeType);
      const r = await fetch(`/api/siswa/karya?${params}`);
      const d = await r.json();
      setKaryaList(prev => [...prev, ...(d.karya || [])]);
      setCursor(d.nextCursor);
      setHasMore(!!d.nextCursor);
    } catch { setFeedError("Gagal memuat lebih banyak"); }
    finally { setLoadingMore(false); }
  }, [cursor, loadingMore, activeType]);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const io = new IntersectionObserver(entries => { if (entries[0].isIntersecting && hasMore) loadMore(); }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, hasMore]);

  const isComplete = !loadingUser && user && !loadingFeatured;

  return (
    <div className="max-w-3xl mx-auto">
      {loadingUser ? (
        <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" /></div>
      ) : userError ? (
        <div className="text-center py-16"><p className="text-gray-500">{userError}</p></div>
      ) : (
        <>
          {/* User Hero */}
          {user && (
            <div className="bg-gradient-to-br from-violet-500 via-violet-600 to-purple-700 rounded-[24px] p-6 md:p-8 text-white mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold border-2 border-white/30 shadow-lg shrink-0 overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      user.displayName?.charAt(0)?.toUpperCase() || user.fullName?.charAt(0)?.toUpperCase() || "M"
                    )}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold">{user.displayName || user.fullName}</h1>
                    <p className="text-sm text-violet-200">{user.school || "BahasaCerdas"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur rounded-full px-3.5 py-1.5 text-xs font-medium">
                    <IconFlame size={14} /> {user.streak || 0}
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur rounded-full px-3.5 py-1.5 text-xs font-medium">
                    <IconBolt size={14} /> {user.xp?.toLocaleString() || 0}
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur rounded-full px-3.5 py-1.5 text-xs font-medium">
                    <IconCoin size={14} /> {user.coins || 0}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Murid Aktif */}
          {aktif.users.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <h2 className="text-sm font-bold text-gray-900">{aktif.count} murid aktif sekarang</h2>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
                {aktif.users.map(u => (
                  <Link key={u.id} href={`/profile/${u.id}`} className="flex flex-col items-center gap-1.5 shrink-0 w-14 group">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden border-2 border-white shadow ring-2 ring-emerald-400/60 group-hover:ring-emerald-500 transition-all">
                        {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.displayName?.charAt(0)?.toUpperCase()}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium truncate w-full text-center">{u.displayName}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Ringkasan Kelasku */}
          {ringkasan && (ringkasan.totalTugas > 0 || ringkasan.pengumuman.length > 0 || ringkasan.materi.length > 0 || ringkasan.leaderboard) && (
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tugas */}
              <Link href="/murid/tugasku" className="group bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-violet-200 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                      <IconClock size={14} className="text-violet-600" />
                    </span>
                    Tugasku
                  </h2>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ringkasan.totalTugas > 0 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"}`}>
                    {ringkasan.totalTugas > 0 ? `${ringkasan.totalTugas} belum dikerjakan` : "Semua selesai"}
                  </span>
                </div>
                {ringkasan.tugas.length > 0 ? (
                  <div className="space-y-1.5">
                    {ringkasan.tugas.slice(0, 2).map(t => (
                      <div key={t.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 truncate mr-2">{t.judul}</span>
                        <span className="text-[10px] font-semibold text-violet-500 shrink-0">{t.jenis === "KUIS" ? "Kuis" : "Materi"}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Tidak ada tugas tertunda 🎉</p>
                )}
              </Link>

              {/* Pengumuman */}
              <Link href="/murid/pengumuman" className="group bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-amber-200 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                      <IconTarget size={14} className="text-amber-600" />
                    </span>
                    Pengumuman
                  </h2>
                  {ringkasan.pengumuman.length > 0 && (
                    <span className="text-[10px] font-semibold text-amber-600">{ringkasan.pengumuman.length} terbaru</span>
                  )}
                </div>
                {ringkasan.pengumuman.length > 0 ? (
                  <div className="space-y-1.5">
                    {ringkasan.pengumuman.slice(0, 2).map(p => (
                      <div key={p.id} className="text-xs">
                        <p className="text-gray-700 font-medium truncate">{p.judul}</p>
                        <p className="text-[10px] text-gray-400">{p.guru} · {waktuLalu(p.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Belum ada pengumuman dari guru.</p>
                )}
              </Link>

              {/* Materi */}
              <Link href="/arena" className="group bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-emerald-200 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <IconPen size={14} className="text-emerald-600" />
                    </span>
                    Materi dari Guru
                  </h2>
                  {ringkasan.materi.length > 0 && (
                    <span className="text-[10px] font-semibold text-emerald-600">{ringkasan.materi.length} terbaru</span>
                  )}
                </div>
                {ringkasan.materi.length > 0 ? (
                  <div className="space-y-1.5">
                    {ringkasan.materi.slice(0, 2).map(m => (
                      <div key={m.id} className="text-xs">
                        <p className="text-gray-700 font-medium truncate">{m.judul}</p>
                        <p className="text-[10px] text-gray-400">{m.guru}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Belum ada materi yang dibagikan.</p>
                )}
              </Link>

              {/* Leaderboard */}
              <Link href="/arena/player/leaderboard" className="group bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-amber-200 transition-all bg-gradient-to-br from-amber-50/50 to-white">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                      <IconFlame size={14} className="text-amber-600" />
                    </span>
                    Peringkat Mingguan
                  </h2>
                  <span className="text-xs font-semibold text-violet-600 group-hover:text-violet-700">Lihat semua →</span>
                </div>
                {ringkasan.leaderboard ? (
                  <div className="space-y-1.5">
                    <p className="text-lg font-bold text-gray-900">
                      #{ringkasan.leaderboard.posisiGlobal}
                      <span className="text-[11px] font-medium text-gray-400"> dari {ringkasan.leaderboard.totalPemain} pemain</span>
                    </p>
                    {ringkasan.leaderboard.posisiKelas && (
                      <p className="text-[11px] text-gray-500">Peringkat kelas: #{ringkasan.leaderboard.posisiKelas}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Belum ada data minggu ini.</p>
                )}
              </Link>
            </div>
          )}

          {/* Featured Karya */}
          {isComplete && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <IconTarget size={18} className="text-amber-500" />
                  Karya Pilihan
                </h2>
                <Link href="/murid/beranda?tab=karya" className="text-xs font-semibold text-violet-600 hover:text-violet-700">Lihat semua</Link>
              </div>
              {loadingFeatured ? (
                <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full" /></div>
              ) : featuredError ? (
                <div className="bg-amber-50 rounded-2xl p-4 text-sm text-amber-700 text-center">{featuredError}</div>
              ) : featured.length === 0 ? (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 text-center border border-amber-100">
                  <p className="text-sm text-gray-500">Belum ada karya pilihan.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {featured.map(k => {
                    const meta = TYPE_META[k.type] || { label: k.type, badge: "bg-gray-100 text-gray-700" };
                    return (
                      <Link key={k.id} href={`/murid/karya/${k.id}`} className="group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-violet-200 transition-all duration-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${meta.badge}`}>{meta.label}</div>
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2 group-hover:text-violet-700 transition-colors line-clamp-2">{k.title}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-4">{k.excerpt || k.content?.slice(0, 120)}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><IconHeart size={12} className="text-red-400" />{k._count?.likes ?? k.likesCount ?? 0}</span>
                          <span className="flex items-center gap-1"><IconEye size={12} />{k.viewsCount || 0}</span>
                          <span className="flex items-center gap-1 ml-auto">
                            {nameOf(k.user)}
                            {k.user.rank && <RankChip rank={k.user.rank} size={16} showTitle={false} compact className="ml-1" />}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Feed */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <IconPen size={18} className="text-violet-500" />
                Karya Terbaru
              </h2>
              <Link href="/murid/karya/tulis" className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-full text-xs font-bold hover:bg-violet-700 transition-all shadow-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Tulis
              </Link>
            </div>
            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" /></div>
            ) : feedError ? (
              <div className="bg-red-50 rounded-2xl p-4 text-sm text-red-700 text-center">{feedError}</div>
            ) : karyaList.length === 0 ? (
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-8 text-center border border-violet-100">
                <IconPen size={32} className="mx-auto text-violet-300 mb-2" />
                <p className="text-sm text-gray-500">Belum ada karya. Jadilah yang pertama menulis!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {karyaList.map(k => {
                  const meta = TYPE_META[k.type] || { label: k.type, badge: "bg-gray-100 text-gray-700" };
                  return (
                    <Link key={k.id} href={`/murid/karya/${k.id}`} className="block bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-violet-200 transition-all duration-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${meta.badge}`}>{meta.label}</div>
                        {k.isFeatured && <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pilihan</span>}
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1.5 group-hover:text-violet-700 transition-colors">{k.title}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3">{k.excerpt || k.content?.slice(0, 150)}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><IconHeart size={12} className="text-red-400" />{k._count?.likes ?? k.likesCount ?? 0}</span>
                        <span className="flex items-center gap-1"><IconEye size={12} />{k.viewsCount || 0}</span>
                        <span className="flex items-center gap-1 ml-auto"><IconClock size={12} />{waktuLalu(k.createdAt)}</span>
                      </div>
                    </Link>
                  );
                })}
                <div ref={loaderRef} className="py-4 text-center">
                  {loadingMore && <div className="animate-spin w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full mx-auto" />}
                  {!hasMore && karyaList.length > 0 && <p className="text-xs text-gray-400">Semua karya telah dimuat</p>}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function waktuLalu(t: string) {
  const diff = Date.now() - new Date(t).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j`;
  return `${Math.floor(h / 24)}h`;
}
