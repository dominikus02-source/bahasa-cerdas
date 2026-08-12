"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { PenLine, FileText, Heart, Eye, Star, Loader2 } from "lucide-react";

interface MyKarya {
  id: string;
  title: string;
  type: string;
  likesCount: number;
  viewsCount: number;
  isFeatured: boolean;
}

/**
 * KaryaSayaCard — ringkasan "Karya Saya" di halaman Panggung Karya.
 * Data diambil dari /api/siswa/user/karya (karya milik user, read-only).
 * Hanya presentation — tidak ada logic/API baru.
 */
export default function KaryaSayaCard() {
  const [karya, setKarya] = useState<MyKarya[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/siswa/user/karya")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setKarya(d?.karya ?? []))
      .catch(() => setError(true));
  }, []);

  if (error) return null;

  const total = karya?.length ?? 0;
  const likes = karya?.reduce((a, k) => a + (k.likesCount || 0), 0) ?? 0;
  const views = karya?.reduce((a, k) => a + (k.viewsCount || 0), 0) ?? 0;
  const featured = karya?.filter((k) => k.isFeatured).length ?? 0;

  return (
    <section
      id="karya-saya"
      className="scroll-mt-24 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:p-6"
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[220px]">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-gray-900 dark:text-white">
            <FileText size={17} className="text-violet-500 dark:text-violet-300" />
            Karya Saya
          </h2>
          {karya === null ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500">
              <Loader2 size={12} className="animate-spin" /> Memuat karya...
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 font-semibold text-gray-700 dark:text-slate-200">
                <FileText size={12} /> {total} karya
              </span>
              <span className="inline-flex items-center gap-1">
                <Heart size={12} className="text-rose-400" /> {likes} suka
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye size={12} /> {views} dilihat
              </span>
              {featured > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Star size={12} fill="currentColor" /> {featured} unggulan
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <a
            href="#jelajahi-karya"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Lihat Karya Saya
          </a>
          <Link
            href="/murid/karya/tulis"
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-violet-700"
          >
            <PenLine size={14} /> Buat Karya
          </Link>
        </div>
      </div>
    </section>
  );
}
