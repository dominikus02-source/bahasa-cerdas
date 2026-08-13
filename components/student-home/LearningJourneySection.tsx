"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, ChevronRight, ClipboardList, Clock, Gamepad2 } from "lucide-react";

interface JourneyEntry {
  id: string;
  title: string;
  icon: string | null;
}

interface SummaryData {
  totalTugas?: number;
}

const ITEMS = [
  {
    href: "/arena/jalur-cerdas",
    label: "Jalur Cerdas",
    desc: "Belajar kosakata, tata bahasa, dan membaca",
    icon: BookOpen,
    accent: "text-violet-300 bg-violet-500/15",
  },
  {
    href: "/arena/game",
    label: "Latihan",
    desc: "Latihan kilat dan permainan kata",
    icon: Gamepad2,
    accent: "text-sky-300 bg-sky-500/15",
  },
  {
    href: "/murid/simulasi/ukbi",
    label: "Simulasi",
    desc: "UKBI & TKA — ukur kemampuanmu",
    icon: ClipboardList,
    accent: "text-emerald-300 bg-emerald-500/15",
  },
  {
    href: "/murid/tugasku",
    label: "Tugas",
    desc: "Kumpulkan tugas dari gurumu",
    icon: Clock,
    accent: "text-amber-300 bg-amber-500/15",
    dynamic: true,
  },
];

export function LearningJourneySection() {
  const [journey, setJourney] = useState<JourneyEntry[]>([]);
  const [totalTugas, setTotalTugas] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/api/player/journey?limit=3")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .catch(() => ({ entries: [] })),
      fetch("/api/murid/dashboard/summary")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .catch(() => null as SummaryData | null),
    ]).then(([j, s]) => {
      if (!alive) return;
      setJourney(j?.entries || []);
      const t = (s as SummaryData | null)?.totalTugas;
      setTotalTugas(typeof t === "number" ? t : null);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section aria-label="Perjalanan belajar">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-lg font-extrabold text-[var(--px-text)]">Perjalanan Belajar</h2>
          <p className="text-xs text-[var(--px-text-faint)]">Lanjutkan langkah berikutnya</p>
        </div>
        {journey.length > 0 && (
          <p className="text-[11px] text-[var(--px-text-faint)] text-right hidden sm:block">
            Aktivitas terakhir: <span className="text-[var(--px-text-dim)] font-medium">{journey[0].title}</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const subtitle =
            item.dynamic && totalTugas !== null
              ? totalTugas > 0
                ? `${totalTugas} belum dikerjakan`
                : "Semua selesai"
              : item.desc;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="group px-card px-4 py-4 flex items-center gap-3.5 hover:bg-slate-900/[0.08] dark:bg-white/[0.08] transition-colors"
            >
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.accent}`}>
                <Icon size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-[var(--px-text)] group-hover:text-slate-900 dark:text-white transition-colors">
                  {item.label}
                </span>
                <span className="block text-xs text-[var(--px-text-faint)] truncate">{subtitle}</span>
              </span>
              <ChevronRight size={16} className="text-[var(--px-text-faint)] group-hover:text-[var(--px-gold)] transition-colors shrink-0" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
