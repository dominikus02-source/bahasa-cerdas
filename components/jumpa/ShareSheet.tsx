"use client";

/**
 * Lembar "Bagikan JUMPA": bagikan (Web Share API di HP), WhatsApp dengan
 * teks Indonesia, salin tautan, salin kode, tautan undangan 24 jam (ruang
 * guru, pemandu), dan kode QR di laptop (dimuat saat dibuka saja).
 * Tautan selalu mensyaratkan login BC + izin ruang — bukan kunci masuk.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Hash, Link2, Loader2, MessageCircle, Share2, X } from "lucide-react";
import { formatWib } from "@/lib/jumpa/schedule";
import "./jumpa-entry.css";

export interface ShareTarget {
  code: string;
  title: string;
  kind: "KELAS" | "GURU" | "MURID";
  scheduledAt?: string | null;
  /** Pemandu ruang guru: boleh membuat tautan undangan 24 jam. */
  canLink?: boolean;
}

/** Teks ajakan (WhatsApp / bagikan). Pendek, tanpa emoji. */
export function shareText(t: ShareTarget, url: string, now = new Date()): string {
  const when = t.scheduledAt ? ` · ${formatWib(new Date(t.scheduledAt), now)}` : "";
  return `Yuk gabung JUMPA: ${t.title}${when}. Masuk pakai akun BahasaCerdas: ${url}`;
}

export function whatsappHref(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export default function ShareSheet({ target, onClose }: { target: ShareTarget; onClose: () => void }) {
  const [origin, setOrigin] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [link24, setLink24] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [canNative, setCanNative] = useState(false);
  const qrRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanNative(typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const url = link24 ?? `${origin}/jumpa/${target.code}`;
  const text = shareText(target, url);

  // QR hanya di laptop (CSS menyembunyikannya di HP); pustaka dimuat saat perlu.
  useEffect(() => {
    if (!origin || !qrRef.current || !window.matchMedia("(min-width: 768px)").matches || !window.matchMedia("(pointer: fine)").matches) return;
    let alive = true;
    void import("qrcode").then((QR) => {
      if (alive && qrRef.current) void QR.toCanvas(qrRef.current, url, { width: 224, margin: 1 });
    });
    return () => { alive = false; };
  }, [origin, url]);

  const copy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(key);
      setTimeout(() => setDone(null), 1800);
    } catch {
      setErr("Tidak bisa menyalin. Salin manual.");
    }
  };

  const native = async () => {
    try {
      await navigator.share({ title: `JUMPA: ${target.title}`, text, url });
    } catch {
      // Dibatalkan pengguna.
    }
  };

  const makeLink = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/jumpa/rooms/${encodeURIComponent(target.code)}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "LINK" }),
      });
      const body = (await res.json().catch(() => null)) as { path?: string; error?: string } | null;
      if (!res.ok || !body?.path) throw new Error(body?.error ?? "Tautan gagal dibuat.");
      const full = `${window.location.origin}${body.path}`;
      setLink24(full);
      await copy(full, "link24");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Tautan gagal dibuat.");
    } finally {
      setBusy(false);
    }
  };

  // Portal ke <body>: induk ber-transform/overflow (kartu jadwal, panel) tidak
  // boleh menjebak lembar `position: fixed` (uji 360px 25 Okt).
  return createPortal(
    <div className="jpe">
      <button type="button" className="jps-backdrop" aria-label="Tutup bagikan" onClick={onClose} />
      <div className="jps" role="dialog" aria-modal="true" aria-labelledby="jps-title">
        <div className="jps-grab" aria-hidden />
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p id="jps-title" className="jpe-title">Bagikan JUMPA</p>
            <p className="jpe-cap break-words">{target.title}{target.scheduledAt ? ` · ${formatWib(new Date(target.scheduledAt), new Date())}` : ""}</p>
          </div>
          <button type="button" className="jpe-icon-btn" onClick={onClose} aria-label="Tutup bagikan"><X size={18} /></button>
        </div>

        <div className="jps-grid mt-4">
          {canNative && (
            <button type="button" className="jps-opt jps-wide" onClick={() => void native()}><Share2 size={20} /> Bagikan</button>
          )}
          <a className="jps-opt" href={whatsappHref(text)} target="_blank" rel="noopener noreferrer"><MessageCircle size={20} /> WhatsApp</a>
          <button type="button" className="jps-opt" onClick={() => void copy(url, "url")}>
            {done === "url" ? <Check size={20} /> : <Link2 size={20} />} {done === "url" ? "Tersalin" : "Salin tautan"}
          </button>
          <button type="button" className="jps-opt jps-wide" onClick={() => void copy(target.code, "code")} aria-label={`Salin kode ${target.code}`}>
            {done === "code" ? <Check size={20} /> : <Hash size={20} />}
            <span className="min-w-0"><span className="block text-xs font-semibold text-[var(--clr-text-3)]">{done === "code" ? "Tersalin" : "Kode"}</span><span className="jps-code block truncate">{target.code}</span></span>
          </button>
        </div>

        {target.canLink && (
          <button type="button" className="jps-opt mt-2 w-full" disabled={busy} onClick={() => void makeLink()}>
            {busy ? <Loader2 size={20} className="animate-spin" /> : done === "link24" ? <Check size={20} /> : <Copy size={20} />}
            <span className="min-w-0">
              <span className="block">{link24 ? (done === "link24" ? "Tautan 24 jam tersalin" : "Salin lagi tautan 24 jam") : "Tautan undangan 24 jam"}</span>
              <span className="block text-xs font-medium text-[var(--clr-text-3)]">Untuk guru di luar komunitas.</span>
            </span>
          </button>
        )}

        <div className="jps-qr mt-3">
          <canvas ref={qrRef} width={224} height={224} aria-label="Kode QR tautan JUMPA" role="img" />
          <p className="jpe-cap">Pindai dengan kamera HP untuk membuka ruang ini.</p>
        </div>

        <p className="jpe-cap mt-3">Hanya akun BahasaCerdas yang terdaftar di ruang ini yang bisa masuk.</p>
        {err && <p role="alert" className="mt-2 text-sm text-[var(--clr-danger)]">{err}</p>}
      </div>
    </div>,
    document.body,
  );
}
