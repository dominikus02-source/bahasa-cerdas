"use client";

export function SoundToggle({
  enabled,
  onToggle,
  compact = false,
}: {
  enabled: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      className={`mb-sound-toggle ${compact ? "mb-sound-toggle-compact" : ""}`}
      onClick={onToggle}
      aria-pressed={enabled}
      title={enabled ? "Matikan suara" : "Aktifkan suara"}
    >
      <span aria-hidden>{enabled ? "🔊" : "🔇"}</span>
      {compact ? null : <span>{enabled ? "Suara" : "Senyap"}</span>}
    </button>
  );
}
