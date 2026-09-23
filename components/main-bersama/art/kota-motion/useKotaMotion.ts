"use client";

// ─── Kota Motion 8C.2 — authoritative progress → transient reveal ──
// AUTHORITATIVE PROGRESS: smooth growth → milestone lights up → short
// reveal/glow → stable lit. Sparse, premium, no infinite animation.
//
// Sources (read-only, no fetch/poll/scoring/persistence):
// - progressPercent + unlockedMilestones from public projector view
// - phase for reveal gating (same principle as Jelajah 8C.1)
//
// Semantics:
// - initial mount / reconnect: snap directly (no 0→N replay)
// - unchanged snapshot: no-op (timers untouched → no retrigger)
// - increase + closed|discussion + motion allowed → CSS animates bar
//   (650ms), newly crossed milestones REVEAL staggered (~100ms), settle LIT
// - decrease / correction / other phase / reduced-motion → snap,
//   lit reflects authoritative immediately, no reveal timers
// - rapid updates: version guard + timer cancellation, latest wins,
//   crossed milestones never celebrated twice
// - summary: stable final (consumer renders display-only; hook also
//   snaps when phase !== discussion)

import { useEffect, useRef, useState } from "react";

/** Progress bar travel: smooth growth, ease-out, no bounce. */
export const KOTA_PROGRESS_MS = 650;
/** Single milestone reveal: opacity rise + subtle glow + 0.97→1. */
export const KOTA_MILESTONE_REVEAL_MS = 500;
/** Stagger between milestone reveals on multi-cross jumps. */
export const KOTA_MILESTONE_STAGGER_MS = 100;

/**
 * Fase di mana reveal kelas boleh beranimasi.
 *
 * `closed` WAJIB ikut: engine sesi meng-commit progres Kota pada
 * `close-round` (phase → closed) — bukan pada discuss. Kalau hanya
 * `discussion` yang diizinkan, snapshot pertama yang membawa kenaikan
 * selalu tiba saat phase masih `closed` → snap, dan refetch discuss
 * berikutnya bernilai SAMA → noop. Akibatnya reveal tak pernah main
 * di sesi nyata (dibuktikan pada sesi review 8C.2).
 *
 * `discussion` tetap diizinkan sebagai fallback: bila realtime
 * batching/debounce membuat snapshot naik pertama baru teramati saat
 * phase sudah `discussion`, motion tetap main.
 *
 * Urutan produksi normal: QUESTION → CLOSED (+progres) → MOVE/REVEAL →
 * DISCUSSION (nilai sama) → NOOP (tanpa reveal kedua).
 */
const MOTION_PHASES = new Set(["closed", "discussion"]);

const ORDER = ["garden", "library", "homes", "town-center"];
const ORDER_INDEX: Record<string, number> = {
  garden: 0,
  library: 1,
  homes: 2,
  "town-center": 3,
};

