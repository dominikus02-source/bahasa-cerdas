/**
 * NOTIFICATION SYSTEM 1.0 — reward queue (logika MURNI, tanpa React).
 *
 * Satu FIFO reward queue dengan:
 * - event identity STABIL (bukan Date.now): `${type}:${title}:${amount}:${body}`
 * - dedupe window: event dengan identity sama dalam 5 detik TIDAK di-enqueue
 * - prioritas P0 (level/rank) > P1 (reward/XP/coin) > P2 (badge/achievement/quest)
 * - auto-dismiss: transient reward ±4 dtk, P0 ±6 dtk
 *
 * Dipakai PlayerContext (state React) — fungsi di sini murni agar bisa diuji
 * tanpa DOM/React.
 */

export type RewardPopupType = "XP" | "COIN" | "REWARD" | "BADGE" | "ACHIEVEMENT" | "LEVEL_UP" | "RANK_UP";

export interface RewardPopup {
  id: string;
  type: RewardPopupType;
  title: string;
  body?: string;
  icon?: string;
  amount?: number;
  xp?: number;
  coin?: number;
  /** Waktu enqueue (epoch ms) — untuk dedupe & auto-dismiss. */
  at?: number;
}

export const POPUP_DURATION_MS = 4000;
export const POPUP_P0_DURATION_MS = 6000;
export const DEDUPE_WINDOW_MS = 5000;

/** Prioritas: 0 = tertinggi (Level/Rank) — queue aktif = prioritas teratas. */
export function popupPriority(type: RewardPopupType): number {
  switch (type) {
    case "LEVEL_UP":
    case "RANK_UP":
      return 0;
    case "REWARD":
    case "XP":
    case "COIN":
      return 1;
    case "BADGE":
    case "ACHIEVEMENT":
      return 2;
    default:
      return 3;
  }
}

export function popupDuration(type: RewardPopupType): number {
  return popupPriority(type) === 0 ? POPUP_P0_DURATION_MS : POPUP_DURATION_MS;
}

/** Identity STABIL — sama untuk event logis yang sama (bukan Date.now). */
export function popupIdentity(p: Omit<RewardPopup, "id" | "at">): string {
  return [p.type, p.title, p.amount ?? p.xp ?? "", p.coin ?? "", p.body ?? ""]
    .map((x) => String(x).trim())
    .join(":");
}

/** Enqueue satu event: beri id stabil + timestamp; lewati bila duplikat. */
export function enqueueReward(
  queue: RewardPopup[],
  next: Omit<RewardPopup, "id" | "at">,
  now = Date.now()
): RewardPopup[] {
  const id = popupIdentity(next);
  const duplicate = queue.some((q) => q.id === id && now - (q.at ?? 0) < DEDUPE_WINDOW_MS);
  if (duplicate) return queue;
  return [...queue, { ...next, id, at: now }];
}

/** Queue terurut prioritas: P0 di depan, sisanya FIFO per prioritas. */
export function sortRewardQueue(queue: RewardPopup[]): RewardPopup[] {
  return [...queue].sort((a, b) => {
    const pa = popupPriority(a.type) - popupPriority(b.type);
    if (pa !== 0) return pa;
    return (a.at ?? 0) - (b.at ?? 0);
  });
}

export function dequeueReward(queue: RewardPopup[], id: string): RewardPopup[] {
  return queue.filter((q) => q.id !== id);
}

export interface CombinedReward {
  xp: number;
  coin: number;
  source: string;
}

/**
 * Bangun SATU event reward dari diff profil: bila XP & koin naik bersamaan
 * (event logis yang sama) → satu popup "Reward Didapat" dengan dua nilai.
 */
export function buildRewardEvents(
  xpGain: number,
  coinGain: number,
  source: string
): Array<Omit<RewardPopup, "id" | "at">> {
  if (xpGain > 0 && coinGain > 0) {
    return [
      {
        type: "REWARD",
        title: "Reward Didapat",
        body: source,
        icon: "✨",
        xp: xpGain,
        coin: coinGain,
      },
    ];
  }
  if (xpGain > 0) {
    return [{ type: "XP", title: `+${xpGain} XP`, body: source, icon: "⚡", amount: xpGain }];
  }
  if (coinGain > 0) {
    return [{ type: "COIN", title: `+${coinGain} Koin`, body: source, icon: "🪙", amount: coinGain }];
  }
  return [];
}
