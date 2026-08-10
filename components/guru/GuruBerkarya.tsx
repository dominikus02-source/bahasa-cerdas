"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, Eye, Feather, Flame, Heart, MessageCircle, PenLine, Sparkles } from "lucide-react";
import SafeMediaImage from "@/components/shared/safe-media-image";
import ShareButton from "@/components/shared/ShareButton";
import { GuruBerkaryaComments } from "@/components/guru/GuruBerkaryaComments";
import type { MisiGuruStatus } from "@/lib/guru/misi-guru-status";

interface GuruKaryaItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  articleType: string | null;
  coverImage: string | null;
  readCount: number;
  likeCount: number;
  commentCount: number;
  likedByCurrentUser: boolean;
  createdAt: string;
  publishedAt: string | null;
  author: {
    id: string;
    fullName: string | null;
    avatar: string | null;
    profile: { school: string | null } | null;
  } | null;
}

interface GuruBerkaryaMeta {
  xpArtikel: number;
  xpPuisi: number;
}

function waktuRelatif(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const detik = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (detik < 60) return "baru saja";
  const menit = Math.floor(detik / 60);
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari === 1) return "kemarin";
  if (hari < 7) return `${hari} hari lalu`;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(t);
}

function adalahBaru(iso: string | null): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < 24 * 60 * 60 * 1000;
}

function inisial(nama: string | null | undefined): string {
  if (!nama) return "G";
  return nama
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase() ?? "")
    .join("");
}

function Skeleton() {
  return (
    <div className="rounded-3xl bg-white border border-violet-100 p-5 sm:p-6 shadow-lg shadow-violet-100/50 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-violet-100" />
        <div className="space-y-2">
          <div className="h-5 bg-violet-100 rounded w-44" />
          <div className="h-3.5 bg-violet-50 rounded w-64" />
        </div>
      </div>
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-36 rounded-2xl bg-violet-50" />
        ))}
      </div>
    </div>
  );
}

function TombolKarya({ href, icon, label, xp }: { href: string; icon: React.ReactNode; label: string; xp?: number }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-violet-200 hover:border-violet-300 hover:bg-violet-50 px-3.5 py-2.5 text-xs font-semibold text-violet-800 shadow-sm transition-colors"
    >
      {icon}
      {label}
      {typeof xp === "number" && xp > 0 && (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-1.5 py-0.5">
          <Sparkles size={9} /> +{xp} XP
        </span>
      )}
    </Link>
  );
}

interface GuruBerkaryaProps {
  misiStatus?: MisiGuruStatus | null;
}

