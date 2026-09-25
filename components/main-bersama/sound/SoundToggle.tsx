"use client";

import { Volume1, Volume2, VolumeX } from "lucide-react";

export function SoundToggle({
  enabled,
  unlocked,
  onToggle,
  compact = false,
}: {
  enabled: boolean;
  unlocked: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  const active = enabled && unlocked;
  const label = !enabled
    ? "Suara mati"
    : unlocked
      ? "Suara aktif"
      : "Aktifkan suara";
  const Icon = !enabled ? VolumeX : unlocked ? Volume2 : Volume1;

  return (
    <button
      type="button"
      className={[
        "mb-sound-toggle",
        compact ? "mb-sound-toggle-compact" : "",
        active ? "mb-sound-toggle-on" : "",
        enabled && !unlocked ? "mb-sound-toggle-needs-action" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onToggle}
      aria-pressed={active}
      aria-label={label}
      title={label}
    >
      <Icon aria-hidden size={18} strokeWidth={2.25} />
      {compact ? null : <span>{label}</span>}
    </button>
  );
}
