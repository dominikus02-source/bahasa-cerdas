"use client";

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
      title={label}
    >
      <span aria-hidden>{!enabled ? "🔇" : unlocked ? "🔊" : "🔈"}</span>
      {compact ? null : <span>{label}</span>}
    </button>
  );
}
