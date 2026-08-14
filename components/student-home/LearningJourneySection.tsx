"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, ChevronRight, ClipboardList, Clock, Gamepad2 } from "lucide-react";
import { useHomeData } from "./home-data";

interface JourneyEntry {
  id: string;
  title: string;
  icon: string | null;
}

const ITEMS = [
  {
    href: "/arena/jalur-cerdas",
    label: "Jalur Cerdas",
    desc: "Belajar kosakata, tata bahasa, dan membaca",
    icon: BookOpen,
    accent: "text-[var(--px-royal)] bg-transparent",
  },
  {
    href: "/arena/game",
    label: "Latihan",
    desc: "Latihan kilat dan permainan kata",
    icon: Gamepad2,
    accent: "text-[var(--px-text-dim)] bg-transparent",
  },
  {
    href: "/murid/simulasi/ukbi",
    label: "Simulasi",
    desc: "UKBI & TKA — ukur kemampuanmu",
    icon: ClipboardList,
    accent: "text-[var(--px-text-dim)] bg-transparent",
  },
  {
    href: "/murid/tugasku",
    label: "Tugas",
    desc: "Kumpulkan tugas dari gurumu",
    icon: Clock,
    accent: "text-[var(--px-text-dim)] bg-transparent",
    dynamic: true,
  },
];

export function LearningJourneySection() {
  const [journey, setJourney] = useState<JourneyEntry[]>([]);
  const { summary } = useHomeData();

  useEffect(() => {
    let alive = true;
    fetch("/api/player/journey?limit=3")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .catch(() => ({ entries: [] }))
      .then((j) => alive && setJourney(j?.entries || []));
    return () => {
      alive = false;
    };
  }, []);

  const totalTugas = typeof summary?.totalTugas === "number" ? summary.totalTugas : null;

  return (
    <section aria-label="Perjalanan belajar">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--px-text)]">Perjalanan Belajar</h2>
          <p className="text-xs text-[var(--px-text-faint)]">Lanjutkan langkah berikutnya</p>
        </div>
        {journey.length > 0 && (
          <p className="text-[11px] text-[var(--px-text-faint)] text-right hidden sm:block">
            Aktivitas terakhir: <span className="text-[var(--px-text-dim)] font-medium">{journey[0].title}</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 border-t section-rule">
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
              className="group section-rule border-b px-2 py-3.5 flex items-center gap-3 transition-colors hover:bg-slate-900/[0.035] dark:hover:bg-white/[0.05]"
            >
              <span className={`w-8 h-8 flex items-center justify-center shrink-0 ${item.accent}`}>
                <Icon size={18} strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[var(--px-text)] group-hover:text-[var(--px-royal)] transition-colors">
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
