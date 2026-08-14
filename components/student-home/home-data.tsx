"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PlayerProfileResponse } from "@/lib/gamification/client-types";

export interface MeUser {
  displayName?: string;
  fullName?: string;
  avatar?: string;
  school?: string;
  city?: string;
}

export interface SummaryRow {
  pengumuman: { id: string; judul: string; guru: string; createdAt: string; link: string }[];
  materi: { id: string; judul: string; guru: string; link: string }[];
  totalTugas: number;
}

interface HomeDataValue {
  profile: PlayerProfileResponse | null;
  me: MeUser | null;
  summary: SummaryRow | null;
  profileFailed: boolean;
  summaryFailed: boolean;
  refresh: () => void;
}

const HomeDataContext = createContext<HomeDataValue | null>(null);

/**
 * Sumber data bersama Student Home — satu fetch per sumber untuk SEMUA seksi
 * (sebelumnya /api/murid/dashboard/summary di-fetch 2×, /api/player/profile
 * hanya untuk hero). Kegagalan satu sumber TIDAK menggagalkan sumber lain.
 */
export function HomeDataProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfileResponse | null>(null);
  const [me, setMe] = useState<MeUser | null>(null);
  const [summary, setSummary] = useState<SummaryRow | null>(null);
  const [profileFailed, setProfileFailed] = useState(false);
  const [summaryFailed, setSummaryFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      fetch("/api/player/profile").then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/user/me").then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/murid/dashboard/summary").then((r) => (r.ok ? r.json() : Promise.reject())),
    ]).then(([p, m, s]) => {
      if (!alive) return;
      if (p.status === "fulfilled") {
        setProfile(p.value);
        setProfileFailed(false);
      } else {
        setProfileFailed(true);
      }
      if (m.status === "fulfilled") {
        setMe(m.value?.user || m.value?.data?.user || null);
      }
      if (s.status === "fulfilled") {
        setSummary(s.value);
        setSummaryFailed(false);
      } else {
        setSummaryFailed(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const refresh = useCallback(() => setAttempt((a) => a + 1), []);

  const value = useMemo(
    () => ({ profile, me, summary, profileFailed, summaryFailed, refresh }),
    [profile, me, summary, profileFailed, summaryFailed, refresh]
  );

  return <HomeDataContext.Provider value={value}>{children}</HomeDataContext.Provider>;
}

export function useHomeData(): HomeDataValue {
  const ctx = useContext(HomeDataContext);
  if (!ctx) throw new Error("useHomeData harus dipakai di dalam HomeDataProvider");
  return ctx;
}
