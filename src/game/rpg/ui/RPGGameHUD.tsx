/**
 * RPG Game HUD — compact prototype-inspired overlay.
 * Presentation only; never mutates RPG state.
 */
interface RPGGameHUDProps {
  name: string; level: number; hp: number; maxHp: number;
  xp: number; xpToNext: number; mapName: string; towerFloor?: number;
}

export function RPGGameHUD({ name, level, hp, maxHp, xp, xpToNext, mapName, towerFloor = 0 }: RPGGameHUDProps) {
  const hpPercent = Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100));
  const xpPercent = xpToNext > 0 ? Math.max(0, Math.min(100, (xp / xpToNext) * 100)) : 0;
  return (
    <div className="pointer-events-none absolute left-2 right-2 top-2 z-10 sm:left-3 sm:right-auto sm:top-3">
      <div className="pointer-events-auto w-full rounded-2xl border border-stone-700/70 bg-stone-950/78 px-3 py-2 text-stone-100 shadow-lg backdrop-blur-md sm:w-[22rem]">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 leading-none">
              <span className="truncate text-xs font-black">{name}</span>
              <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black text-stone-950">Lv.{level}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="w-5 text-[8px] font-black uppercase tracking-wider text-stone-400">HP</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-800"><div className="h-full rounded-full bg-emerald-400 transition-all duration-300" style={{ width: hpPercent + "%" }} /></div>
              <span className="w-12 text-right text-[8px] font-bold text-stone-400">{hp}/{maxHp}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="w-5 text-[8px] font-black uppercase tracking-wider text-stone-400">XP</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-800"><div className="h-full rounded-full bg-sky-400 transition-all duration-300" style={{ width: xpPercent + "%" }} /></div>
              <span className="w-12 text-right text-[8px] font-bold text-stone-400">{xp}/{xpToNext}</span>
            </div>
          </div>
          <div className="hidden shrink-0 border-l border-white/10 pl-2 text-right sm:block">
            <div className="text-[9px] font-bold text-stone-400">Lokasi</div>
            <div className="max-w-24 truncate text-[10px] font-black text-amber-100">{mapName}</div>
            {towerFloor > 0 ? <div className="mt-0.5 text-[9px] font-black text-amber-300">Lantai {towerFloor}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
