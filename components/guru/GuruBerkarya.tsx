"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, Eye, Feather, Loader2 } from "lucide-react";
import SafeMediaImage from "@/components/shared/safe-media-image";

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

function Skeleton() {
  return (
    <div className="rounded-3xl bg-white border border-violet-100 p-5 sm:p-6 shadow-lg shadow-violet-100/50 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-violet-100" />
        <div className="space-y-2">
          <div className="h-5 bg-violet-100 rounded w-44" />
          <div className="h-3.5 bg-violet-50 rounded w-56" />
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

export function GuruBerkarya() {
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
  if (items.length === 0) return null;

  return (
    <div className="rounded-3xl bg-white border border-violet-100 p-5 sm:p-6 shadow-lg shadow-violet-100/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-md shadow-violet-200">
            <BookOpen size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-violet-900">Guru Berkarya</h2>
            <p className="text-gray-500 text-xs sm:text-sm">Artikel & puisi terbaru dari guru lain</p>
          </div>
        </div>
        <Link href="/guru/artikel" className="hidden sm:flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-100 rounded-xl px-3 py-2 transition-colors">
          Tulis Karyamu <ChevronRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((a) => {
          const isPuisi = (a.articleType || "").toUpperCase() === "POETRY";
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
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${isPuisi ? "bg-purple-100 text-purple-700" : "bg-sky-100 text-sky-700"}`}>
                    {isPuisi ? "Puisi" : "Artikel"}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-gray-400">
                    <Eye size={10} /> {a.readCount}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-violet-700 transition-colors">
                  {a.title}
                </p>
                <p className="mt-1 text-[11px] text-gray-400 line-clamp-1">
                  {a.author?.fullName || "Guru"} {a.author?.profile?.school ? `· ${a.author.profile.school}` : ""}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <Link href="/guru/artikel" className="mt-4 flex sm:hidden items-center justify-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-100 rounded-xl px-3 py-2.5 transition-colors">
        Tulis Karyamu <ChevronRight size={12} />
      </Link>
    </div>
  );
}
