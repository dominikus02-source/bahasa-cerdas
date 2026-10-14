"use client";

import { useEffect, useRef } from 'react';
import { Flag, X } from 'lucide-react';
import styles from './play-controls.module.css';

export default function EndSessionDialog({ title, description, busy, onCancel, onConfirm }: {
  title: string;
  description: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    cancel.current?.focus();
    return () => { if (previous instanceof HTMLElement) previous.focus(); };
  }, []);

  return (
    <div className={styles.backdrop}>
      <section ref={panel} className={styles.dialog} role="alertdialog" aria-modal="true"
        aria-labelledby="mb-end-title" aria-describedby="mb-end-description"
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.stopPropagation(); if (!busy) onCancel(); }
          if (event.key !== 'Tab') return;
          const buttons = panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
          if (!buttons?.length) return;
          const first = buttons[0];
          const last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }}>
        <button type="button" className={styles.closeDialog} disabled={busy} onClick={onCancel} aria-label="Batal mengakhiri sesi"><X size={18} aria-hidden /></button>
        <div className={styles.dialogIcon}><Flag size={23} aria-hidden /></div>
        <h2 id="mb-end-title">{title}</h2>
        <p id="mb-end-description">{description}</p>
        <div className={styles.dialogActions}>
          <button ref={cancel} type="button" disabled={busy} onClick={onCancel}>Lanjut bermain</button>
          <button type="button" className={styles.confirmEnd} disabled={busy} onClick={onConfirm}>{busy ? 'Memproses…' : 'Akhiri & Lihat Podium'}</button>
        </div>
      </section>
    </div>
  );
}
