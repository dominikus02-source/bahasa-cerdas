"use client";

import Link from "next/link";
import { Gamepad2, Swords } from "lucide-react";

export function ArenaHomeSection() {
  return (
    <section aria-label="Arena">
      <div className="px-card px-5 py-5 md:py-6 relative overflow-hidden flex flex-col md:flex-row md:items-center gap-4">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[var(--px-royal)]/20 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-4 min-w-0">
          <span className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--px-royal)] to-[var(--px-royal-2)] flex items-center justify-center shadow-lg shadow-[var(--px-royal)]/30">
            <Swords size={22} className="text-white" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--px-royal-2)]">Arena</p>
            <h2 className="text-lg md:text-xl font-extrabold text-[var(--px-text)] leading-tight">
              Tantang dirimu. Raih XP. Mainkan gim.
            </h2>
          </div>
        </div>
        <Link
          href="/arena"
          className="relative shrink-0 px-btn-gold flex items-center justify-center gap-2 text-sm font-bold px-6 py-3 md:ml-auto"
          aria-label="Masuk Arena"
        >
          <Gamepad2 size={16} />
          Masuk Arena →
        </Link>
      </div>
    </section>
  );
}