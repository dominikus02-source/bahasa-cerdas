"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, MessageSquare, PenSquare, Sparkles } from "lucide-react";

interface KaryaItem {
  id: string;
  title: string;
  type: string;
  likesCount: number;
  commentsCount: number;
  isFeatured: boolean;
  createdAt: string;
  user: { displayName: string; rankLabel?: string };
}

const TYPE_META: Record<string, { label: string; badge: string }> = {
  PUISI: { label: "Puisi", badge: "bg-rose-500/15 text-rose-300" },
  CERPEN: { label: "Cerpen", badge: "bg-blue-500/15 text-blue-300" },
  ARTIKEL: { label: "Artikel", badge: "bg-amber-500/15 text-amber-300" },
  ANEKDOT: { label: "Anekdot", badge: "bg-orange-500/15 text-orange-300" },
  PANTUN: { label: "Pantun", badge: "bg-teal-500/15 text-teal-300" },
  OPINI: { label: "Opini", badge: "bg-violet-500/15 text-violet-300" },
};

function waktuLalu(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const menit = Math.floor(diff / 60000);
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} mnt lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  return `${hari} hari lalu`;
}

export function RecentWorksSection() {
  const [karya, setKarya] = useState<KaryaItem[]>([]);

  useEffect(() => {
    let alive = true;
    fetch("/api/siswa/karya?limit=4")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .catch(() => ({ karya: [] }))
      .then((d) => alive && setKarya(d.karya || []));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section aria-label="Karya siswa terbaru">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-lg font-extrabold text-[var(--px-text)] flex items-center gap-2">
            <Sparkles size={17} className="text-[var(--px-gold)]" />
            Karya Siswa Terbaru
          </h2>
          <p className="text-xs text-[var(--px-text-faint)]">Puisi, cerpen, artikel, dan lainnya</p>
        </div>
        <Link
          href="/murid/karya"
          className="px-btn-ghost flex items-center gap-1.5 text-xs font-semibold px-4 py-2"
          aria-label="Lihat semua karya"
        >
          <PenSquare size={14} />
          Semua Karya
        </Link>
      </div>

      {karya.length === 0 ? (
        <div className="px-card px-5 py-8 text-center">
          <p className="text-sm text-[var(--px-text-faint)]">Belum ada karya. Jadilah yang pertama menulis!</p>
          <Link href="/murid/karya/tulis" className="inline-block mt-3 text-xs font-bold text-[var(--px-gold)] hover:underline">
            Tulis Karya Sekarang →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {karya.map((k) => {
            const meta = TYPE_META[k.type] || { label: k.type, badge: "bg-white/10 dark:bg-slate-900/10 text-[var(--px-text-dim)]" };
            return (
              <Link
                key={k.id}
                href={`/murid/karya/${k.id}`}
                className="group px-card px-4 py-4 flex flex-col gap-2 hover:bg-white/[0.08] transition-colors"
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full self-start ${meta.badge}`}>
                  {meta.label}
                </span>
                <p className="text-sm font-bold text-[var(--px-text)] line-clamp-2 group-hover:text-white transition-colors">
                  {k.title}
                </p>
                <p className="text-[11px] text-[var(--px-text-faint)] truncate">
                  {k.user.displayName} · {waktuLalu(k.createdAt)}
                </p>
                <div className="flex items-center gap-3 mt-auto text-[11px] text-[var(--px-text-faint)]">
                  <span className="flex items-center gap-1">
                    <Heart size={12} className="text-rose-400" />
                    {k.likesCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare size={12} />
                    {k.commentsCount}
                  </span>
                  {k.isFeatured && (
                    <span className="ml-auto text-[10px] font-bold text-[var(--px-gold)]">✦ Pilihan</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
