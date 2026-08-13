"use client";

import { useMemo } from "react";
import { BarChart3, BookOpen, Sparkles } from "lucide-react";

export interface ChartDay {
  /** key "YYYY-MM-DD" (WIB) */
  dayKey: string;
  count: number;
}

/**
 * ActivityChart — grafik batang SVG 30 hari terakhir (zona WIB).
 *
 * Sumber data nyata:
 *  - primary: aktivitas belajar (PlayerActivity/Journey)
 *  - fallback: karya yang diterbitkan per hari
 * Bila keduanya kosong → empty state (tanpa data karangan).
 */
export default function ActivityChart({
  days,
  mode,
  totalKarya30,
  totalAktivitas30,
}: {
  days: ChartDay[];
  /** Kanal data yang sedang ditampilkan. */
  mode: "AKTIVITAS" | "KARYA";
  totalKarya30: number;
  totalAktivitas30: number;
}) {
  const max = useMemo(() => Math.max(1, ...days.map((d) => d.count)), [days]);

  const compactLabel = (dayKey: string) => {
    const d = new Date(`${dayKey}T00:00:00Z`);
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(d);
  };

  const now = new Date();
  const labelToday = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  return (
    <div
      className="rounded-2xl text-slate-900 dark:text-white ring-1 ring-slate-900/10 dark:ring-white/10 p-5 bc-card-premium"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={15} className="text-violet-600 dark:text-violet-300" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white/90">Aktivitas 30 Hari</h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-semibold">
          <span
            className={`rounded-full px-2 py-0.5 ring-1 ${
              mode === "AKTIVITAS"
                ? "bg-violet-500/15 text-violet-700 dark:text-violet-200 ring-violet-400/25"
                : "bg-slate-900/5 dark:bg-slate-900/5 text-slate-900/45 dark:text-white/45 ring-slate-900/10 dark:ring-white/10"
            }`}
          >
            Aktivitas
          </span>
          <span
            className={`rounded-full px-2 py-0.5 ring-1 ${
              mode === "KARYA"
                ? "bg-violet-500/15 text-violet-700 dark:text-violet-200 ring-violet-400/25"
                : "bg-slate-900/5 dark:bg-slate-900/5 text-slate-900/45 dark:text-white/45 ring-slate-900/10 dark:ring-white/10"
            }`}
          >
            Karya
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-900/[0.05] dark:bg-white/[0.05] ring-1 ring-slate-900/10 dark:ring-white/10 px-3.5 py-3">
          <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-900/60 dark:text-white/45">
            <Sparkles size={10} className="text-amber-600 dark:text-amber-300" /> Total Aktivitas
          </p>
          <p className="mt-1 text-xl font-black tabular-nums">
            {totalAktivitas30.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="rounded-xl bg-slate-900/[0.05] dark:bg-white/[0.05] ring-1 ring-slate-900/10 dark:ring-white/10 px-3.5 py-3">
          <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-900/60 dark:text-white/45">
            <BookOpen size={10} className="text-emerald-600 dark:text-emerald-300" /> Karya Dibuat
          </p>
          <p className="mt-1 text-xl font-black tabular-nums">
            {totalKarya30.toLocaleString("id-ID")}
          </p>
        </div>
      </div>

      {days.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-900/10 dark:border-white/10 px-4 py-8 text-center">
          <BarChart3 size={22} className="mx-auto mb-2 text-slate-900/25 dark:text-white/25" />
          <p className="text-sm text-slate-900/60 dark:text-white/45">{labelToday} belum ada data kegiatan 30 hari.</p>
          <p className="mt-1 text-xs text-slate-900/50 dark:text-white/30">
            Selesaikan unit Jalur Cerdas atau terbitkan karya untuk mulai mengisi grafik ini.
          </p>
        </div>
      ) : (
        <div className="mt-5">
          <div className="flex items-end gap-[3px]" style={{ height: 96 }} aria-hidden>
            {days.map((d) => {
              const h = Math.max(3, Math.round((d.count / max) * 92));
              return (
                <div
                  key={d.dayKey}
                  className="flex-1 rounded-t-[3px] transition-all duration-500"
                  style={{
                    height: h,
                    background:
                      "linear-gradient(180deg, #FBBF24 0%, #D946EF 55%, #8B5CF6 100%)",
                    opacity: d.count === 0 ? 0.18 : 0.55 + (d.count / max) * 0.45,
                  }}
                  title={`${compactLabel(d.dayKey)} · ${d.count} ${mode === "KARYA" ? "karya" : "aktivitas"}`}
                />
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[9px] text-slate-900/45 dark:text-white/30">
            <span>{compactLabel(days[0].dayKey)}</span>
            <span>{compactLabel(days[Math.floor(days.length / 2)]?.dayKey ?? days[days.length - 1].dayKey)}</span>
            <span>{compactLabel(days[days.length - 1].dayKey)}</span>
          </div>
          <p className="mt-1 text-right text-[10px] text-slate-900/55 dark:text-white/35">
            Hari ini · {labelToday} · {mode === "KARYA" ? "karya per hari" : "aktivitas per hari"}
          </p>
        </div>
      )}
    </div>
  );
}