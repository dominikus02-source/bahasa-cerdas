/**
 * RPGBattle — battle panel for the P1.9C vertical slice.
 *
 * PURE presentation over BattleViewModel (no HP/damage/XP math, no state
 * ownership): buttons emit intents (onAttack/onUseItem/onFlee); the engine
 * validates + resolves authoritatively. Enemy presence, bars, and menus
 * render from the snapshot; skill unlock/MP and item counts are display
 * gating only (core re-validates everything).
 *
 * Mobile-first: min 48px targets, single column, no horizontal overflow.
 * Mounted only while a battle is active; the world canvas stays mounted
 * behind it (battle remains contextually present).
 */

"use client";

import { useState } from "react";
import type { BattleViewModel } from "./battle-view";
import { itemIconFor } from "../rendering/tile-visuals";
import { manifestLookup } from "../rendering/rpg-asset-manifest";

/** READY icon URL for a canonical item id, or null (text-only button). */
function itemIconUrl(itemId: string): string | null {
  const assetId = itemIconFor(itemId);
  if (!assetId) return null;
  const entry = manifestLookup(assetId);
  if (!entry || entry.status !== "READY") return null;
  return entry.path;
}

export interface RPGBattleProps {
  battle: BattleViewModel;
  onAttack: (skillId: string) => void;
  onUseItem: (itemId: string) => void;
  onFlee: () => void;
}

export function RPGBattle({ battle, onAttack, onUseItem, onFlee }: RPGBattleProps) {
  const [menu, setMenu] = useState<"main" | "skill" | "item">("main");
  const enemyPercent = battle.enemyMaxHp > 0
    ? Math.max(0, Math.min(100, (battle.enemyHp / battle.enemyMaxHp) * 100))
    : 0;
  const playerPercent = battle.playerMaxHp > 0
    ? Math.max(0, Math.min(100, (battle.playerHp / battle.playerMaxHp) * 100))
    : 0;

  const btn =
    "min-h-12 w-full rounded-xl border-2 border-[var(--game-border-light)] px-3 font-black transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:hover:translate-y-0";

  return (
    <div
      role="group"
      aria-label="Pertarungan"
      className="absolute inset-x-0 bottom-0 z-10 px-3 pb-3 pt-10 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-md rounded-2xl border-2 border-[var(--game-border-light)] bg-[var(--game-surface)] shadow-xl p-4">
        {/* Enemy presence */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-base font-black text-[var(--game-text)]">
            {battle.enemyName}
            {battle.isBoss ? (
              <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                Bos
              </span>
            ) : null}
          </p>
          <p className="text-xs font-bold text-[var(--game-text-muted)]">
            HP {battle.enemyHp}/{battle.enemyMaxHp}
          </p>
        </div>
        <div
          className="mt-1 h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
          role="progressbar"
          aria-label={`HP musuh ${battle.enemyHp} dari ${battle.enemyMaxHp}`}
          aria-valuenow={battle.enemyHp}
          aria-valuemin={0}
          aria-valuemax={battle.enemyMaxHp}
        >
          <div className="h-full bg-red-500 rounded-full transition-all duration-300" style={{ width: `${enemyPercent}%` }} />
        </div>

        {/* Player vitals (snapshot display only) */}
        <div className="mt-2 flex items-center justify-between gap-2 text-xs font-bold text-[var(--game-text-secondary)]">
          <span>
            HP {battle.playerHp}/{battle.playerMaxHp}
          </span>
          <span>
            MP {battle.playerMp}/{battle.playerMaxMp}
          </span>
          <span>Giliran {battle.turn}</span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div className="h-full bg-[var(--game-success)] rounded-full transition-all duration-300" style={{ width: `${playerPercent}%` }} />
        </div>

        {/* Actions */}
        {menu === "main" ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onAttack("basic")} className={`${btn} bg-[var(--game-primary)] text-white text-sm`}>
              ⚔️ Serang
            </button>
            <button type="button" onClick={() => setMenu("skill")} className={`${btn} bg-white text-slate-900 text-sm dark:bg-slate-800 dark:text-white`}>
              ✨ Jurus
            </button>
            <button type="button" onClick={() => setMenu("item")} className={`${btn} bg-white text-slate-900 text-sm dark:bg-slate-800 dark:text-white`}>
              🎒 Barang
            </button>
            <button type="button" onClick={onFlee} disabled={!battle.canFlee} title={battle.canFlee ? "Kabur dari pertarungan" : "Tidak bisa kabur dari bos"} className={`${btn} bg-white text-slate-900 text-sm dark:bg-slate-800 dark:text-white`}>
              🏃 Kabur
            </button>
          </div>
        ) : null}

        {menu === "skill" ? (
          <div className="mt-3 grid gap-2">
            {battle.skills.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={!s.unlocked || !s.affordable}
                onClick={() => onAttack(s.id)}
                className={`${btn} bg-white text-left text-sm text-slate-900 dark:bg-slate-800 dark:text-white`}
              >
                {s.name} <span className="opacity-60">· {s.mpCost} MP{s.unlocked ? "" : " · terkunci"}</span>
              </button>
            ))}
            <button type="button" onClick={() => setMenu("main")} className={`${btn} bg-transparent text-sm text-[var(--game-text-muted)]`}>
              ← Kembali
            </button>
          </div>
        ) : null}

        {menu === "item" ? (
          <div className="mt-3 grid gap-2">
            {battle.items.length === 0 ? (
              <p className="text-sm font-bold text-[var(--game-text-muted)]">Tas kosong — kalahkan musuh atau buka peti untuk bekal.</p>
            ) : null}
            {battle.items.map((it) => {
              const icon = itemIconUrl(it.id);
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => onUseItem(it.id)}
                  className={`${btn} bg-white text-left text-sm text-slate-900 dark:bg-slate-800 dark:text-white flex items-center gap-2.5`}
                >
                  {icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={icon} alt="" aria-hidden width={32} height={32} className="shrink-0 rounded-lg" />
                  ) : null}
                  <span>
                    {it.name} <span className="opacity-60">×{it.quantity}</span>
                  </span>
                </button>
              );
            })}
            <button type="button" onClick={() => setMenu("main")} className={`${btn} bg-transparent text-sm text-[var(--game-text-muted)]`}>
              ← Kembali
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
