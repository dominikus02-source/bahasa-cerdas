/**
 * RPG Game HUD — minimal heads-up display.
 *
 * Displays:
 * - Character name
 * - Level
 * - HP bar
 * - XP bar
 * - Map/location name
 *
 * This is a PURE presentation component — it receives data via props
 * and never mutates game state.
 *
 * Styling uses game-env CSS variables for consistency with other Arena games.
 */

interface RPGGameHUDProps {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  xp: number;
  xpToNext: number;
  mapName: string;
}

export function RPGGameHUD({
  name,
  level,
  hp,
  maxHp,
  xp,
  xpToNext,
  mapName,
}: RPGGameHUDProps) {
  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const xpPercent = xpToNext > 0 ? Math.max(0, Math.min(100, (xp / xpToNext) * 100)) : 0;

  return (
    <div className="absolute top-3 left-3 right-3 pointer-events-none z-10">
      {/* Player info card */}
      <div className="game-env-card bg-[var(--game-surface)] border-2 border-[var(--game-border-light)] rounded-xl p-3 shadow-lg max-w-xs pointer-events-auto">
        {/* Name + Level */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-bold text-[var(--game-text)]">
            {name}
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--game-primary)] text-white">
            Lv.{level}
          </span>
        </div>

        {/* HP Bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span className="text-[var(--game-text-secondary)]">HP</span>
            <span className="text-[var(--game-text-muted)]">
              {hp}/{maxHp}
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--game-success)] rounded-full transition-all duration-300"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* XP Bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span className="text-[var(--game-text-secondary)]">XP</span>
            <span className="text-[var(--game-text-muted)]">
              {xp}/{xpToNext}
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--game-primary)] rounded-full transition-all duration-300"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>

        {/* Map name */}
        <div className="text-xs text-[var(--game-text-muted)]">
          📍 {mapName}
        </div>
      </div>
    </div>
  );
}
