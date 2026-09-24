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
  | "summary"
  | "end";

type SampleCue = Exclude<Cue, "ready" | "end">;

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

type Mixer = {
  master: GainNode;
  compressor: DynamicsCompressorNode;
  convolver: ConvolverNode;
  reverbGain: GainNode;
};

const STORAGE_KEY = "mb-sound-muted";

const SAMPLE_URLS: Record<SampleCue, string> = {
  join: "/audio/main-bersama/join.wav",
  start: "/audio/main-bersama/start.wav",
  close: "/audio/main-bersama/close.wav",
  reveal: "/audio/main-bersama/reveal.wav",
  milestone: "/audio/main-bersama/milestone.wav",
  move: "/audio/main-bersama/move.wav",
  summary: "/audio/main-bersama/summary.wav",
};

let sharedAudioContext: AudioContext | null = null;
let sharedMixer: Mixer | null = null;
const sharedBuffers = new Map<SampleCue, AudioBuffer>();
const sharedBufferPromises = new Map<SampleCue, Promise<AudioBuffer | null>>();

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

function makeImpulse(context: AudioContext): AudioBuffer {
  const seconds = 1.35;
  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const t = i / length;
      const decay = Math.pow(1 - t, 3.2);
      data[i] = (Math.random() * 2 - 1) * decay * 0.45;
    }
  }
  return buffer;
}

function ensureMixer(context: AudioContext): Mixer {
  if (sharedMixer) return sharedMixer;

  const master = context.createGain();
  master.gain.value = 0.82;

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 18;
  compressor.ratio.value = 3.5;
  compressor.attack.value = 0.006;
  compressor.release.value = 0.18;

  const convolver = context.createConvolver();
  convolver.buffer = makeImpulse(context);

  const reverbGain = context.createGain();
  reverbGain.gain.value = 0.18;

  master.connect(compressor).connect(context.destination);
  convolver.connect(reverbGain).connect(compressor);

  sharedMixer = { master, compressor, convolver, reverbGain };
  return sharedMixer;
}

async function ensureSharedContext(): Promise<AudioContext | null> {
  const AudioCtor = audioCtor();
  if (!AudioCtor) return null;

  if (!sharedAudioContext || sharedAudioContext.state === "closed") {
    sharedAudioContext = new AudioCtor();
    sharedMixer = null;
    sharedBuffers.clear();
    sharedBufferPromises.clear();
  }

  if (sharedAudioContext.state === "suspended") {
    try {
      await sharedAudioContext.resume();
    } catch {
      return null;
    }
  }

  ensureMixer(sharedAudioContext);
  return sharedAudioContext;
}

async function loadSample(
  context: AudioContext,
  cue: SampleCue,
): Promise<AudioBuffer | null> {
  const existing = sharedBuffers.get(cue);
  if (existing) return existing;

  const pending = sharedBufferPromises.get(cue);
  if (pending) return pending;

  const promise = fetch(SAMPLE_URLS[cue], { cache: "force-cache" })
    .then((response) => {
      if (!response.ok) throw new Error(`audio ${cue} failed: ${response.status}`);
      return response.arrayBuffer();
    })
    .then((bytes) => context.decodeAudioData(bytes.slice(0)))
    .then((buffer) => {
      sharedBuffers.set(cue, buffer);
      return buffer;
    })
    .catch(() => null)
    .finally(() => {
      sharedBufferPromises.delete(cue);
    });

  sharedBufferPromises.set(cue, promise);
  return promise;
}

function warmSamples(context: AudioContext) {
  (Object.keys(SAMPLE_URLS) as SampleCue[]).forEach((cue) => {
    void loadSample(context, cue);
  });
}

function connectWithSpace(
  context: AudioContext,
  node: AudioNode,
  volume: number,
  reverbSend: number,
): GainNode {
  const mixer = ensureMixer(context);
  const gain = context.createGain();
  gain.gain.value = volume;
  node.connect(gain);
  gain.connect(mixer.master);

  if (reverbSend > 0) {
    const send = context.createGain();
    send.gain.value = reverbSend;
    gain.connect(send).connect(mixer.convolver);
  }
  return gain;
}

async function playSample(
  context: AudioContext,
  cue: SampleCue,
  {
    volume = 0.55,
    delay = 0,
    playbackRate = 1,
    reverbSend = 0.08,
  }: {
    volume?: number;
    delay?: number;
    playbackRate?: number;
    reverbSend?: number;
  } = {},
) {
  const buffer = await loadSample(context, cue);
  if (!buffer || context.state !== "running") return;

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;
  connectWithSpace(context, source, volume, reverbSend);
  source.start(context.currentTime + delay);
}

function scheduleTone(
  context: AudioContext,
  frequency: number,
  duration: number,
  delay = 0,
  type: OscillatorType = "sine",
  volume = 0.055,
  reverbSend = 0.12,
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
    start + Math.max(0.06, duration),
  );

  oscillator.connect(gain);
  const mixer = ensureMixer(context);
  gain.connect(mixer.master);

  if (reverbSend > 0) {
    const send = context.createGain();
    send.gain.value = reverbSend;
    gain.connect(send).connect(mixer.convolver);
  }

  oscillator.start(start);
  oscillator.stop(start + duration + 0.08);
}

