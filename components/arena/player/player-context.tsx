"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { PlayerProfileResponse, PlayerProfileView } from "@/lib/gamification/client-types";

export interface RewardPopup {
  id: string;
  type: "XP" | "COIN" | "BADGE" | "ACHIEVEMENT" | "LEVEL_UP" | "RANK_UP";
  title: string;
  body?: string;
  icon?: string;
  amount?: number;
}

export interface LevelUpEvent {
  levelBefore: number;
  levelAfter: number;
  rankLabel: string;
  rankColor: string;
}

export interface RankUpEvent {
  rankBefore: string;
  rankLabelBefore: string;
  rankAfter: string;
  rankLabel: string;
  rankTitle: string;
  rankColor: string;
}

interface PlayerContextValue {
  profile: PlayerProfileResponse | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  /** Queue reward popup. */
  popups: RewardPopup[];
  /** Level-up aktif untuk dimunculkan modal. */
  levelUp: LevelUpEvent | null;
  /** Rank-up aktif untuk dimunculkan modal. */
  rankUp: RankUpEvent | null;
  enqueuePopup: (popup: Omit<RewardPopup, "id">) => void;
  dequeuePopup: (id: string) => void;
  dismissLevelUp: () => void;
  dismissRankUp: () => void;
  refresh: () => Promise<void>;
  /** Label: waktu terakhir refresh. */
  isStale: boolean;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

const POLL_INTERVAL = 20_000;

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [popups, setPopups] = useState<RewardPopup[]>([]);
  const [levelUp, setLevelUp] = useState<LevelUpEvent | null>(null);
  const [rankUp, setRankUp] = useState<RankUpEvent | null>(null);
  const prevProfileRef = useRef<PlayerProfileView | null>(null);
  const fetchedRef = useRef(false);

  /** Klaim reward rank baru secara server-side (best-effort, idempotent). */
  const redeemRankRewards = useCallback(async (rank: string) => {
    try {
      const res = await fetch("/api/player/rank-up/redeem", { method: "POST" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        rank: string;
        title: string;
        granted: string[];
        hasNewRewards: boolean;
      };
      if (data.hasNewRewards && data.granted.length > 0) {
        setPopups((p) => [
          ...p,
          {
            id: `rankrewards-${Date.now()}`,
            type: "RANK_UP",
            title: `Reward Rank ${data.title}!`,
            body: data.granted.join(", "),
            icon: "🎁",
          },
        ]);
      }
    } catch {
      // best-effort — jangan menggagalkan UI
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/player/profile", { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat profil");
      const data = (await res.json()) as PlayerProfileResponse;
      const prev = prevProfileRef.current;

      setProfile((current) => {
        // Level-up detection — hanya dari perbandingan nyata.
        if (prev && prev.level < data.profile.level) {
          setLevelUp({
            levelBefore: prev.level,
            levelAfter: data.profile.level,
            rankLabel: data.profile.rankLabel,
            rankColor: data.profile.rankColor,
          });
        }
        // Rank-up detection — bandingkan rank lintas refresh, trigger reward.
        if (prev && prev.rank !== data.profile.rank) {
          setRankUp({
            rankBefore: prev.rank,
            rankLabelBefore: prev.rankLabel,
            rankAfter: data.profile.rank,
            rankLabel: data.profile.rankLabel,
            rankTitle: data.profile.rankTitle,
            rankColor: data.profile.rankColor,
          });
          void redeemRankRewards(data.profile.rank);
        }
        // XP gain detection → popup reward.
        if (prev && data.profile.totalXp > prev.totalXp && prev.totalXp !== 0) {
          const gain = data.profile.totalXp - prev.totalXp;
          setPopups((p) => [
            ...p,
            { id: `xp-${Date.now()}`, type: "XP", title: `+${gain} XP`, body: "XP diterima!", icon: "⚡", amount: gain },
          ]);
        }
        // Coin gain detection → popup reward.
        if (prev && data.profile.coin > prev.coin) {
          const gain = data.profile.coin - prev.coin;
          setPopups((p) => [
            ...p,
            { id: `coin-${Date.now()}`, type: "COIN", title: `+${gain} Koin`, body: "Koin bertambah!", icon: "🪙", amount: gain },
          ]);
        }
        return data;
      });

      prevProfileRef.current = data.profile;
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
      fetchedRef.current = true;
    }
  }, [redeemRankRewards]);

  useEffect(() => {
    fetchProfile();
    const id = setInterval(fetchProfile, POLL_INTERVAL);
    const onFocus = () => fetchProfile();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchProfile]);

  const enqueuePopup = useCallback((popup: Omit<RewardPopup, "id">) => {
    setPopups((p) => [...p, { ...popup, id: `${popup.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }]);
  }, []);

  const dequeuePopup = useCallback((id: string) => {
    setPopups((p) => p.filter((x) => x.id !== id));
  }, []);

  const dismissLevelUp = useCallback(() => setLevelUp(null), []);
  const dismissRankUp = useCallback(() => setRankUp(null), []);
  const refresh = useCallback(() => fetchProfile(), [fetchProfile]);

  const isStale = profile !== null && lastUpdated !== null && Date.now() - lastUpdated.getTime() > POLL_INTERVAL * 3;

  return (
    <PlayerContext.Provider
      value={{ profile, loading, error, lastUpdated, popups, levelUp, rankUp, enqueuePopup, dequeuePopup, dismissLevelUp, dismissRankUp, refresh, isStale }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer harus dipakai di dalam <PlayerProvider>");
  return ctx;
}

export function usePlayerProfile(): PlayerProfileView | null {
  return usePlayer().profile?.profile ?? null;
}
