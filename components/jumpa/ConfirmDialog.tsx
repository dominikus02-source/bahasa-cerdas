"use client";

/**
 * Dialog konfirmasi di dalam aplikasi (pengganti window.confirm).
 * role="alertdialog", fokus awal ke "Batal", Esc/scrim menutup, fokus kembali
 * ke pemicu. Di-portal ke .jumpa-scope agar tidak terjebak induk ber-transform.
 */
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * Pemicu yang valid = elemen nyata yang masih ada. <body> berarti pemicu sudah
 * hilang (mis. menu Lainnya ditutup sebelum dialog dibuka) → pakai cadangan.
 */
export function pickReturnFocus<T extends { isConnected: boolean }>(prev: T | null, body: T | null, fallback?: () => T | null): T | null {
  return prev && prev !== body && prev.isConnected ? prev : fallback?.() ?? null;
}

export default function ConfirmDialog({
  title,
  body,
  confirmLabel,
  icon,
  busy = false,
  onConfirm,
  onCancel,
  returnFocus,
}: {
  title: string;
  body?: string;
  confirmLabel: string;
  icon?: ReactNode;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Tujuan fokus saat ditutup bila pemicu sudah hilang (mis. item menu). */
  returnFocus?: () => HTMLElement | null;
}) {
  const id = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onCancel(); return; }
      if (e.key !== "Tab" || !boxRef.current) return;
      const els = [...boxRef.current.querySelectorAll<HTMLElement>("button:not([disabled])")];
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      pickReturnFocus(prev, document.body, returnFocus)?.focus?.();
    };
  }, [onCancel, returnFocus]);

  const host = (typeof document !== "undefined" && document.querySelector(".jumpa-scope")) || document.body;
  return createPortal(
    <div role="presentation">
      <button type="button" tabIndex={-1} className="jumpa-scrim jumpa-in-fade fixed inset-0 z-[70]" aria-label="Batal" onClick={onCancel} />
      <div ref={boxRef} role="alertdialog" aria-modal="true" aria-labelledby={`${id}-t`} aria-describedby={body ? `${id}-d` : undefined} className="jumpa-upgrade jumpa-confirm jumpa-in-pop">
        {icon && <span className="jumpa-confirm-icon" aria-hidden>{icon}</span>}
        <h2 id={`${id}-t`} className="text-lg font-extrabold">{title}</h2>
        {body && <p id={`${id}-d`} className="mt-1.5 text-sm text-[var(--jp-text-2)]">{body}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button ref={cancelRef} type="button" className="jumpa-ghost" onClick={onCancel} disabled={busy}>Batal</button>
          <button type="button" className="jumpa-confirm-danger" onClick={onConfirm} disabled={busy}>
            {busy && <Loader2 size={18} className="animate-spin" aria-hidden />} {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    host,
  );
}
