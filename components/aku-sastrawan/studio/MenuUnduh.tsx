"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, FileText, FileType2 } from "lucide-react";
import { FORMAT_EKSPOR, tautanEkspor, type FormatEkspor } from "@/lib/aku-sastrawan/ekspor/format";

const IKON: Record<FormatEkspor, typeof Download> = { pdf: FileText, docx: FileType2, txt: Download };

/** Tombol "Unduh" + pilihan PDF / Word / .txt. Menyimpan perubahan dulu, lalu mengunduh. */
export function MenuUnduh({ projectId, sebelumUnduh }: { projectId: string; sebelumUnduh?: () => Promise<unknown> }) {
  const [buka, setBuka] = useState(false);
  const akar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!buka) return;
    const tutup = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !akar.current?.contains(e.target as Node)) setBuka(false);
    };
    window.addEventListener("mousedown", tutup);
    window.addEventListener("keydown", tutup);
    return () => { window.removeEventListener("mousedown", tutup); window.removeEventListener("keydown", tutup); };
  }, [buka]);

  return (
    <div ref={akar} className="relative">
      <button type="button" onClick={() => setBuka((b) => !b)} aria-expanded={buka} aria-haspopup="menu" aria-label="Unduh naskah" data-testid="menu-unduh"
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground transition hover:text-foreground">
        <Download size={16} /><span className="hidden sm:inline">Unduh</span><ChevronDown size={14} className="hidden sm:inline" />
      </button>
      {buka && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-60 animate-fade-in overflow-hidden rounded-2xl border border-border bg-card p-1.5 text-sm shadow-xl">
          {FORMAT_EKSPOR.map((f) => {
            const url = tautanEkspor(projectId, f.format);
            const Ikon = IKON[f.format];
            return (
              <a key={f.format} role="menuitem" href={url} download data-testid={`unduh-${f.format}`}
                onClick={(e) => { e.preventDefault(); setBuka(false); void (sebelumUnduh?.() ?? Promise.resolve()).finally(() => { window.location.href = url; }); }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-muted">
                <Ikon size={15} />
                <span className="flex flex-col leading-tight"><span>{f.label}</span><span className="text-xs text-muted-foreground">{f.ket}</span></span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
