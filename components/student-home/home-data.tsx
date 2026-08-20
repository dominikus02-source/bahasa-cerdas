"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PlayerProfileResponse } from "@/lib/gamification/client-types";
import type { LearnerSkillState } from "@/lib/learner-state/types";

export interface MeUser {
  displayName?: string;
  fullName?: string;
  avatar?: string;
  school?: string;
  city?: string;
  equippedNameColor?: string | null;
  equippedBadge?: string | null;
}

export interface SummaryRow {
  pengumuman: { id: string; judul: string; guru: string; createdAt: string; link: string }[];
  materi: { id: string; judul: string; guru: string; link: string }[];
  totalTugas: number;
}

export interface MyDayResponse {
  mode: "PREVIEW" | "FALLBACK";
  actionType: "ADAPTIVE_PRACTICE" | "DIAGNOSTIC" | "GENERAL_LEARNING";
  actionTitle: string;
  ctaLabel: string;
  targetSkill: string | null;
  targetSubskill: string | null;
  targetDifficulty: string | null;
  sessionSize: number | null;
  reasonCode: string;
  reasonText: string;
  estimatedMinutes: number | null;
  confidence: "NO_DATA" | "LOW" | "MEDIUM" | "HIGH";
  premiumDepth: "STANDARD";
  selectionVersion: string;
  learnerState: LearnerSkillState[];
  mentor: {
    name: string;
    insights: string[];
    today: { activities: number; xp: number; coin: number };
  } | null;
  /** STEP 4E.2 — lapisan personalisasi server-derived ("Kenapa latihan ini?"). */
  personalization?: PersonalizedLearningAction | null;
  /** STEP 4E.2 — pernah menyelesaikan diagnostik (state B vs C di kartu). */
  diagnosticCompleted?: boolean;
  /** BC Assessment Engine 2.0 — canonical assessment state. */
  assessmentState?: string;
  /** STEP 4E.2 — info STATE A: durasi jujur + skill yang benar-benar diuji. */
  durationLabel?: string;
  skillsLabel?: string;
  /** Gerbang "Segera Hadir" — entri Tes Awal AI ditandai server saat soal belum siap produksi. */
  comingSoon?: boolean;
}

export interface PersonalizedLearningAction {
  actionType: "PERSONALIZED_PRACTICE" | "CONTINUE_EVIDENCE";
  targetSkill: string | null;
  targetSkillLabel: string | null;
  reasonCode: string;
  title: string;
  explanation: string;
  confidence: string;
  source: string;
  recommendation: "EASY" | "MEDIUM" | "HARD" | null;
}

/**
 * MURID HOME 3.0 — bar akurasi skill target di kartu Next Best Action.
 * Murni turunan dari data preview yang sudah ada (tidak ada fetch baru):
 * myDay.personalization.targetSkill → entri learnerState yang bersesuaian.
 */
export function findFocusSkillRow(myDay: MyDayResponse | null): LearnerSkillState | null {
  const target = myDay?.personalization?.targetSkill;
  const rows = myDay?.learnerState ?? [];
  if (!target || rows.length === 0) return null;
  return rows.find((row) => row.skill === target) ?? null;
}

export interface PremiumStatus {
  plan?: string;
  subscriptionStatus?: string | null;
  usage?: Record<string, { used: number; limit: number; remaining: number }>;
}

interface HomeDataValue {
  profile: PlayerProfileResponse | null;
  me: MeUser | null;
  summary: SummaryRow | null;
  myDay: MyDayResponse | null;
  premium: PremiumStatus | null;
  profileFailed: boolean;
  summaryFailed: boolean;
  myDayLoading: boolean;
  myDayFailed: boolean;
  premiumLoading: boolean;
  premiumFailed: boolean;
  refresh: () => void;
  refreshMyDay: () => void;
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
  const [myDay, setMyDay] = useState<MyDayResponse | null>(null);
  const [premium, setPremium] = useState<PremiumStatus | null>(null);
  const [profileFailed, setProfileFailed] = useState(false);
  const [summaryFailed, setSummaryFailed] = useState(false);
  const [myDayLoading, setMyDayLoading] = useState(true);
  const [myDayFailed, setMyDayFailed] = useState(false);
  const [premiumLoading, setPremiumLoading] = useState(true);
  const [premiumFailed, setPremiumFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [myDayAttempt, setMyDayAttempt] = useState(0);

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

  useEffect(() => {
    let alive = true;
    setMyDayLoading(true);
    setMyDayFailed(false);
    setPremiumLoading(true);
    setPremiumFailed(false);
    Promise.allSettled([
      fetch("/api/player/adaptive-practice?mode=preview").then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/player/diagnostic?mode=preview").then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/player/premium/status").then((r) => (r.ok ? r.json() : Promise.reject())),
    ]).then(([myDayResult, diagnosticResult, premiumResult]) => {
      if (!alive) return;
      const adaptiveValue = myDayResult.status === "fulfilled" ? (myDayResult.value as MyDayResponse | null) : null;
      const diagnosticValue = diagnosticResult.status === "fulfilled" ? (diagnosticResult.value as MyDayResponse | null) : null;
      const chosen =
        adaptiveValue && adaptiveValue.actionType === "ADAPTIVE_PRACTICE"
          ? adaptiveValue
          : diagnosticValue && diagnosticValue.actionType === "DIAGNOSTIC"
            ? diagnosticValue
            : adaptiveValue;
      if (chosen) {
        setMyDay(chosen);
        setMyDayFailed(false);
      } else {
        setMyDayFailed(true);
      }
      setMyDayLoading(false);
      if (premiumResult.status === "fulfilled") {
        setPremium(premiumResult.value);
        setPremiumFailed(false);
      } else {
        setPremiumFailed(true);
      }
      setPremiumLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [myDayAttempt]);

  const refresh = useCallback(() => setAttempt((a) => a + 1), []);
  const refreshMyDay = useCallback(() => setMyDayAttempt((a) => a + 1), []);

  const value = useMemo(
    () => ({ profile, me, summary, myDay, premium, profileFailed, summaryFailed, myDayLoading, myDayFailed, premiumLoading, premiumFailed, refresh, refreshMyDay }),
    [profile, me, summary, myDay, premium, profileFailed, summaryFailed, myDayLoading, myDayFailed, premiumLoading, premiumFailed, refresh, refreshMyDay]
  );

  return <HomeDataContext.Provider value={value}>{children}</HomeDataContext.Provider>;
}

export function useHomeData(): HomeDataValue {
  const ctx = useContext(HomeDataContext);
  if (!ctx) throw new Error("useHomeData harus dipakai di dalam HomeDataProvider");
  return ctx;
}
