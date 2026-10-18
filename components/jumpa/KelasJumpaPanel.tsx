"use client";

/**
 * Panel JUMPA di halaman kelas.
 * Guru (pemilik kelas): "Mulai JUMPA" (utama) + "Jadwalkan", ruang berlangsung,
 * jadwal mendatang (bagikan), rapat terakhir + kehadiran.
 * Murid: "Gabung JUMPA" berdenyut saat kelas berlangsung + jadwal berikutnya;
 * panel tidak tampil bila tidak ada apa-apa.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, CalendarPlus, ClipboardList, Share2, Video } from "lucide-react";
import { JUMPA_ENABLED } from "@/lib/features";
import type { GroupJumpaData, HistoryItem } from "@/lib/jumpa/scheduling";
import ShareSheet from "./ShareSheet";
import StartJumpaButton from "./StartJumpaButton";
import NotifyClassToggle from "./NotifyClassToggle";
import { minutesLabel, whenLabel } from "./entry-format";
import "./jumpa-entry.css";

function lastLine(last: HistoryItem): string {
  const mins = last.startedAt && last.endedAt ? (new Date(last.endedAt).getTime() - new Date(last.startedAt).getTime()) / 60_000 : 0;
  return [whenLabel(last.startedAt), minutesLabel(mins), `${last.attended} hadir`].join(" · ");
}

export default function KelasJumpaPanel({ groupId, role, className = "" }: { groupId: string; role: "GURU" | "MURID"; className?: string }) {
  const [data, setData] = useState<GroupJumpaData | null>(null);
  const [share, setShare] = useState<HistoryItem | null>(null);
  // "Beri tahu kelas": nyala bawaan untuk rapat instan dari panel kelas.
  const [notify, setNotify] = useState(true);

  const load = useCallback(() => {
    fetch(`/api/jumpa/kelas/${encodeURIComponent(groupId)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: GroupJumpaData | null) => setData(d))
      .catch(() => undefined);
  }, [groupId]);

  useEffect(() => {
    if (!JUMPA_ENABLED) return;
    load();
    const id = window.setInterval(() => { if (document.visibilityState === "visible") load(); }, 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  if (!JUMPA_ENABLED) return null;
  const live = data?.live ?? null;
  const upcoming = data?.upcoming ?? [];

  if (role === "MURID") {
    if (!live && upcoming.length === 0) return null;
    return (
      <section className={`jpe jpe-card ${className}`} data-live={live ? "true" : undefined} aria-label="JUMPA kelas">
        <div className="flex items-center gap-3">
          <span className="jpe-chip" aria-hidden><Video size={20} /></span>
          <div className="min-w-0 flex-1">
            {live ? <span className="jpe-live"><span className="jpe-dot" aria-hidden />Berlangsung</span> : <p className="jpe-label">Jadwal JUMPA</p>}
            <p className="jpe-title jpe-trunc mt-1">{live ? live.title : upcoming[0].title}</p>
            <p className="jpe-cap jpe-trunc">{live ? (live.present > 0 ? `${live.present} di dalam` : "Gurumu sudah di dalam") : whenLabel(upcoming[0].scheduledAt)}</p>
          </div>
        </div>
        {live && (
          <div className="jpe-actions mt-4">
            <Link href={`/jumpa/${live.code}`} className="jpe-btn" data-tone="grad"><Video size={18} aria-hidden /> Gabung JUMPA</Link>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className={`jpe jpe-card ${className}`} data-live={live ? "true" : undefined} aria-labelledby={`jumpa-kelas-${groupId}`}>
      <div className="flex items-center gap-3">
        <span className="jpe-chip" aria-hidden><Video size={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 id={`jumpa-kelas-${groupId}`} className="jpe-title">JUMPA</h2>
            {live ? <span className="jpe-live"><span className="jpe-dot" aria-hidden />Berlangsung</span> : <span className="jpe-new">Baru</span>}
          </div>
          <p className="jpe-cap jpe-trunc">{live ? `${live.title}${live.present > 0 ? ` · ${live.present} di dalam` : ""}` : "Ruang video untuk kelas ini."}</p>
        </div>
      </div>

      <div className="jpe-actions mt-4">
        {live ? (
          <Link href={`/jumpa/${live.code}`} className="jpe-btn" data-tone="grad"><Video size={18} aria-hidden /> Masuk lagi</Link>
        ) : (
          <StartJumpaButton groupId={groupId} variant="grad" className="max-[479px]:w-full" notifyClass={notify} />
        )}
        <Link href={`/jumpa/jadwal?kelas=${encodeURIComponent(groupId)}`} className="jpe-ghost"><CalendarPlus size={16} aria-hidden /> Jadwalkan</Link>
        {live && (
          <button type="button" className="jpe-ghost" onClick={() => setShare(live)}><Share2 size={16} aria-hidden /> Bagikan</button>
        )}
      </div>
      {!live && <NotifyClassToggle on={notify} onChange={setNotify} className="mt-3" />}

      {upcoming.length > 0 && (
        <div className="mt-4 grid gap-2">
          <p className="jpe-label">Jadwal</p>
          {upcoming.map((u) => (
            <div key={u.code} className="jpe-row">
              <CalendarClock size={18} className="shrink-0 text-[var(--clr-text-3)]" aria-hidden />
              <Link href={`/jumpa/${u.code}`} className="min-w-0 flex-1">
                <span className="block text-sm font-bold jpe-trunc">{u.title}</span>
                <span className="block jpe-cap jpe-trunc">{whenLabel(u.scheduledAt)} · {minutesLabel(u.durationMin)}</span>
              </Link>
              <button type="button" className="jpe-icon-btn" onClick={() => setShare(u)} aria-label={`Bagikan ${u.title}`}><Share2 size={18} /></button>
            </div>
          ))}
        </div>
      )}

      {data?.last && (
        <Link href={`/jumpa/riwayat/${data.last.code}`} className="jpe-row mt-3">
          <ClipboardList size={18} className="shrink-0 text-[var(--clr-text-3)]" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Kehadiran terakhir</span>
            <span className="block jpe-cap jpe-trunc">{lastLine(data.last)}</span>
          </span>
        </Link>
      )}

      {share && <ShareSheet target={{ code: share.code, title: share.title, kind: share.kind, scheduledAt: share.scheduledAt }} onClose={() => setShare(null)} />}
    </section>
  );
}