function scheduleSweep(
  context: AudioContext,
  from: number,
  to: number,
  duration: number,
  delay = 0,
  volume = 0.035,
) {
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(from, start);
  oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  const mixer = ensureMixer(context);
  gain.connect(mixer.master);
  const send = context.createGain();
  send.gain.value = 0.2;
  gain.connect(send).connect(mixer.convolver);

  oscillator.start(start);
  oscillator.stop(start + duration + 0.06);
}

function scheduleCue(context: AudioContext, cue: Cue) {
  switch (cue) {
    case "ready":
      scheduleTone(context, 659.25, 0.12, 0, "triangle", 0.045, 0.08);
      scheduleTone(context, 987.77, 0.18, 0.085, "sine", 0.04, 0.16);
      break;

    case "join":
      void playSample(context, "join", {
        volume: 0.42,
        playbackRate: 1.04,
        reverbSend: 0.08,
      });
      scheduleTone(context, 783.99, 0.13, 0.06, "sine", 0.025, 0.18);
      break;

    case "start":
      void playSample(context, "start", {
        volume: 0.5,
        playbackRate: 0.98,
        reverbSend: 0.08,
      });
      scheduleSweep(context, 170, 360, 0.32, 0.02, 0.025);
      scheduleTone(context, 523.25, 0.13, 0.08, "triangle", 0.034, 0.11);
      scheduleTone(context, 783.99, 0.19, 0.19, "sine", 0.04, 0.18);
      break;

    case "close":
      void playSample(context, "close", {
        volume: 0.5,
        playbackRate: 0.96,
        reverbSend: 0.04,
      });
      scheduleSweep(context, 420, 185, 0.24, 0.02, 0.028);
      break;

    case "reveal":
      void playSample(context, "reveal", {
        volume: 0.42,
        playbackRate: 1.02,
        reverbSend: 0.22,
      });
      scheduleTone(context, 659.25, 0.18, 0.09, "sine", 0.028, 0.22);
      break;

    case "milestone":
      void playSample(context, "milestone", {
        volume: 0.5,
        playbackRate: 1,
        reverbSend: 0.2,
      });
      scheduleTone(context, 523.25, 0.18, 0.04, "sine", 0.036, 0.28);
      scheduleTone(context, 659.25, 0.2, 0.13, "sine", 0.04, 0.3);
      scheduleTone(context, 783.99, 0.28, 0.22, "sine", 0.045, 0.34);
      scheduleTone(context, 1046.5, 0.42, 0.31, "sine", 0.032, 0.38);
      break;

    case "move":
      void playSample(context, "move", {
        volume: 0.28,
        playbackRate: 1.02,
        reverbSend: 0.025,
      });
      scheduleTone(context, 587.33, 0.085, 0.035, "triangle", 0.022, 0.04);
      break;

    case "summary":
      void playSample(context, "summary", {
        volume: 0.54,
        playbackRate: 0.98,
        reverbSend: 0.2,
      });
      scheduleTone(context, 392, 0.22, 0.03, "triangle", 0.032, 0.18);
      scheduleTone(context, 523.25, 0.22, 0.16, "triangle", 0.038, 0.22);
      scheduleTone(context, 659.25, 0.26, 0.3, "sine", 0.042, 0.28);
      scheduleTone(context, 783.99, 0.65, 0.46, "sine", 0.05, 0.34);
      scheduleTone(context, 1046.5, 0.5, 0.55, "sine", 0.028, 0.4);
      break;

    case "end":
      scheduleTone(context, 659.25, 0.12, 0, "triangle", 0.03, 0.1);
      scheduleTone(context, 523.25, 0.24, 0.09, "sine", 0.026, 0.16);
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
  const lastCueAtRef = useRef<Partial<Record<Cue, number>>>({});

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

  const activate = useCallback(async (options?: { preview?: boolean }) => {
    setEnabled(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "0");
    } catch {
      // Preference persistence is optional.
    }

    const context = await ensureSharedContext();
    const ready = context?.state === "running";
    setUnlocked(ready);

    if (context && ready) {
      warmSamples(context);
      if (options?.preview !== false) scheduleCue(context, "ready");
    }
    return ready;
  }, []);

  const play = useCallback(
    async (cue: Cue) => {
      if (!enabled) return;

      // Avoid cue storms from clustered realtime invalidations while still
      // allowing deliberate game transitions to sound immediate.
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const cooldown = cue === "move" || cue === "join" ? 180 : 90;
      if (now - (lastCueAtRef.current[cue] ?? 0) < cooldown) return;
      lastCueAtRef.current[cue] = now;

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
      void ensureSharedContext().then((context) => {
        if (context) warmSamples(context);
        syncUnlocked();
      });
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
      else if (phase === "summary") void play("summary");
      else if (phase === "ended") void play("end");
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
