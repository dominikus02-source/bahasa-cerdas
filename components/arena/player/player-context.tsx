"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { PlayerProfileResponse, PlayerProfileView } from "@/lib/gamification/client-types";
import {
  buildRewardEvents,
  enqueueReward,
  sortRewardQueue,
  dequeueReward,
  popupIdentity,
  type RewardPopup,
} from "./reward-queue";
import { isQuiet } from "@/lib/notif-quiet";

export type { RewardPopup };

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
  /** Queue reward popup (terurut prioritas; satu aktif). */
  popups: RewardPopup[];
  /** Level-up aktif untuk dimunculkan modal. */
  levelUp: LevelUpEvent | null;
  /** Rank-up aktif untuk dimunculkan modal (SERIAL setelah level-up). */
  rankUp: RankUpEvent | null;
  enqueuePopup: (popup: Omit<RewardPopup, "id" | "at">) => void;
  dequeuePopup: (id: string) => void;
  dismissLevelUp: () => void;
  dismissRankUp: () => void;
  /** refresh profil; silent=true → perbarui baseline TANPA memicu popup. */
  refresh: (silent?: boolean) => Promise<void>;
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
  // NOTIFICATION 1.0 — hardening:
  const fetchingRef = useRef(false);       // in-flight guard (polling vs focus race)
  const pendingRankRef = useRef<RankUpEvent | null>(null); // serialisasi Level → Rank
  const deferredRef = useRef<RewardPopup[]>([]); // reward selama game quiet mode
  const levelUpRef = useRef(false);        // apakah modal level-up sedang aktif

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
        setPopups((p) =>
          enqueueReward(p, {
            type: "RANK_UP",
            title: `Reward Rank ${data.title}!`,
            body: data.granted.join(", "),
            icon: "🎁",
          })
        );
      }
    } catch {
      // best-effort — jangan menggagalkan UI
    }
  }, []);

  const fetchProfile = useCallback(
    async (silent = false) => {
      if (fetchingRef.current) return; // anti race polling/focus
      fetchingRef.current = true;
      try {
        const res = await fetch("/api/player/profile", { cache: "no-store" });
        if (!res.ok) throw new Error("Gagal memuat profil");
        const data = (await res.json()) as PlayerProfileResponse;
        const prev = prevProfileRef.current;

        setProfile((current) => {
          if (prev && !silent) {
            // Level-up detection — hanya dari perbandingan nyata.
            if (prev.level < data.profile.level) {
              levelUpRef.current = true;
              setLevelUp({
                levelBefore: prev.level,
                levelAfter: data.profile.level,
                rankLabel: data.profile.rankLabel,
                rankColor: data.profile.rankColor,
              });
            }
            // Rank-up detection — SERIAL setelah level-up (P0 tidak bertabrakan).
            if (prev.rank !== data.profile.rank) {
              const evt: RankUpEvent = {
                rankBefore: prev.rank,
                rankLabelBefore: prev.rankLabel,
                rankAfter: data.profile.rank,
                rankLabel: data.profile.rankLabel,
                rankTitle: data.profile.rankTitle,
                rankColor: data.profile.rankColor,
              };
              if (levelUpRef.current) {
                pendingRankRef.current = evt;
              } else {
                setRankUp(evt);
                void redeemRankRewards(data.profile.rank);
              }
            }

            // XP + Coin gain → SATU event reward gabungan (dedupe identity).
            const xpGain = prev.totalXp !== 0 && data.profile.totalXp > prev.totalXp
              ? data.profile.totalXp - prev.totalXp
              : 0;
            const coinGain = data.profile.coin > prev.coin ? data.profile.coin - prev.coin : 0;
            if (xpGain > 0 || coinGain > 0) {
              const events = buildRewardEvents(xpGain, coinGain, "Aktivitas belajarmu");
              setPopups((p) => {
                let next = p;
                for (const ev of events) next = enqueueReward(next, ev);
                return sortRewardQueue(next);
              });
            }
          }
          return data;
        });

        prevProfileRef.current = data.profile;
        setLastUpdated(new Date());
        setError(null);

        // Flush reward yang tertahan selama game quiet mode (reward tidak hilang).
        if (!isQuiet() && deferredRef.current.length > 0) {
          const deferred = deferredRef.current;
          deferredRef.current = [];
          setPopups((p) => sortRewardQueue([...p, ...deferred]));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
        fetchedRef.current = true;
        fetchingRef.current = false;
      }
    },
    [redeemRankRewards]
  );

  useEffect(() => {
    fetchProfile();
    const id = setInterval(() => fetchProfile(), POLL_INTERVAL);
    const onFocus = () => fetchProfile();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchProfile]);

  const enqueuePopup = useCallback((popup: Omit<RewardPopup, "id" | "at">) => {
    const identity = popupIdentity(popup);
    // Game quiet mode: reward tetap di-queue, tampil setelah gameplay selesai.
    if (isQuiet()) {
      deferredRef.current = enqueueReward(deferredRef.current, popup);
      return;
    }
    setPopups((p) => {
      const duplicate = p.some((q) => q.id === identity && Date.now() - (q.at ?? 0) < 5000);
      if (duplicate) return p;
      return sortRewardQueue([...p, { ...popup, id: identity, at: Date.now() }]);
    });
  }, []);

  const dequeuePopup = useCallback((id: string) => {
    setPopups((p) => dequeueReward(p, id));
  }, []);

  const dismissLevelUp = useCallback(() => {
    setLevelUp(null);
    levelUpRef.current = false;
    // Serialisasi P0: Rank-up yang tertahan muncul SETELAH level-up selesai.
    const pending = pendingRankRef.current;
    if (pending) {
      pendingRankRef.current = null;
      setRankUp(pending);
      void redeemRankRewards(pending.rankAfter);
    }
  }, [redeemRankRewards]);

  const dismissRankUp = useCallback(() => setRankUp(null), []);
  const refresh = useCallback((silent = false) => fetchProfile(silent), [fetchProfile]);

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
