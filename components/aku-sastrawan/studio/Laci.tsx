"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Laci samping (desktop) / lembar bawah (ponsel) dengan transisi halus.
 * Di desktop laci tidak menutupi naskah (non-modal); di ponsel ada latar redup.
 */
export function Laci({ terbuka, judul, keterangan, onTutup, children, labelId }: {
  terbuka: boolean;
  judul: string;
  keterangan?: string;
  onTutup: () => void;
  children: ReactNode;
  labelId: string;
}) {
  const [tampil, setTampil] = useState(terbuka);
  const [masuk, setMasuk] = useState(false);

  useEffect(() => {
    if (terbuka) {
      setTampil(true);
      const r = window.requestAnimationFrame(() => setMasuk(true));
      return () => window.cancelAnimationFrame(r);
    }
    setMasuk(false);
    const t = window.setTimeout(() => setTampil(false), 220);
    return () => window.clearTimeout(t);
  }, [terbuka]);

  useEffect(() => {
    if (!terbuka) return;
    const tombol = (e: KeyboardEvent) => { if (e.key === "Escape") onTutup(); };
    window.addEventListener("keydown", tombol);
    return () => window.removeEventListener("keydown", tombol);
  }, [terbuka, onTutup]);

  if (!tampil) return null;
  return (
    <>
      <div
        aria-hidden
        onClick={onTutup}
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] transition-opacity duration-200 lg:hidden ${masuk ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        role="dialog"
        aria-labelledby={labelId}
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[86vh] flex-col rounded-t-3xl border border-border bg-card shadow-2xl transition-transform duration-200 ease-out
          lg:inset-x-auto lg:bottom-0 lg:right-0 lg:top-0 lg:max-h-none lg:w-[400px] lg:rounded-none lg:border-y-0 lg:border-r-0 lg:shadow-xl
          ${masuk ? "translate-y-0 lg:translate-x-0" : "translate-y-full lg:translate-y-0 lg:translate-x-full"}`}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-border lg:hidden" aria-hidden />
        <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-4 lg:pt-6">
          <div>
            <h2 id={labelId} className="font-display text-xl tracking-tight">{judul}</h2>
            {keterangan && <p className="mt-0.5 text-xs text-muted-foreground">{keterangan}</p>}
          </div>
          <button onClick={onTutup} aria-label="Tutup panel" className="-mr-1 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"><X size={18} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">{children}</div>
      </aside>
    </>
  );
}
