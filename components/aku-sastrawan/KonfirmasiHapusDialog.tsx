"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle, Trash2 } from "lucide-react";

export const KATA_KONFIRMASI_HAPUS = "HAPUS";

/**
 * Dialog konfirmasi hapus permanen. Tombol hapus baru aktif setelah pengguna
 * mengetik HAPUS; nilai yang sama dikirim ke server ({ konfirmasi: "HAPUS" }).
 */
export function KonfirmasiHapusDialog({
  open,
  judul,
  deskripsi,
  peringatan,
  sibuk,
  galat,
  onBatal,
  onHapus,
}: {
  open: boolean;
  judul: string;
  deskripsi: string;
  peringatan?: string;
  sibuk?: boolean;
  galat?: string;
  onBatal: () => void;
  onHapus: () => void;
}) {
  const [ketikan, setKetikan] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    setKetikan("");
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !sibuk) onBatal(); };
    window.addEventListener("keydown", onKey);
    return () => { window.clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [open, sibuk, onBatal]);

  if (!open) return null;
  const cocok = ketikan.trim().toUpperCase() === KATA_KONFIRMASI_HAPUS;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => { if (!sibuk) onBatal(); }}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 text-foreground shadow-2xl sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"><AlertTriangle size={20} /></span>
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-black">{judul}</h2>
            <p id={descId} className="mt-1 text-sm leading-6 text-muted-foreground">{deskripsi}</p>
            {peringatan && <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200">{peringatan}</p>}
          </div>
        </div>
        <label className="mt-4 block text-xs font-bold text-muted-foreground">
          Ketik <span className="font-mono text-foreground">{KATA_KONFIRMASI_HAPUS}</span> untuk mengonfirmasi
          <input
            ref={inputRef}
            value={ketikan}
            onChange={(e) => setKetikan(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && cocok && !sibuk) onHapus(); }}
            autoComplete="off"
            aria-label="Ketik HAPUS untuk mengonfirmasi"
            className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-destructive/60"
          />
        </label>
        {galat && <p role="alert" className="mt-3 text-sm text-destructive">{galat}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onBatal} disabled={sibuk} className="inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm font-semibold disabled:opacity-50">Batal</button>
          <button type="button" onClick={onHapus} disabled={!cocok || sibuk} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-destructive px-4 text-sm font-bold text-white disabled:opacity-50">
            {sibuk ? <LoaderCircle size={15} className="animate-spin" /> : <Trash2 size={15} />} Hapus permanen
          </button>
        </div>
      </div>
    </div>
  );
}
