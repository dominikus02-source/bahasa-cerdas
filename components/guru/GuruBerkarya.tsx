"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, Eye, Feather, Flame, Heart, MessageCircle, PenLine, Sparkles } from "lucide-react";
import SafeMediaImage from "@/components/shared/safe-media-image";
import ShareButton from "@/components/shared/ShareButton";
import { GuruBerkaryaComments } from "@/components/guru/GuruBerkaryaComments";
import UserName from "@/components/arena/UserName";
import { buttonClass } from "@/components/ui/button";
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
    role: string;
    isFounder: boolean;
    isPremium: boolean;
    badgeKind?: import("@/lib/account/identity").IdentityBadge | null;
    trialEndsAt: string | null;
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
    <div className="rounded-bc-card border border-bc-border bg-bc-surface p-4 shadow-bc-1 sm:p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-bc-icon bg-bc-surface-2" />
        <div className="space-y-2">
          <div className="h-5 bg-bc-surface-2 rounded w-44" />
          <div className="h-3.5 bg-bc-surface-2 rounded w-40 max-w-full" />
        </div>
      </div>
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-36 rounded-bc-tile bg-bc-surface-2" />
        ))}
      </div>
    </div>
  );
}

function TombolKarya({ href, icon, label, xp }: { href: string; icon: React.ReactNode; label: string; xp?: number }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-bc-tile border border-bc-border bg-bc-surface px-3.5 py-2.5 text-xs font-semibold text-bc-aud transition-colors hover:border-bc-aud/50"
    >
      {icon}
      {label}
      {typeof xp === "number" && xp > 0 && (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-bc-success bg-bc-success-soft rounded-full px-1.5 py-0.5">
          <Sparkles size={9} /> +{xp} XP
        </span>
      )}
    </Link>
  );
}

interface GuruBerkaryaProps {
  misiStatus?: MisiGuruStatus | null;
  compact?: boolean;
}