function sameUnlocked(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function sortByThreshold(keys: string[]): string[] {
  return [...keys].sort(
    (a, b) => (ORDER_INDEX[a] ?? 99) - (ORDER_INDEX[b] ?? 99),
  );
}

function detectReduced(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

// ── Pure transition decision (testable without React) ─────────────
// `prev: null` = initial mount/hydration. Callers pass AUTHORITATIVE
// snapshots only; the hook keeps `prev` = last rendered authoritative.

export interface KotaSnapshot {
  progress: number;
  unlocked: string[];
}

export type KotaDecision =
  | { kind: "init" }
  | { kind: "noop" }
  | { kind: "snap" }
  | { kind: "animate"; newly: string[] };

export function decideKotaTransition(
  prev: KotaSnapshot | null,
  next: KotaSnapshot,
  phase: string,
  reduced: boolean,
): KotaDecision {
  if (prev === null) return { kind: "init" };
  const sameProgress = Math.abs(next.progress - prev.progress) < 1e-9;
  if (sameProgress && sameUnlocked(next.unlocked, prev.unlocked)) {
    return { kind: "noop" };
  }
  const increased = next.progress > prev.progress + 1e-9;
  const motionAllowed = !reduced && MOTION_PHASES.has(phase);
  if (!increased || !motionAllowed || reduced) return { kind: "snap" };
  const prevSet = new Set(prev.unlocked);
  const newly = sortByThreshold(next.unlocked.filter((k) => !prevSet.has(k)));
  return { kind: "animate", newly };
}

export interface KotaMotion {
  /** Value to render in the bar (always authoritative; CSS animates). */
  displayedProgress: number;
  /**
   * Nilai AWAL animasi (progres authoritative sebelumnya), atau null bila
   * tidak ada animasi berjalan.
   *
   * Kenapa perlu eksplisit: payoff Kota terjadi saat phase CLOSED, dan
   * cabang fase projector di-unmount/mount ulang (QUESTION → CLOSED →
   * DISCUSSION berbeda subtree). Elemen yang BARU di-mount tidak punya
   * "lebar sebelumnya", jadi `transition: width` tidak akan bergerak —
   * bar langsung muncul di nilai akhir. Dengan `growFrom`, surface baru
   * menganimasikan width dari nilai lama → nilai baru (CSS keyframes),
   * sehingga travel tetap terlihat tanpa memalsukan state.
   */
  growFrom: number | null;
  /** True → CSS width transition/animation 650ms; false → snap. */
  animateProgress: boolean;
  /** Authoritative lit set — info never depends on animation. */
  litMilestones: string[];
  /** Transient REVEAL subset (CSS reveal class); settles to []. */
  revealMilestones: string[];
  isReducedMotion: boolean;
}

export function useKotaMotion(
  progressPercent: number,
  unlockedMilestones: string[],
  phase: string,
): KotaMotion {
  const authProgress = Number.isFinite(progressPercent)
    ? Math.max(0, Math.min(100, progressPercent))
    : 0;
  const authUnlocked = sortByThreshold(
    unlockedMilestones.filter((k) => ORDER.includes(k)),
  );

  const [reduced, setReduced] = useState<boolean>(() => detectReduced());
  const [displayedProgress, setDisplayedProgress] =
    useState<number>(authProgress);
  const [animateProgress, setAnimateProgress] = useState<boolean>(false);
  const [growFrom, setGrowFrom] = useState<number | null>(null);
  const [revealMilestones, setRevealMilestones] = useState<string[]>([]);

  const prevProgressRef = useRef<number | null>(null);
  const prevUnlockedRef = useRef<string[]>(authUnlocked);
  const versionRef = useRef(0);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  // Track OS reduced-motion changes live (classroom projector setting).
  useEffect(() => {
    if (typeof window === "undefined") return;
    let mq: MediaQueryList | null = null;
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    try {
      mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReduced(mq.matches);
      mq.addEventListener("change", onChange);
    } catch {
      return;
    }
    return () => {
      try {
        mq?.removeEventListener("change", onChange);
      } catch {
        /* noop */
      }
    };
  }, []);

  useEffect(() => {
    const clearTimers = () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };

    // ── Initial mount / hydration: snap, no replay, no reveal. ──
    if (prevProgressRef.current === null) {
      prevProgressRef.current = authProgress;
      prevUnlockedRef.current = authUnlocked;
      versionRef.current += 1;
      clearTimers();
      setDisplayedProgress(authProgress);
      setAnimateProgress(false);
      setGrowFrom(null);
      setRevealMilestones([]);
      return;
    }

    const prevSnapshot: KotaSnapshot | null =
      prevProgressRef.current === null
        ? null
        : {
            progress: prevProgressRef.current,
            unlocked: prevUnlockedRef.current,
          };
    const decision = decideKotaTransition(
      prevSnapshot,
      { progress: authProgress, unlocked: authUnlocked },
      phase,
      reduced,
    );

    // ── Duplicate realtime snapshot: no-op, timers untouched. ──
    if (decision.kind === "noop") return;

    versionRef.current += 1;
    const version = versionRef.current;
    clearTimers();

    // Titik awal animasi = progres yang SUDAH tampil di layar (nilai
    // authoritative sebelumnya). Diambil SEBELUM ref dimajukan di bawah.
    const fromProgress = prevProgressRef.current;

    // Always advance refs to latest authoritative — latest wins.
    prevProgressRef.current = authProgress;
    prevUnlockedRef.current = authUnlocked;

    // ── Snap cases: init, decrease/correction, phase-gated off, reduced. ──
    if (decision.kind === "init" || decision.kind === "snap") {
      setDisplayedProgress(authProgress);
      setAnimateProgress(false);
      setGrowFrom(null);
      setRevealMilestones([]);
      return;
    }

    // ── Reveal path: progress grows via CSS 650ms; milestones stagger. ──
    setDisplayedProgress(authProgress);
    setAnimateProgress(true);
    // growFrom hanya selama animasi berjalan → surface yang baru di-mount
    // tetap meng-animasikan travel dari nilai lama, dan setelah settle
    // kembali ke transition biasa (tanpa mengubah tampilan akhir).
    setGrowFrom(fromProgress);
    timersRef.current.push(
      setTimeout(() => {
        if (versionRef.current !== version) return;
        setGrowFrom(null);
      }, KOTA_PROGRESS_MS),
    );

    const newly = decision.kind === "animate" ? decision.newly : [];
    if (newly.length === 0) {
      setRevealMilestones([]);
      return;
    }

    // Stagger REVEAL starts; each holds ~500ms then settles LIT.
    // Rapid-update safe: every timeout checks the version guard.
    newly.forEach((key, i) => {
      const startAt = i * KOTA_MILESTONE_STAGGER_MS;
      const tStart = setTimeout(() => {
        if (versionRef.current !== version) return;
        setRevealMilestones((prev) =>
          prev.includes(key) ? prev : [...prev, key],
        );
        const tEnd = setTimeout(() => {
          if (versionRef.current !== version) return;
          setRevealMilestones((prev) => prev.filter((k) => k !== key));
        }, KOTA_MILESTONE_REVEAL_MS);
        timersRef.current.push(tEnd);
      }, startAt);
      timersRef.current.push(tStart);
    });

    return () => {
      // Update path: next effect body re-clears + reschedules under a new
      // version, so clearing here is redundant but harmless. Unmount path:
      // no stale setState after the projector surface is gone.
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
    // unlocked arrays are re-created per fetch — compare via serialized key
    // to avoid effect churn on identical snapshots.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authProgress, authUnlocked.join("|"), phase, reduced]);

  return {
    displayedProgress,
    growFrom,
    animateProgress,
    litMilestones: authUnlocked,
    revealMilestones,
    isReducedMotion: reduced,
  };
}
