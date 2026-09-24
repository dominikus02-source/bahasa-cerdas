"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Phase =
  | "preparing"
  | "lobby"
  | "question"
  | "closed"
  | "discussion"
  | "paused"
  | "summary"
  | "ended"
  | string;

interface SoundSnapshot {
  participantCount: number;
  phase: Phase;
  gameMode: "jelajah-kata" | "kota-cahaya";
  kotaUnlockedCount?: number;
  teamProgress?: Record<string, number>;
}

type Cue =
  | "ready"
  | "join"
  | "start"
  | "close"
  | "reveal"
  | "milestone"
  | "move"
  | "summary";

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const STORAGE_KEY = "mb-sound-muted";

function progressTotal(progress?: Record<string, number>): number {
  if (!progress) return 0;
  return Object.values(progress).reduce(
    (sum, value) => sum + (Number.isFinite(value) ? value : 0),
    0,
  );
}

/**
 * Lightweight WebAudio cue system.
 * No external/copyrighted audio files, no scoring/game-state writes.
 * Browser autoplay policy is respected: audio is unlocked on the first
 * pointer interaction, or explicitly through the sound toggle.
 */
export function useMainBersamaSound(snapshot: SoundSnapshot) {
  const [enabled, setEnabled] = useState(true);
  const contextRef = useRef<AudioContext | null>(null);
  const prevRef = useRef<SoundSnapshot | null>(null);

  useEffect(() => {
    try {
      setEnabled(window.localStorage.getItem(STORAGE_KEY) !== "1");
    } catch {
      setEnabled(true);
    }
  }, []);

  const ensureContext = useCallback(async () => {
    if (typeof window === "undefined") return null;
    const AudioCtor =
      window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!AudioCtor) return null;
    if (!contextRef.current) contextRef.current = new AudioCtor();
    if (contextRef.current.state === "suspended") {
      try {
        await contextRef.current.resume();
      } catch {
        return null;
      }
    }
    return contextRef.current;
  }, []);

  const playTone = useCallback(
    async (
      frequency: number,
      duration: number,
      delay = 0,
      type: OscillatorType = "sine",
      volume = 0.04,
    ) => {
      if (!enabled) return;
      const context = await ensureContext();
      if (!context) return;
      const start = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        start + Math.max(0.04, duration),
      );
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.05);
    },
    [enabled, ensureContext],
  );

  const play = useCallback(
    (cue: Cue) => {
      if (!enabled) return;
      switch (cue) {
        case "ready":
          void playTone(620, 0.08, 0, "triangle", 0.03);
          break;
        case "join":
          void playTone(520, 0.09, 0, "triangle", 0.045);
          void playTone(740, 0.12, 0.075, "sine", 0.035);
          break;
        case "start":
          void playTone(440, 0.1, 0, "triangle", 0.04);
          void playTone(660, 0.11, 0.11, "triangle", 0.045);
          void playTone(880, 0.16, 0.22, "sine", 0.05);
          break;
        case "close":
          void playTone(620, 0.12, 0, "triangle", 0.05);
          void playTone(440, 0.18, 0.11, "triangle", 0.045);
          break;
        case "reveal":
          void playTone(523, 0.1, 0, "sine", 0.04);
          void playTone(659, 0.1, 0.1, "sine", 0.045);
          break;
        case "milestone":
          void playTone(523, 0.11, 0, "sine", 0.045);
          void playTone(659, 0.11, 0.1, "sine", 0.05);
          void playTone(784, 0.2, 0.2, "sine", 0.055);
          break;
        case "move":
          void playTone(480, 0.08, 0, "triangle", 0.035);
          void playTone(610, 0.09, 0.08, "triangle", 0.035);
          break;
        case "summary":
          void playTone(523, 0.14, 0, "sine", 0.05);
          void playTone(659, 0.14, 0.13, "sine", 0.055);
          void playTone(784, 0.14, 0.26, "sine", 0.06);
          void playTone(1047, 0.48, 0.4, "sine", 0.065);
          break;
      }
    },
    [enabled, playTone],
  );

  const unlock = useCallback(async () => {
    if (!enabled) return;
    await ensureContext();
  }, [enabled, ensureContext]);

  const toggle = useCallback(async () => {
    const next = !enabled;
    setEnabled(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "0" : "1");
    } catch {
      // Local preference is optional.
    }
    if (next) {
      await ensureContext();
      setTimeout(() => play("ready"), 0);
    }
  }, [enabled, ensureContext, play]);

  useEffect(() => {
    if (!enabled) return;
    const onPointer = () => {
      void ensureContext();
    };
    document.addEventListener("pointerdown", onPointer, { once: true });
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [enabled, ensureContext]);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = {
      ...snapshot,
      teamProgress: snapshot.teamProgress
        ? { ...snapshot.teamProgress }
        : undefined,
    };
    if (!prev) return;

    if (
      (snapshot.phase === "lobby" || snapshot.phase === "preparing") &&
      snapshot.participantCount > prev.participantCount
    ) {
      play("join");
    }

    if (snapshot.phase !== prev.phase) {
      if (snapshot.phase === "question") play("start");
      else if (snapshot.phase === "closed") play("close");
      else if (snapshot.phase === "discussion") play("reveal");
      else if (snapshot.phase === "summary" || snapshot.phase === "ended")
        play("summary");
    }

    if (
      snapshot.gameMode === "kota-cahaya" &&
      (snapshot.kotaUnlockedCount ?? 0) > (prev.kotaUnlockedCount ?? 0)
    ) {
      play("milestone");
    }

    if (
      snapshot.gameMode === "jelajah-kata" &&
      progressTotal(snapshot.teamProgress) > progressTotal(prev.teamProgress) + 0.01
    ) {
      play("move");
    }
  }, [
    snapshot.participantCount,
    snapshot.phase,
    snapshot.gameMode,
    snapshot.kotaUnlockedCount,
    snapshot.teamProgress,
    play,
  ]);

  return { enabled, toggle, unlock, play };
}