export function GuruBerkarya({ misiStatus, compact = false }: GuruBerkaryaProps) {
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
    const feedUrl = compact ? "/api/guru/berkarya?limit=3" : "/api/guru/berkarya?limit=6";
    fetch(feedUrl, { cache: "no-store" })
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
  }, [reloadKey, compact]);

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
      <div className="rounded-bc-card border border-bc-border bg-bc-surface p-4 shadow-bc-1 sm:p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 shrink-0 rounded-bc-icon bg-bc-aud-soft flex items-center justify-center">
            <Flame size={22} className="text-bc-aud" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-bc-text">Guru Berkarya</h2>
            <p className="text-xs text-bc-text-2">Karya terbaru dari para guru. Ikut menginspirasi?</p>
          </div>
        </div>
        <div className="rounded-bc-tile border-2 border-dashed border-bc-danger/30 bg-bc-danger-soft px-5 py-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-bc-icon bg-bc-surface flex items-center justify-center shadow-bc-1">
            <Flame size={22} className="text-bc-danger" />
          </div>
          <p className="mt-3 text-sm font-semibold text-bc-text">Gagal memuat karya guru.</p>
          <p className="mt-1 text-xs text-bc-text-2">Ada masalah saat mengambil data. Silakan coba lagi.</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className={buttonClass({ variant: "danger", size: "sm", className: "mt-4" })}
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
    <div className="rounded-bc-card border border-bc-border bg-bc-surface p-4 shadow-bc-1 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-[14rem] flex-1 items-center gap-3">
          <div className="w-11 h-11 shrink-0 rounded-bc-icon bg-bc-aud-soft flex items-center justify-center">
            <Flame size={22} className="text-bc-aud" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-bc-text">Guru Berkarya</h2>
            <p className="text-xs text-bc-text-2">Karya terbaru dari para guru. Ikut menginspirasi?</p>
          </div>
        </div>
        <div className="hidden shrink-0 flex-wrap items-center gap-2 sm:flex">
          <Link
            href="/guru/artikel"
            className={buttonClass({ variant: "accent", size: "sm" })}
          >
            <PenLine size={13} /> Tulis Karya
          </Link>
          <Link href="/guru/karya" className={buttonClass({ variant: "secondary", size: "sm" })}>
            Lihat Semua Karya <ChevronRight size={12} />
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-bc-tile border-2 border-dashed border-bc-border-strong bg-bc-surface-2 px-5 py-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-bc-icon bg-bc-surface flex items-center justify-center shadow-bc-1">
            <PenLine size={22} className="text-bc-aud" />
          </div>
          <p className="mt-3 text-sm font-semibold text-bc-text">Belum ada karya terbaru.</p>
          <p className="mt-1 text-xs text-bc-text-2">Jadilah guru pertama yang berkarya hari ini.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <TombolKarya href="/guru/artikel" icon={<BookOpen size={13} />} label="Buat Artikel" xp={xpArtikel} />
            <TombolKarya href="/guru/artikel?type=puisi" icon={<Feather size={13} />} label="Buat Puisi" xp={xpPuisi} />
          </div>
        </div>
      ) : (
        <>
          <div className={compact ? "grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
            {items.map((a) => {
              const isPuisi = (a.articleType || "").toUpperCase() === "PUISI";
              const isBaru = adalahBaru(a.publishedAt || a.createdAt);
              const karyaAnda = !!a.author && a.author.id === currentUserId;
              const penulis = a.author?.fullName || "Guru";
              const like = likes[a.id] ?? { likeCount: a.likeCount || 0, liked: !!a.likedByCurrentUser };
              return (
                <article
                  key={a.id}
                  className={`group flex min-w-0 flex-col overflow-hidden rounded-bc-tile border border-bc-border bg-bc-surface-2 transition-colors hover:border-bc-aud/40 ${compact ? "h-full" : ""}`}
                >
                  {/* Tanpa cover: placeholder disembunyikan di layar kecil supaya daftar tidak terlalu panjang. */}
                  <div className={`${compact ? "relative aspect-[16/6] w-full shrink-0 overflow-hidden bg-bc-aud-soft" : "relative h-28 w-full shrink-0 overflow-hidden bg-bc-aud-soft"} ${a.coverImage ? "" : "hidden md:block"}`}>
                    {a.coverImage ? (
                      <SafeMediaImage
                        src={a.coverImage}
                        alt={a.title}
                        fallbackType="article"
                        containerClassName="h-full w-full"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-bc-aud-soft">
                        <span className="grid h-11 w-11 place-items-center rounded-bc-icon bg-bc-surface text-bc-aud shadow-bc-1">
                          {isPuisi ? <Feather size={21} /> : <BookOpen size={21} />}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      {a.author?.avatar ? (
                        <img
                          src={a.author.avatar}
                          alt={penulis}
                          className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-bc-line"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bc-aud text-sm font-bold text-bc-on-aud">
                          {inisial(penulis)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center">
                          <UserName
                            name={penulis}
                            href={a.author ? `/arena/profile/${a.author.id}` : undefined}
                            className="truncate text-sm font-bold text-bc-text"
                            wrapperClassName="max-w-full"
                            badgeKind={a.author?.badgeKind}
                            isFounder={a.author?.isFounder}
                            isPremium={a.author?.isPremium}
                            verifiedSize={18}
                          />
                        </div>
                        <p className="truncate text-[11px] text-bc-text-2">
                          {a.author?.profile?.school ? `${a.author.profile.school} · ` : ""}
                          {waktuRelatif(a.publishedAt || a.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${isPuisi ? "bg-bc-violet-soft text-bc-violet" : "bg-bc-info-soft text-bc-info"}`}>
                        {isPuisi ? "Puisi" : "Artikel"}
                      </span>
                      {isBaru && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-bc-warning-soft px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-bc-warning-strong">
                          <Flame size={9} /> Baru
                        </span>
                      )}
                      {karyaAnda && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-bc-success-soft px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-bc-success">
                          ✨ Karya Anda
                        </span>
                      )}
                    </div>

                    <Link href={`/artikel/${a.slug}`} target="_blank" className="mt-2 block pb-3">
                      <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-bc-text transition-colors group-hover:text-bc-aud">
                        {a.title}
                      </h3>
                      <p className={`${compact ? "hidden" : "mt-1.5"} text-xs leading-relaxed text-bc-text-2 ${isPuisi ? "whitespace-pre-line italic font-serif line-clamp-4" : "line-clamp-2"}`}>
                        {a.excerpt || ""}
                      </p>
                    </Link>

                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-bc-border pt-3 text-[11px] text-bc-text-3">
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
                              ? "bg-bc-danger-soft text-bc-danger"
                              : "text-bc-text-3 hover:bg-bc-surface hover:text-bc-danger"
                          }`}
                        >
                          <Heart size={13} fill={like.liked ? "currentColor" : "none"} />
                          {like.likeCount}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveCommentsId(a.id)}
                          aria-label={`Lihat komentar (${a.commentCount})`}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold text-bc-text-3 transition-colors hover:bg-bc-surface hover:text-bc-aud"
                        >
                          <MessageCircle size={13} />
                          {a.commentCount}
                        </button>
                        <ShareButton url={`/artikel/${a.slug}`} title={a.title} compact={compact} />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {!compact && <div className="mt-4 rounded-bc-tile bg-bc-aud-soft border border-bc-border p-4">
            <div className="flex items-start gap-2">
              <Flame size={16} className="text-bc-warning mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-bc-text leading-snug">✨ Karya Anda bisa menginspirasi guru lain.</p>
                <p className="mt-0.5 text-[11px] text-bc-text-2">
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
          </div>}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:hidden">
            <Link
              href="/guru/artikel"
              className={buttonClass({ variant: "accent", size: "sm" })}
            >
              <PenLine size={13} /> Tulis Karya
            </Link>
            <Link href="/guru/karya" className={buttonClass({ variant: "secondary", size: "sm" })}>
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
