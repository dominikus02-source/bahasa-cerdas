"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, Eye, Feather, Flame, PenLine, Sparkles } from "lucide-react";
import SafeMediaImage from "@/components/shared/safe-media-image";
import type { MisiGuruStatus } from "@/lib/guru/misi-guru-status";

interface GuruKaryaItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  articleType: string | null;
  coverImage: string | null;
  readCount: number;
  createdAt: string;
  publishedAt: string | null;
  author: {
    id: string;
    fullName: string | null;
    avatar: string | null;
    profile: { school: string | null } | null;
  } | null;
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-violet-50" />
        ))}
      </div>
    </div>
  );
}

function TombolKarya({ href, icon, label, xp }: { href: string; icon: React.ReactNode; label: string; xp: number }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-violet-200 hover:border-violet-300 hover:bg-violet-50 px-3.5 py-2.5 text-xs font-semibold text-violet-800 shadow-sm transition-colors"
    >
      {icon}
      {label}
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-1.5 py-0.5">
        <Sparkles size={9} /> +{xp} XP
      </span>
    </Link>
  );
}

interface GuruBerkaryaProps {
  misiStatus?: MisiGuruStatus | null;
}

export function GuruBerkarya({ misiStatus }: GuruBerkaryaProps) {
  const [items, setItems] = useState<GuruKaryaItem[] | null>(null);

  useEffect(() => {
    let aktif = true;
    fetch("/api/guru/berkarya?limit=6", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((res) => {
        if (aktif) setItems(Array.isArray(res?.data) ? res.data : []);
      })
      .catch(() => {
        if (aktif) setItems([]);
      });
    return () => {
      aktif = false;
    };
  }, []);

  if (!items) return <Skeleton />;

  const misiArtikel = misiStatus?.misi.find((m) => m.id === "artikel");
  const sudahBerkarya = misiArtikel ? misiArtikel.selesai : false;

  return (
    <div className="rounded-3xl bg-white border border-violet-100 p-5 sm:p-6 shadow-lg shadow-violet-100/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-md shadow-violet-200">
            <Flame size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-violet-900">🔥 Guru Berkarya</h2>
            <p className="text-gray-500 text-xs sm:text-sm">Guru lain sedang berkarya. Giliran Anda?</p>
          </div>
        </div>
        <Link href="/guru/artikel" className="hidden sm:flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-100 rounded-xl px-3 py-2 transition-colors">
          Lihat Semua Karya <ChevronRight size={12} />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/50 px-5 py-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-white flex items-center justify-center shadow-sm">
            <PenLine size={22} className="text-violet-400" />
          </div>
          <p className="mt-3 text-sm font-semibold text-gray-800">Belum ada karya terbaru.</p>
          <p className="mt-1 text-xs text-gray-500">Jadilah guru pertama yang berkarya hari ini.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <TombolKarya href="/guru/artikel" icon={<BookOpen size={13} />} label="Buat Artikel" xp={50} />
            <TombolKarya href="/guru/artikel?type=puisi" icon={<Feather size={13} />} label="Buat Puisi" xp={50} />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((a) => {
              const isPuisi = (a.articleType || "").toUpperCase() === "PUISI";
              const isBaru = adalahBaru(a.publishedAt || a.createdAt);
              return (
                <Link
                  key={a.id}
                  href={`/artikel/${a.slug}`}
                  target="_blank"
                  className="group rounded-2xl border border-gray-100 hover:border-violet-200 hover:shadow-md transition-all overflow-hidden bg-white"
                >
                  {a.coverImage ? (
                    <div className="h-24 overflow-hidden">
                      <SafeMediaImage
                        src={a.coverImage}
                        alt={a.title}
                        fallbackType="article"
                        containerClassName="w-full h-24"
                      />
                    </div>
                  ) : (
                    <div className="h-24 flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-50">
                      {isPuisi ? <Feather size={28} className="text-violet-300" /> : <BookOpen size={28} className="text-violet-300" />}
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      {isBaru && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide bg-orange-100 text-orange-600">
                          <Flame size={9} /> Baru
                        </span>
                      )}
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${isPuisi ? "bg-purple-100 text-purple-700" : "bg-sky-100 text-sky-700"}`}>
                        {isPuisi ? "Puisi" : "Artikel"}
                      </span>
                      <span className="text-[10px] text-gray-400 ml-auto shrink-0">
                        {waktuRelatif(a.publishedAt || a.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-violet-700 transition-colors">
                      {a.title}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-400 line-clamp-1 flex items-center gap-1">
                      <span className="truncate">
                        {a.author?.fullName || "Guru"}
                        {a.author?.profile?.school ? ` · ${a.author.profile.school}` : ""}
                      </span>
                      <span className="flex items-center gap-1 shrink-0 ml-auto">
                        <Eye size={10} /> {a.readCount}
                      </span>
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 border border-violet-100 p-4">
            <div className="flex items-start gap-2">
              <Flame size={16} className="text-orange-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 leading-snug">
                  {sudahBerkarya
                    ? "Karya Anda sudah ikut menginspirasi guru lain. 🔥"
                    : "Belum berkarya minggu ini? Yuk buat satu."}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  {sudahBerkarya
                    ? "Tulis satu lagi supaya misi mingguan & XP Anda terus naik."
                    : "Misi mingguan Artikel/Puisi memberi +50 XP untuk karya pertama Anda."}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <TombolKarya href="/guru/artikel" icon={<BookOpen size={13} />} label="Buat Artikel" xp={50} />
              <TombolKarya href="/guru/artikel?type=puisi" icon={<Feather size={13} />} label="Buat Puisi" xp={50} />
            </div>
          </div>

          <Link href="/guru/artikel" className="mt-4 flex sm:hidden items-center justify-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-100 rounded-xl px-3 py-2.5 transition-colors">
            Lihat Semua Karya <ChevronRight size={12} />
          </Link>
        </>
      )}
    </div>
  );
}
