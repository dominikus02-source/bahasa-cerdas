"use client";

type KuisTempurSound =
  | "correct"
  | "wrong"
  | "shot"
  | "hit"
  | "ko"
  | "respawn"
  | "countdown"
  | "finalRush"
  | "victory";

let context: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let lastPlayed = new Map<KuisTempurSound, number>();

function getContext() {
  if (typeof window === "undefined") return null;
  if (!context) {
    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    context = new AudioCtor();
    master = context.createGain();
    master.gain.value = 0.14;
    master.connect(context.destination);
  }
  return context;
}

function tone(
  ctx: AudioContext,
  at: number,
  frequency: number,
  duration: number,
  {
    type = "sine",
    gain = 0.06,
    endFrequency,
  }: {
    type?: OscillatorType;
    gain?: number;
    endFrequency?: number;
  } = {}
) {
  if (!master || muted) return;
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, at);
  if (endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), at + duration);
  }

  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + Math.min(0.018, duration * 0.2));
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  oscillator.connect(envelope);
  envelope.connect(master);
  oscillator.start(at);
  oscillator.stop(at + duration + 0.02);
}

function noise(ctx: AudioContext, at: number, duration: number, gain = 0.035) {
  if (!master || muted) return;
  const frameCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    const decay = 1 - i / frameCount;
    data[i] = (Math.random() * 2 - 1) * decay;
  }
  const source = ctx.createBufferSource();
  const envelope = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1250;
  filter.Q.value = 0.8;
  envelope.gain.setValueAtTime(gain, at);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(master);
  source.start(at);
}

function canPlay(sound: KuisTempurSound) {
  const now = performance.now();
  const cooldown = sound === "hit" ? 55 : sound === "shot" ? 80 : 120;
  const previous = lastPlayed.get(sound) || 0;
  if (now - previous < cooldown) return false;
  lastPlayed.set(sound, now);
  return true;
}

export const kuisTempurAudio = {
  async unlock() {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => {});
    }
  },

  setMuted(next: boolean) {
    muted = next;
    if (master) master.gain.value = next ? 0 : 0.14;
  },

  isMuted() {
    return muted;
  },

  play(sound: KuisTempurSound) {
    if (muted || !canPlay(sound)) return;
    const ctx = getContext();
    if (!ctx || ctx.state !== "running") return;
    const t = ctx.currentTime + 0.002;

    switch (sound) {
      case "correct":
        tone(ctx, t, 523.25, 0.11, { type: "triangle", gain: 0.055 });
        tone(ctx, t + 0.07, 659.25, 0.12, { type: "triangle", gain: 0.052 });
        tone(ctx, t + 0.14, 783.99, 0.16, { type: "sine", gain: 0.048 });
        break;
      case "wrong":
        tone(ctx, t, 220, 0.13, { type: "triangle", gain: 0.045, endFrequency: 174 });
        tone(ctx, t + 0.085, 155, 0.17, { type: "sine", gain: 0.035 });
        break;
      case "shot":
        tone(ctx, t, 880, 0.09, { type: "square", gain: 0.026, endFrequency: 430 });
        tone(ctx, t, 1760, 0.07, { type: "sine", gain: 0.018, endFrequency: 720 });
        noise(ctx, t, 0.055, 0.018);
        break;
      case "hit":
        noise(ctx, t, 0.085, 0.032);
        tone(ctx, t, 145, 0.11, { type: "triangle", gain: 0.034, endFrequency: 82 });
        break;
      case "ko":
        noise(ctx, t, 0.18, 0.035);
        tone(ctx, t, 196, 0.15, { type: "sawtooth", gain: 0.028, endFrequency: 110 });
        tone(ctx, t + 0.12, 110, 0.22, { type: "triangle", gain: 0.03, endFrequency: 62 });
        break;
      case "respawn":
        tone(ctx, t, 392, 0.11, { type: "sine", gain: 0.035 });
        tone(ctx, t + 0.06, 523.25, 0.12, { type: "sine", gain: 0.04 });
        tone(ctx, t + 0.12, 783.99, 0.18, { type: "triangle", gain: 0.042 });
        break;
      case "countdown":
        tone(ctx, t, 440, 0.075, { type: "triangle", gain: 0.045 });
        tone(ctx, t + 0.015, 880, 0.055, { type: "sine", gain: 0.02 });
        break;
      case "finalRush":
        tone(ctx, t, 293.66, 0.18, { type: "sawtooth", gain: 0.025 });
        tone(ctx, t + 0.12, 440, 0.22, { type: "triangle", gain: 0.038 });
        tone(ctx, t + 0.24, 587.33, 0.24, { type: "sine", gain: 0.036 });
        break;
      case "victory":
        [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
          tone(ctx, t + index * 0.085, frequency, 0.21, {
            type: index < 3 ? "triangle" : "sine",
            gain: index === 3 ? 0.052 : 0.038,
          });
        });
        break;
    }
  },
};
