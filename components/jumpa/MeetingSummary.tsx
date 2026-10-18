"use client";

/**
 * Ringkasan JUMPA: durasi, jumlah hadir, tautan kembali; kehadiran per orang
 * hanya bila server mengirimkannya (guru pemilik/pembuat & admin).
 * Dipakai di layar setelah rapat dan di /jumpa/riwayat/[kode].
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, History, Loader2, Users } from "lucide-react";
import type { RoomSummary } from "@/lib/jumpa/scheduling";
import { formatWib } from "@/lib/jumpa/schedule";
import { minutesLabel } from "./entry-format";

function durationText(sec: number): string {
  if (sec < 60) return sec > 0 ? "< 1 mnt" : "0 mnt";
  return minutesLabel(Math.round(sec / 60));
}

const END_TEXT: Record<string, string> = {
  HOST: "Diakhiri pemandu",
  TIME_LIMIT: "Waktu habis",
  EMPTY: "Semua sudah keluar",
  STALE: "Ditutup otomatis",
  CANCELLED: "Dibatalkan",
};

export function MeetingSummaryView({ s, heading, note, extra }: { s: RoomSummary; heading: string; note?: string | null; extra?: React.ReactNode }) {
  const when = s.startedAt ? formatWib(new Date(s.startedAt), new Date()) : s.scheduledAt ? formatWib(new Date(s.scheduledAt), new Date()) : null;
  const cancelled = s.endReason === "CANCELLED";
  return (
    <section className="jumpa-card jumpa-lobby-info jumpa-in-up grid gap-4" aria-labelledby="jumpa-summary-h">
      <div className="text-center">
        <span className="jumpa-empty-icon mx-auto" aria-hidden><CheckCircle2 size={26} /></span>
        <h1 id="jumpa-summary-h" className="mt-3 text-xl font-extrabold">{heading}</h1>
        <p className="mt-1 text-sm text-[var(--jp-text-2)]">{s.title}</p>
        {(when || note) && <p className="mt-1 text-xs text-[var(--jp-text-3)]">{[when, note ?? (s.endReason ? END_TEXT[s.endReason] : null)].filter(Boolean).join(" · ")}</p>}
      </div>
      {!cancelled && (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="jumpa-stat"><strong>{durationText(s.durationSec)}</strong><span className="inline-flex items-center justify-center gap-1"><Clock size={12} aria-hidden /> Durasi</span></div>
          <div className="jumpa-stat"><strong>{s.attended}</strong><span className="inline-flex items-center justify-center gap-1"><Users size={12} aria-hidden /> Hadir</span></div>
        </div>
      )}
      {s.attendance && s.attendance.length > 0 && (
        <div>
          <h2 className="mb-1.5 px-1 text-xs font-bold uppercase tracking-[.12em] text-[var(--jp-text-3)]">Kehadiran</h2>
          <ul className="grid">
            {s.attendance.map((a, i) => (
              <li key={`${a.name}-${i}`} className="jumpa-att">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{a.name}{a.role === "GURU" && <span className="jumpa-mine">Guru</span>}</span>
                <span className="shrink-0 text-xs tabular-nums text-[var(--jp-text-2)]">{a.minutes < 1 ? "< 1 mnt" : minutesLabel(a.minutes)}{a.joins > 1 ? ` · ${a.joins}x masuk` : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid gap-2.5">
        {extra}
        <Link href={s.backHref} className="jumpa-primary w-full"><ArrowLeft size={18} /> {s.backLabel}</Link>
        <Link href="/jumpa/riwayat" className="jumpa-ghost w-full"><History size={16} /> Riwayat JUMPA</Link>
      </div>
    </section>
  );
}

/** Layar setelah rapat — ambil ringkasan dari server (fallback: tautan dasbor). */
export default function PostMeeting({ code, heading, note, fallbackHref, extra }: { code: string; heading: string; note?: string | null; fallbackHref: string; extra?: React.ReactNode }) {
  const [s, setS] = useState<RoomSummary | null | "error">(null);
  useEffect(() => {
    let alive = true;
    // Beri waktu webhook/penutupan peserta tercatat dulu.
    const t = window.setTimeout(() => {
      fetch(`/api/jumpa/rooms/${encodeURIComponent(code)}/ringkasan`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d: RoomSummary) => { if (alive) setS(d); })
        .catch(() => { if (alive) setS("error"); });
    }, 800);
    return () => { alive = false; window.clearTimeout(t); };
  }, [code]);

  // Ringkasan server punya alasan selesai sendiri (END_TEXT); `note` hanya untuk cadangan.
  if (s && s !== "error") return <MeetingSummaryView s={s} heading={heading} extra={extra} />;
  return (
    <section className="jumpa-card jumpa-lobby-info jumpa-in-up text-center" aria-live="polite">
      <span className="jumpa-empty-icon mx-auto" aria-hidden>{s === null ? <Loader2 size={26} className="animate-spin" /> : <CheckCircle2 size={26} />}</span>
      <h1 className="mt-3 text-xl font-extrabold">{heading}</h1>
      {note && <p className="mt-1 text-sm text-[var(--jp-text-2)]">{note}</p>}
      <div className="mt-5 grid gap-2.5">
        {extra}
        <Link href={fallbackHref} className="jumpa-primary w-full"><ArrowLeft size={18} /> Kembali ke beranda</Link>
      </div>
    </section>
  );
}