export function GuruBerkarya({ misiStatus }: GuruBerkaryaProps) {
  const [items, setItems] = useState<GuruKaryaItem[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [meta, setMeta] = useState<GuruBerkaryaMeta>({ xpArtikel: 0, xpPuisi: 0 });
  const [likes, setLikes] = useState<Record<string, { likeCount: number; liked: boolean }>>({});
  const [activeCommentsId, setActiveCommentsId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let aktif = true;
    setError(false);
    fetch("/api/guru/berkarya?limit=6", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((res) => {
        if (!aktif) return;
        const data = Array.isArray(res?.data) ? res.data : [];
        setItems(data);
        setCurrentUserId(typeof res?.currentUserId === "string" ? res.currentUserId : null);
        setMeta({
          xpArtikel: typeof res?.meta?.xpArtikel === "number" ? res.meta.xpArtikel : 0,
          xpPuisi: typeof res?.meta?.xpPuisi === "number" ? res.meta.xpPuisi : 0,
        });
        const map: Record<string, { likeCount: number; liked: boolean }> = {};
        for (const a of data) {
          map[a.id] = { likeCount: a.likeCount || 0, liked: !!a.likedByCurrentUser };
        }
        setLikes(map);
      })
      .catch(() => {
        if (aktif) setError(true);
      });
    return () => {
      aktif = false;
    };
  }, [reloadKey]);

  /** Like/unlike instan (optimistic) tanpa reload halaman. Tidak ada XP. */
  async function toggleLike(a: GuruKaryaItem) {
    const cur = likes[a.id] ?? { likeCount: a.likeCount || 0, liked: !!a.likedByCurrentUser };
    const nextLiked = !cur.liked;
    const optimistik = { likeCount: Math.max(0, cur.likeCount + (nextLiked ? 1 : -1)), liked: nextLiked };
    setLikes((prev) => ({ ...prev, [a.id]: optimistik }));
    try {
      const r = await fetch(`/api/guru/berkarya/${a.id}/like`, {
        method: nextLiked ? "POST" : "DELETE",
      });
      const res = await r.json();
      if (!r.ok) throw new Error(res?.error || "Gagal memperbarui suka");
      setLikes((prev) => ({ ...prev, [a.id]: { likeCount: res.likeCount ?? optimistik.likeCount, liked: res.liked ?? nextLiked } }));
    } catch {
      setLikes((prev) => ({ ...prev, [a.id]: cur }));
    }
  }

  function updateCommentCount(artikelId: string, count: number) {
    setItems((prev) => (prev ? prev.map((a) => (a.id === artikelId ? { ...a, commentCount: count } : a)) : prev));
  }

  if (error) {
    return (
      <div className="rounded-3xl bg-white border border-violet-100 p-5 sm:p-6 shadow-lg shadow-violet-100/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-md shadow-violet-200">
            <Flame size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-violet-900">🔥 Guru Berkarya</h2>
            <p className="text-gray-500 text-xs sm:text-sm">Karya terbaru dari para guru. Ikut menginspirasi?</p>
          </div>
        </div>
        <div className="rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50/50 px-5 py-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-white flex items-center justify-center shadow-sm">
            <Flame size={22} className="text-rose-400" />
          </div>
          <p className="mt-3 text-sm font-semibold text-gray-800">Gagal memuat karya guru.</p>
          <p className="mt-1 text-xs text-gray-500">Ada masalah saat mengambil data. Silakan coba lagi.</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-semibold shadow-sm transition-colors"
          >
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  if (!items) return <Skeleton />;

  const misiArtikel = misiStatus?.misi.find((m) => m.id === "artikel");
  const sudahBerkarya = misiArtikel ? misiArtikel.selesai : false;
  const xpArtikel = meta.xpArtikel > 0 ? meta.xpArtikel : undefined;
  const xpPuisi = meta.xpPuisi > 0 ? meta.xpPuisi : undefined;

  return (
    <div className="rounded-3xl bg-white border border-violet-100 p-5 sm:p-6 shadow-lg shadow-violet-100/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-md shadow-violet-200">
            <Flame size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-violet-900">🔥 Guru Berkarya</h2>
            <p className="text-gray-500 text-xs sm:text-sm">Karya terbaru dari para guru. Ikut menginspirasi?</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/guru/artikel"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white px-3 py-2 text-xs font-semibold shadow-sm transition-colors"
          >
            <PenLine size={13} /> Tulis Karya
          </Link>
          <Link href="/guru/karya" className="hidden sm:flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-100 rounded-xl px-3 py-2 transition-colors">
            Lihat Semua Karya <ChevronRight size={12} />
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/50 px-5 py-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-white flex items-center justify-center shadow-sm">
            <PenLine size={22} className="text-violet-400" />
          </div>
          <p className="mt-3 text-sm font-semibold text-gray-800">Belum ada karya terbaru.</p>
          <p className="mt-1 text-xs text-gray-500">Jadilah guru pertama yang berkarya hari ini.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <TombolKarya href="/guru/artikel" icon={<BookOpen size={13} />} label="Buat Artikel" xp={xpArtikel} />
            <TombolKarya href="/guru/artikel?type=puisi" icon={<Feather size={13} />} label="Buat Puisi" xp={xpPuisi} />
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((a) => {
              const isPuisi = (a.articleType || "").toUpperCase() === "PUISI";
              const isBaru = adalahBaru(a.publishedAt || a.createdAt);
              const karyaAnda = !!a.author && a.author.id === currentUserId;
              const penulis = a.author?.fullName || "Guru";
              const like = likes[a.id] ?? { likeCount: a.likeCount || 0, liked: !!a.likedByCurrentUser };
              return (
                <article
                  key={a.id}
                  className="group overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all hover:border-violet-200 hover:shadow-md"
                >
                  {a.coverImage ? (
                    <div className="h-28 overflow-hidden">
                      <SafeMediaImage
                        src={a.coverImage}
                        alt={a.title}
                        fallbackType="article"
                        containerClassName="w-full h-28"
                      />
                    </div>
                  ) : (
                    <div className="h-10 flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-50">
                      {isPuisi ? <Feather size={16} className="text-violet-300" /> : <BookOpen size={16} className="text-violet-300" />}
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      {a.author?.avatar ? (
                        <img
                          src={a.author.avatar}
                          alt={penulis}
                          className="h-10 w-10 rounded-full object-cover ring-2 ring-violet-100"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-purple-600 text-sm font-bold text-white ring-2 ring-violet-100">
                          {inisial(penulis)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-bold text-gray-900">{penulis}</p>
                          {karyaAnda && (
                            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                              ✨ Karya Anda
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[11px] text-gray-500">
                          {a.author?.profile?.school ? `${a.author.profile.school} · ` : ""}
                          {waktuRelatif(a.publishedAt || a.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {isBaru && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-orange-600">
                            <Flame size={9} /> Baru
                          </span>
                        )}
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${isPuisi ? "bg-purple-100 text-purple-700" : "bg-sky-100 text-sky-700"}`}>
                          {isPuisi ? "Puisi" : "Artikel"}
                        </span>
                      </div>
                    </div>

                    <Link href={`/artikel/${a.slug}`} target="_blank" className="mt-3 block">
                      <h3 className="text-sm font-semibold leading-snug text-gray-900 transition-colors line-clamp-2 group-hover:text-violet-700">
                        {a.title}
                      </h3>
                      <p className={`mt-1.5 text-xs leading-relaxed text-gray-500 ${isPuisi ? "whitespace-pre-line italic font-serif text-purple-700/80 line-clamp-4" : "line-clamp-2"}`}>
                        {a.excerpt || ""}
                      </p>
                    </Link>

                    <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Eye size={12} /> {a.readCount} dibaca
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => toggleLike(a)}
                          aria-pressed={like.liked}
                          aria-label={like.liked ? "Batal menyukai" : "Menyukai"}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold transition-colors ${
                            like.liked
                              ? "bg-rose-50 text-rose-600"
                              : "text-gray-400 hover:bg-gray-50 hover:text-rose-500"
                          }`}
                        >
                          <Heart size={13} fill={like.liked ? "currentColor" : "none"} />
                          {like.likeCount}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveCommentsId(a.id)}
                          aria-label={`Lihat komentar (${a.commentCount})`}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold text-gray-400 transition-colors hover:bg-gray-50 hover:text-violet-600"
                        >
                          <MessageCircle size={13} />
                          {a.commentCount}
                        </button>
                        <ShareButton url={`/artikel/${a.slug}`} title={a.title} />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 border border-violet-100 p-4">
            <div className="flex items-start gap-2">
              <Flame size={16} className="text-orange-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 leading-snug">✨ Karya Anda bisa menginspirasi guru lain.</p>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  {sudahBerkarya
                    ? "Terbitkan satu lagi supaya misi mingguan & XP Anda terus naik."
                    : "Misi mingguan Artikel/Puisi memberi XP untuk karya pertama Anda."}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <TombolKarya href="/guru/artikel" icon={<BookOpen size={13} />} label="Buat Artikel" xp={xpArtikel} />
              <TombolKarya href="/guru/artikel?type=puisi" icon={<Feather size={13} />} label="Buat Puisi" xp={xpPuisi} />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 sm:hidden">
            <Link
              href="/guru/artikel"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white px-3 py-2.5 text-xs font-semibold shadow-sm transition-colors"
            >
              <PenLine size={13} /> Tulis Karya
            </Link>
            <Link href="/guru/karya" className="flex items-center justify-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-100 rounded-xl px-3 py-2.5 transition-colors">
              Lihat Semua Karya <ChevronRight size={12} />
            </Link>
          </div>
        </>
      )}

      {activeCommentsId &&
        (() => {
          const a = items.find((x) => x.id === activeCommentsId);
          if (!a) return null;
          return (
            <GuruBerkaryaComments
              artikelId={a.id}
              artikelTitle={a.title}
              onClose={() => setActiveCommentsId(null)}
              onCountChange={updateCommentCount}
            />
          );
        })()}
    </div>
  );
}
