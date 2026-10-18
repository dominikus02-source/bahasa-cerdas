"use client";

/**
 * Kartu JUMPA tetap di beranda guru & murid (lencana "Baru").
 * Ada ruang berlangsung → "Gabung JUMPA" dengan titik berdenyut.
 * Tidak tampil bila flag mati.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarPlus, Video } from "lucide-react";
import { JUMPA_ENABLED } from "@/lib/features";
import type { BerandaJumpaData } from "@/lib/jumpa/scheduling";
import { whenLabel } from "./entry-format";
import "./jumpa-entry.css";

export default function JumpaBerandaCard({ role, className = "" }: { role: "GURU" | "MURID"; className?: string }) {
  const [data, setData] = useState<BerandaJumpaData | null>(null);

  useEffect(() => {
    if (!JUMPA_ENABLED) return;
    let alive = true;
    const load = () =>
      fetch("/api/jumpa/beranda", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: BerandaJumpaData | null) => { if (alive && d) setData(d); })
        .catch(() => undefined);
    void load();
    // Ruang bisa mulai kapan saja; cek lagi tiap menit selama tab terlihat.
    const id = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 60_000);
    return () => { alive = false; window.clearInterval(id); };
  }, []);

  if (!JUMPA_ENABLED) return null;
  const live = data?.live[0] ?? null;
  const next = data?.next ?? null;

  if (live) {
    return (
      <section className={`jpe jpe-card ${className}`} data-live="true" aria-label="JUMPA berlangsung">
        <div className="flex items-center gap-3">
          <span className="jpe-chip" aria-hidden><Video size={20} /></span>
          <div className="min-w-0 flex-1">
            <span className="jpe-live"><span className="jpe-dot" aria-hidden />Berlangsung</span>
            <p className="jpe-title jpe-trunc mt-1">{live.title}</p>
            <p className="jpe-cap jpe-trunc">{[live.place, live.present > 0 ? `${live.present} di dalam` : null].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <div className="jpe-actions mt-4">
          <Link href={`/jumpa/${live.code}`} className="jpe-btn" data-tone="grad">
            <Video size={18} aria-hidden /> {live.mine ? "Masuk lagi" : "Gabung JUMPA"}
          </Link>
          {(data?.live.length ?? 0) > 1 && <Link href="/jumpa/riwayat" className="jpe-ghost">Ruang lain</Link>}
        </div>
      </section>
    );
  }

  return (
    <section className={`jpe jpe-card ${className}`} aria-labelledby="jumpa-card-title">
      <div className="flex items-center gap-3">
        <span className="jpe-chip" aria-hidden><Video size={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 id="jumpa-card-title" className="jpe-title">JUMPA</h2>
            <span className="jpe-new">Baru</span>
          </div>
          <p className="jpe-cap jpe-trunc">{next ? `${whenLabel(next.scheduledAt)} · ${next.title}` : "Ruang video kelas."}</p>
        </div>
      </div>
      <div className="jpe-actions mt-4">
        <Link href={next ? `/jumpa/${next.code}` : "/jumpa"} className="jpe-ghost">
          {next ? "Lihat jadwal" : "Buka JUMPA"} <ArrowRight size={16} aria-hidden />
        </Link>
        {role === "GURU" && (
          <Link href="/jumpa/jadwal" className="jpe-ghost"><CalendarPlus size={16} aria-hidden /> Jadwalkan</Link>
        )}
      </div>
    </section>
  );
}
