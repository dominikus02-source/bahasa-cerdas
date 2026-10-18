"use client";

import { Bell, BellOff } from "lucide-react";

/**
 * Sakelar "Beri tahu kelas" (alur penuh). Nyala = kelas/komunitas dapat
 * notifikasi rapat ini (sedang JUMPA, jadwal, pengingat, perubahan).
 * Mati = tanpa notifikasi ke kelas. Server menegakkan lewat
 * JumpaRoom.notifyClass (lib/jumpa/notify.ts → noticeAudience).
 * tone "entry" = panel dasbor (.jpe), "room" = halaman /jumpa (.jumpa-scope).
 */
export default function NotifyClassToggle({
  on,
  onChange,
  label = "Beri tahu kelas",
  hintOn = "Murid dapat notifikasi.",
  hintOff = "Tanpa notifikasi ke murid.",
  tone = "entry",
  className = "",
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  label?: string;
  hintOn?: string;
  hintOff?: string;
  tone?: "entry" | "room";
  className?: string;
}) {
  const Icon = on ? Bell : BellOff;
  if (tone === "room") {
    return (
      <button type="button" role="switch" aria-checked={on} className={`jumpa-setting-row ${className}`} onClick={() => onChange(!on)}>
        <span className="jumpa-setting-icon" aria-hidden><Icon size={18} /></span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-sm font-semibold">{label}</span>
          <span className="block text-xs text-[var(--jp-text-3)]">{on ? hintOn : hintOff}</span>
        </span>
        <span className="jumpa-switch" data-on={on} aria-hidden />
      </button>
    );
  }
  return (
    <button type="button" role="switch" aria-checked={on} className={`jpe-switch-row ${className}`} onClick={() => onChange(!on)}>
      <Icon size={18} className="shrink-0 text-[var(--clr-text-3)]" aria-hidden />
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-bold">{label}</span>
        <span className="block jpe-cap">{on ? hintOn : hintOff}</span>
      </span>
      <span className="jpe-switch" data-on={on} aria-hidden />
    </button>
  );
}
