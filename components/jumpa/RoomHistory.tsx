"use client";

/**
 * Riwayat & jadwal JUMPA: Mendatang · Berlangsung · Selesai.
 * Pembuat jadwal bisa mengubah/membatalkan; semua bisa membagikan jadwal.
 */
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarClock, CalendarPlus, CheckCircle2, ChevronRight, Pencil, Share2, Video } from "lucide-react";
import type { HistoryData, HistoryItem } from "@/lib/jumpa/scheduling";
import ShareSheet, { type ShareTarget } from "./ShareSheet";
import { minutesLabel, whenLabel } from "./entry-format";

type Tab = "upcoming" | "live" | "past";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "upcoming", label: "Mendatang" },
  { id: "live", label: "Berlangsung" },
  { id: "past", label: "Selesai" },
];
const EMPTY: Record<Tab, string> = {
  upcoming: "Belum ada jadwal.",
  live: "Tidak ada JUMPA yang berlangsung.",
  past: "Belum ada JUMPA selesai dalam 60 hari.",
};

function pastLine(i: HistoryItem): string {
  if (i.endReason === "CANCELLED") return [i.place, whenLabel(i.scheduledAt)].filter(Boolean).join(" · ");
  const mins = i.startedAt && i.endedAt ? (new Date(i.endedAt).getTime() - new Date(i.startedAt).getTime()) / 60_000 : 0;
  return [i.place, whenLabel(i.startedAt ?? i.scheduledAt), i.startedAt ? minutesLabel(mins) : null, i.startedAt ? `${i.attended} hadir` : null].filter(Boolean).join(" · ");
}

export default function RoomHistory({ data, canSchedule, backHref }: { data: HistoryData; canSchedule: boolean; backHref: string }) {
  const [tab, setTab] = useState<Tab>(data.live.length > 0 ? "live" : data.upcoming.length > 0 || data.past.length === 0 ? "upcoming" : "past");
  const [share, setShare] = useState<ShareTarget | null>(null);
  const items = tab === "live" ? data.live : tab === "upcoming" ? data.upcoming : data.past;

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col gap-5 px-4 pb-10 pt-[max(20px,env(safe-area-inset-top))] sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[var(--jp-accent)]">JUMPA</p>
          <h1 className="text-2xl font-extrabold">Riwayat & jadwal</h1>
        </div>
        <Link href={backHref} className="jumpa-ghost !min-h-[44px] shrink-0"><ArrowLeft size={16} /> Kembali</Link>
      </header>

      {canSchedule && (
        <Link href="/jumpa/jadwal" className="jumpa-primary w-full sm:w-auto sm:self-start"><CalendarPlus size={18} /> Jadwalkan JUMPA</Link>
      )}

      <div className="jumpa-tabs" role="tablist" aria-label="Riwayat JUMPA">
        {TABS.map((t) => {
          const n = (t.id === "live" ? data.live : t.id === "upcoming" ? data.upcoming : data.past).length;
          return (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} aria-controls="jumpa-hist-panel" className="jumpa-tab" onClick={() => setTab(t.id)}>
              {t.label}{n > 0 && <b>{n}</b>}
            </button>
          );
        })}
      </div>

      <section id="jumpa-hist-panel" role="tabpanel" aria-label={TABS.find((t) => t.id === tab)?.label}>
        {items.length === 0 ? (
          <p className="jumpa-glass rounded-2xl px-4 py-8 text-center text-sm text-[var(--jp-text-2)]">{EMPTY[tab]}</p>
        ) : (
          <ul className="grid gap-2">
            {items.map((i) => (
              <li key={i.code} className="jumpa-glass jumpa-hist rounded-2xl">
                <span className="jumpa-empty-icon !m-0 !h-11 !w-11 shrink-0" aria-hidden>
                  {tab === "live" ? <Video size={20} /> : tab === "upcoming" ? <CalendarClock size={20} /> : <CheckCircle2 size={20} />}
                </span>
                <Link href={tab === "past" ? `/jumpa/riwayat/${i.code}` : `/jumpa/${i.code}`} className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-bold">{i.title}</span>
                    {i.mine && <span className="jumpa-mine !ml-0 shrink-0">Buatanmu</span>}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-[var(--jp-text-3)]">
                    {tab === "live"
                      ? [i.place, i.present > 0 ? `${i.present} di dalam` : null].filter(Boolean).join(" · ")
                      : tab === "upcoming"
                        ? [i.place, i.scheduledAt ? whenLabel(i.scheduledAt) : "Belum dimulai", i.scheduledAt ? minutesLabel(i.durationMin) : null].filter(Boolean).join(" · ")
                        : pastLine(i)}
                  </span>
                  {i.endReason === "CANCELLED" && <span className="jumpa-cancelled">Dibatalkan</span>}
                </Link>
                {tab === "upcoming" && i.mine && i.scheduledAt && (
                  <Link href={`/jumpa/jadwal?ubah=${i.code}`} className="jumpa-icon-btn shrink-0" aria-label={`Ubah ${i.title}`}><Pencil size={18} /></Link>
                )}
                {tab !== "past" ? (
                  <button type="button" className="jumpa-icon-btn shrink-0" aria-label={`Bagikan ${i.title}`} onClick={() => setShare({ code: i.code, title: i.title, kind: i.kind, scheduledAt: i.scheduledAt, canLink: i.kind === "GURU" && i.mine })}>
                    <Share2 size={18} />
                  </button>
                ) : (
                  <ChevronRight size={18} className="shrink-0 text-[var(--jp-text-3)]" aria-hidden />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      {share && <ShareSheet target={share} onClose={() => setShare(null)} />}
    </main>
  );
}
