"use client";

import { useRef, useEffect, useState, useCallback } from "react";

type TeamId = "elang" | "harimau" | "rusa" | "badak";
type Pose = "ready" | "move" | "celebrate";

interface TrailPose {
  pose: Pose;
  boosted: boolean;
}

/**
 * 8C.1 — Jelajah motion state machine.
 *
 * Sequence per advancing team:  READY → MOVE (travel 600ms) → CELEBRATE (800ms) → READY
 * Travel happens in CSS (transform transition 600ms). JS only advances the
 * pose state at the correct moment, so CELEBRATE never overlaps travel.
 *
 * Phase-gated: motion ONLY during "discussion".
 * Reduced-motion: skips timers, poses immediately return to READY (deterministic).
 */
const TRAVEL_MS = 600;
const CELEBRATE_MS = 800;
const MOTION_PHASES = new Set(["discussion"]);

export { TRAVEL_MS, CELEBRATE_MS };

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useTrailMotion(
  progress: Record<string, number>,
  phase: string,
) {
  const prevRef = useRef<Record<string, number>>({});
  const isFirstRef = useRef(true);
  const [poses, setPoses] = useState<Record<string, TrailPose>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const current: Record<string, TrailPose> = {};
    const prev = prevRef.current;
    const isInitial = isFirstRef.current;
    if (isInitial) isFirstRef.current = false;

    const motionAllowed = !REDUCED && MOTION_PHASES.has(phase);
    const TEAMS: TeamId[] = ["elang", "harimau", "rusa", "badak"];

    for (const team of TEAMS) {
      const prevP = prev[team] ?? 0;
      const nextP = progress[team] ?? 0;
      // Phase-gated + reconnect-safe: no animation on first render.
      const increased = !isInitial && nextP > prevP && motionAllowed;
      current[team] = {
        pose: increased ? "move" : "ready",
        boosted: increased,
      };
    }

    if (motionAllowed) {
      TEAMS.forEach((team) => {
        if (current[team].boosted) {
          // Interrupt-safe: clear any stale timer for this team before scheduling.
          if (timersRef.current[team]) clearTimeout(timersRef.current[team]);

          // After TRAVEL_MS, marker has arrived → switch to CELEBRATE.
          timersRef.current[team] = setTimeout(() => {
            setPoses((prev) => {
              const existing = prev[team];
              if (!existing?.boosted) return prev; // stale guard
              return { ...prev, [team]: { ...existing, pose: "celebrate" } };
            });
            // After CELEBRATE_MS, return to READY.
            timersRef.current[team] = setTimeout(() => {
              setPoses((prev) => {
                const existing = prev[team];
                if (!existing?.boosted) return prev; // stale guard
                return { ...prev, [team]: { ...existing, pose: "ready", boosted: false } };
              });
              delete timersRef.current[team];
            }, CELEBRATE_MS);
          }, TRAVEL_MS);
        }
      });
    }

    prevRef.current = { ...progress };
    setPoses(current);

    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
      timersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, phase]);

  const getPose = useCallback(
    (team: string): Pose => poses[team]?.pose ?? "ready",
    [poses],
  );

  return { getPose };
}
