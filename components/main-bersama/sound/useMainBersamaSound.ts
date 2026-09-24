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

let sharedAudioContext: AudioContext | null = null;

function progressTotal(progress?: Record<string, number>): number {
  if (!progress) return 0;
  return Object.values(progress).reduce(
    (sum, value) => sum + (Number.isFinite(value) ? value : 0),
    0,
  );
}

function audioCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return window.AudioContext ?? (window as AudioWindow).webkitAudioContext ?? null;
}

async function ensureSharedContext(): Promise<AudioContext | null> {
  const AudioCtor = audioCtor();
  if (!AudioCtor) return null;
  if (!sharedAudioContext || sharedAudioContext.state === "closed") {
    sharedAudioContext = new AudioCtor();
  }
  if (sharedAudioContext.state === "suspended") {
    try {
      await sharedAudioContext.resume();
    } catch {
      return null;
    }
  }
  return sharedAudioContext;
}

function scheduleTone(
  context: AudioContext,
  frequency: number,
  duration: number,
  delay = 0,
  type: OscillatorType = "sine",
  volume = 0.075,
) {
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    start + Math.max(0.05, duration),
  );
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.06);
}

function scheduleCue(context: AudioContext, cue: Cue) {
  switch (cue) {
    case "ready":
      scheduleTone(context, 660, 0.1, 0, "triangle", 0.075);
      scheduleTone(context, 880, 0.14, 0.08, "sine", 0.07);
      break;
    case "join":
      scheduleTone(context, 520, 0.09, 0, "triangle", 0.08);
      scheduleTone(context, 740, 0.13, 0.075, "sine", 0.07);
      break;
    case "start":
      scheduleTone(context, 440, 0.1, 0, "triangle", 0.075);
      scheduleTone(context, 660, 0.11, 0.11, "triangle", 0.085);
      scheduleTone(context, 880, 0.2, 0.22, "sine", 0.09);
      break;
    case "close":
      scheduleTone(context, 620, 0.12, 0, "triangle", 0.085);
      scheduleTone(context, 440, 0.2, 0.11, "triangle", 0.075);
      break;
    case "reveal":
      scheduleTone(context, 523, 0.1, 0, "sine", 0.07);
      scheduleTone(context, 659, 0.12, 0.1, "sine", 0.08);
      break;
    case "milestone":
      scheduleTone(context, 523, 0.11, 0, "sine", 0.075);
      scheduleTone(context, 659, 0.11, 0.1, "sine", 0.085);
      scheduleTone(context, 784, 0.24, 0.2, "sine", 0.095);
      break;
    case "move":
      scheduleTone(context, 480, 0.08, 0, "triangle", 0.065);
      scheduleTone(context, 610, 0.1, 0.08, "triangle", 0.07);
      break;
    case "summary":
      scheduleTone(context, 523, 0.14, 0, "sine", 0.08);
      scheduleTone(context, 659, 0.14, 0.13, "sine", 0.085);
      scheduleTone(context, 784, 0.14, 0.26, "sine", 0.09);
      scheduleTone(context, 1047, 0.5, 0.4, "sine", 0.1);
      break;
  }
}

export function useMainBersamaSound(snapshot: SoundSnapshot) {
  const {
    participantCount,
    phase,
    gameMode,
    kotaUnlockedCount = 0,
    teamProgress,
  } = snapshot;
  const [enabled, setEnabled] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const prevRef = useRef<SoundSnapshot | null>(null);

  const syncUnlocked = useCallback(() => {
    setUnlocked(sharedAudioContext?.state === "running");
  }, []);

  useEffect(() => {
    try {
      setEnabled(window.localStorage.getItem(STORAGE_KEY) !== "1");
    } catch {
      setEnabled(true);
    }
    syncUnlocked();

    const context = sharedAudioContext;
    if (!context) return;
    const onState = () => syncUnlocked();
    context.addEventListener("statechange", onState);
    return () => context.removeEventListener("statechange", onState);
  }, [syncUnlocked]);

  const activate = useCallback(async () => {
    setEnabled(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "0");
    } catch {
      // Preference persistence is optional.
    }
    const context = await ensureSharedContext();
    const ready = context?.state === "running";
    setUnlocked(ready);
    if (context && ready) scheduleCue(context, "ready");
    return ready;
  }, []);

  const play = useCallback(
    async (cue: Cue) => {
      if (!enabled) return;
      const context = await ensureSharedContext();
      const ready = context?.state === "running";
      setUnlocked(ready);
      if (!context || !ready) return;
      scheduleCue(context, cue);
    },
    [enabled],
  );

  const toggle = useCallback(async () => {
    if (!enabled || !unlocked) {
      await activate();
      return;
    }
    setEnabled(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Preference persistence is optional.
    }
  }, [activate, enabled, unlocked]);

  useEffect(() => {
    if (!enabled || unlocked) return;
    const onPointer = () => {
      void ensureSharedContext().then(() => syncUnlocked());
    };
    document.addEventListener("pointerdown", onPointer, { once: true });
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [enabled, unlocked, syncUnlocked]);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = {
      participantCount,
      phase,
      gameMode,
      kotaUnlockedCount,
      teamProgress: teamProgress ? { ...teamProgress } : undefined,
    };
    if (!prev) return;

    if (
      (phase === "lobby" || phase === "preparing") &&
      participantCount > prev.participantCount
    ) {
      void play("join");
    }

    if (phase !== prev.phase) {
      if (phase === "question") void play("start");
      else if (phase === "closed") void play("close");
      else if (phase === "discussion") void play("reveal");
      else if (phase === "summary" || phase === "ended") void play("summary");
    }

    if (
      gameMode === "kota-cahaya" &&
      kotaUnlockedCount > (prev.kotaUnlockedCount ?? 0)
    ) {
      void play("milestone");
    }

    if (
      gameMode === "jelajah-kata" &&
      progressTotal(teamProgress) > progressTotal(prev.teamProgress) + 0.01
    ) {
      void play("move");
    }
  }, [
    participantCount,
    phase,
    gameMode,
    kotaUnlockedCount,
    teamProgress,
    play,
  ]);

  return { enabled, unlocked, toggle, activate, play };
}
