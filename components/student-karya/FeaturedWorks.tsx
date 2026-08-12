"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Eye, Star } from "lucide-react";
import { typeColors } from "@/components/student-karya/KaryaFeed";

interface FeaturedItem {
  id: string;
  type: string;
  title: string;
  excerpt?: string | null;
  content?: string | null;
  likesCount: number;
  viewsCount: number;
  user: {
    id: string;
    fullName: string;
    displayName?: string;
  };
  _count?: { likes?: number; comments?: number };
}

const initials = (name: string) =>
  name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

/**
 * FeaturedWorks — section "Karya Unggulan" (curated by engagement via API
 * existing: /api/siswa/karya?featured=true). 2 kartu editorial lebar di
 * desktop (2 kolom), 1 kolom mobile. Section disembunyikan bila kosong —
 * TIDAK ada kartu palsu/mock.
 */
export default function FeaturedWorks() {
  const [items, setItems] = useState<FeaturedItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/siswa/karya?featured=true&limit=2")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setItems(d?.karya ?? []))
      .catch(() => setError(true));
  }, []);

  if (error) return null;
  if (items !== null && items.length === 0) return null;

  return (
    <section className="mt-6" aria-label="Karya Unggulan">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
          <Star size={15} />
        </span>
        <div>
          <h2 className="text-base font-extrabold text-gray-900 dark:text-white">Karya Unggulan</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400">Karya yang paling banyak diapresiasi.</p>
        </div>
      </div>

      {items === null ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-3 h-4 w-24 rounded-full bg-gray-100 dark:bg-slate-800" />
              <div className="mb-2 h-5 w-3/4 rounded-lg bg-gray-100 dark:bg-slate-800" />
              <div className="mb-1.5 h-3 w-full rounded bg-gray-100 dark:bg-slate-800" />
              <div className="h-3 w-2/3 rounded bg-gray-100 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((k) => {
            const tc = typeColors[k.type] || typeColors.PUISI;
            return (
              <article
                key={k.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/[0.08] dark:border-violet-500/20 dark:from-slate-900 dark:to-violet-950/30"
              >
                <Link href={`/murid/karya/${k.id}`} className="flex-1 p-5 pb-3">
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-[0.14em] uppercase ${tc.bg} ${tc.text}`}>
                      {tc.label}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      <Star size={10} fill="currentColor" /> Unggulan
                    </span>
                  </div>
                  <h3 className="text-[17px] font-extrabold leading-snug text-gray-900 transition-colors line-clamp-2 group-hover:text-violet-700 dark:text-slate-100 dark:group-hover:text-violet-300">
                    {k.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500 line-clamp-2 dark:text-slate-400">
                    {k.excerpt || k.content?.slice(0, 160) || ""}
                  </p>
                </Link>
                <div className="flex items-center gap-3 border-t border-violet-50 px-5 py-3 dark:border-slate-800/80">
                  <Link href={`/profile/${k.user.id}`} className="flex min-w-0 items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-[10px] font-bold text-white">
                      {initials(k.user.displayName || k.user.fullName)}
                    </span>
                    <span className="truncate text-xs font-semibold text-gray-700 dark:text-slate-200">
                      {k.user.displayName || k.user.fullName}
                    </span>
                  </Link>
                  <span className="ml-auto flex items-center gap-2.5 text-[12px] text-gray-400 dark:text-slate-500">
                    <span className="flex items-center gap-1">
                      <Heart size={12} className="text-rose-400" /> {k._count?.likes ?? k.likesCount ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} /> {k._count?.comments ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={12} /> {k.viewsCount || 0}
                    </span>
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
