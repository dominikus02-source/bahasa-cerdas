"use client";

/**
 * Kartu JUMPA tetap di beranda guru & murid (lencana "Baru").
 * Ada ruang berlangsung → "Gabung JUMPA" dengan titik berdenyut.
 * Tidak tampil bila flag mati.
 *
 * `show`: beranda murid memasang dua salinan — "live" di atas (Gabung harus
 * terlihat tanpa menggulir) dan "idle" di tempat biasa. Keduanya berbagi
 * satu permintaan jaringan (lihat loadShared).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarPlus, Video } from "lucide-react";
import { JUMPA_ENABLED } from "@/lib/features";
import type { BerandaJumpaData } from "@/lib/jumpa/scheduling";
import { placeLabel, whenLabel } from "./entry-format";
import "./jumpa-entry.css";

let shared: { at: number; p: Promise<BerandaJumpaData | null> } | null = null;
function loadShared(): Promise<BerandaJumpaData | null> {
  if (shared && Date.now() - shared.at < 5_000) return shared.p;
  const p = fetch("/api/jumpa/beranda", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<BerandaJumpaData>) : null))
    .catch(() => null);
  shared = { at: Date.now(), p };
  return p;
}

export default function JumpaBerandaCard({ role, show = "all", className = "" }: { role: "GURU" | "MURID"; show?: "all" | "live" | "idle"; className?: string }) {
  const [data, setData] = useState<BerandaJumpaData | null>(null);

  useEffect(() => {
    if (!JUMPA_ENABLED) return;
    let alive = true;
    const load = () => loadShared().then((d) => { if (alive && d) setData(d); });
    void load();
    // Ruang bisa mulai kapan saja; cek lagi tiap menit selama tab terlihat.
    const id = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 60_000);
    return () => { alive = false; window.clearInterval(id); };
  }, []);

  if (!JUMPA_ENABLED) return null;
  const live = data?.live[0] ?? null;
  const next = data?.next ?? null;

  if (live ? show === "idle" : show === "live") return null;
  // Sebelum data datang, salinan "idle" tetap tampil (kerangka stabil).
  if (live) {
    return (
      <section className={`jpe jpe-card ${className}`} data-live="true" aria-label="JUMPA berlangsung">
        <div className="flex items-center gap-3">
          <span className="jpe-chip" aria-hidden><Video size={20} /></span>
          <div className="min-w-0 flex-1">
            <span className="jpe-live"><span className="jpe-dot" aria-hidden />Berlangsung</span>
            <p className="jpe-title jpe-trunc mt-1">{live.title}</p>
            <p className="jpe-cap jpe-trunc">{[placeLabel(live.title, live.place), live.present > 0 ? `${live.present} di dalam` : role === "MURID" && live.kind === "KELAS" ? "Gurumu sudah di dalam" : null].filter(Boolean).join(" · ")}</p>
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
