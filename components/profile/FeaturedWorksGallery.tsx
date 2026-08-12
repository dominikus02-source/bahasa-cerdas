"use client";

import { Plus, X, Heart, Eye } from "lucide-react";
import Link from "next/link";

export interface GalleryKarya {
  id: string;
  title: string;
  type: string;
  likesCount: number;
  viewsCount: number;
  excerpt?: string;
  content?: string;
  createdAt: string;
  isFeatured?: boolean;
}

const TYPE_BADGE: Record<string, { label: string; badge: string }> = {
  PUISI: { label: "Puisi", badge: "bg-rose-400/10 text-rose-300 ring-rose-300/20" },
  CERPEN: { label: "Cerpen", badge: "bg-sky-400/10 text-sky-300 ring-sky-300/20" },
  ARTIKEL: { label: "Artikel", badge: "bg-amber-400/10 text-amber-300 ring-amber-300/20" },
  ANEKDOT: { label: "Anekdot", badge: "bg-orange-400/10 text-orange-300 ring-orange-300/20" },
  PANTUN: { label: "Pantun", badge: "bg-teal-400/10 text-teal-300 ring-teal-300/20" },
  OPINI: { label: "Opini", badge: "bg-violet-400/10 text-violet-300 ring-violet-300/20" },
};

function waktuLalu(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

/**
 * FeaturedWorksGallery — galeri karya pemain dengan tema gelap: filter jenis,
 * tautan detail, tombol hapus (own), dan CTA menulis. Data nyata dari parent.
 */
export default function FeaturedWorksGallery({
  karyaList,
  filter,
  onFilterChange,
  onDelete,
  titleHref,
  tulisHref,
  emptyText = "Belum ada karya. Mulai menulis!",
}: {
  karyaList: GalleryKarya[];
  filter: string;
  onFilterChange: (type: string) => void;
  onDelete?: (id: string) => void;
  titleHref: string;
  tulisHref: string;
  emptyText?: string;
}) {
  const types = Array.from(new Set(karyaList.map((k) => k.type)));
  const filtered = karyaList.filter((k) => filter === "SEMUA" || k.type === filter);

  return (
    <div
      className="rounded-2xl p-5 text-white ring-1 ring-white/10"
      style={{ background: "linear-gradient(135deg, #0F1230 0%, #17163F 100%)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-white/90">Galeri Karya Unggulan</h3>
        <Link
          href={tulisHref}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 px-3.5 py-2 text-[11px] font-bold text-white hover:shadow-lg transition-all"
        >
          <Plus size={13} /> Tulis
        </Link>
      </div>

      {karyaList.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {["SEMUA", ...types].map((t) => (
            <button
              key={t}
              onClick={() => onFilterChange(t)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ring-1 ${
                filter === t
                  ? "bg-violet-500 text-white ring-violet-400/40"
                  : "bg-white/5 text-white/55 ring-white/10 hover:bg-white/10"
              }`}
            >
              {t === "SEMUA" ? "Semua" : TYPE_BADGE[t]?.label ?? t}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
          <p className="text-sm text-white/45">{emptyText}</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((k) => {
            const meta = TYPE_BADGE[k.type] ?? { label: k.type, badge: "bg-white/5 text-white/60 ring-white/10" };
            return (
              <div
                key={k.id}
                className="group flex flex-col rounded-xl bg-white/[0.05] ring-1 ring-white/10 p-4 transition-colors hover:bg-white/[0.08] hover:ring-violet-400/25"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${meta.badge}`}>
                    {meta.label}
                  </span>
                  {k.isFeatured && (
                    <span className="text-[10px] font-semibold text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded-full ring-1 ring-amber-300/20">
                      Pilihan
                    </span>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(k.id)}
                      aria-label={`Hapus karya ${k.title}`}
                      className="ml-auto text-white/25 hover:text-rose-400 p-1 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <Link href={`${titleHref}/${k.id}`} className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white text-sm leading-snug line-clamp-1 group-hover:text-violet-200 transition-colors">
                    {k.title}
                  </h4>
                  <p className="text-xs text-white/45 mt-1 line-clamp-2">
                    {k.excerpt || k.content?.slice(0, 100)}
                  </p>
                </Link>
                <div className="flex items-center gap-3 mt-3 text-xs text-white/40">
                  <span className="flex items-center gap-1">
                    <Heart size={11} className="text-rose-400" /> {k.likesCount || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye size={11} /> {k.viewsCount || 0}
                  </span>
                  <span className="ml-auto">{waktuLalu(k.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}