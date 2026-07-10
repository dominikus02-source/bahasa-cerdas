/**
 * Lightweight game sound engine using the Web Audio API — all sounds are
 * synthesized at runtime (no audio files, no external assets, CSP-safe, offline).
 * Also exposes haptic helpers and a persisted mute toggle.
 *
 * Browsers require a user gesture before audio can play, so the context is
 * created/resumed lazily on the first sound call (which always follows a tap).
 */

let ctx: AudioContext | null = null;
let enabled = true;

if (typeof window !== "undefined") {
  enabled = window.localStorage.getItem("bc_game_sound") !== "off";
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function isSoundOn(): boolean {
  return enabled;
}

export function toggleSound(): boolean {
  enabled = !enabled;
  if (typeof window !== "undefined") window.localStorage.setItem("bc_game_sound", enabled ? "on" : "off");
  if (enabled) blip(660, 0.08, "sine", 0.15);
  return enabled;
}

// A single tone with an ADSR-ish envelope.
function blip(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.2, whenOffset = 0) {
  const c = getCtx();
  if (!c || !enabled) return;
  const t = c.currentTime + whenOffset;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// A note that glides from f1 to f2.
function slide(f1: number, f2: number, dur: number, type: OscillatorType = "sine", vol = 0.2) {
  const c = getCtx();
  if (!c || !enabled) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f1, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  tap: () => blip(320, 0.05, "sine", 0.1),
  start: () => { slide(440, 660, 0.18, "triangle", 0.18); },
  correct: () => { blip(660, 0.09, "sine", 0.2); blip(880, 0.12, "sine", 0.2, 0.08); },
  // Higher, sparklier chime as combo grows.
  climb: (combo = 1) => { const base = 620 + Math.min(combo, 8) * 40; blip(base, 0.08, "triangle", 0.18); blip(base * 1.5, 0.1, "sine", 0.15, 0.06); },
  combo: (n: number) => { const f = 700 + Math.min(n, 10) * 60; blip(f, 0.07, "square", 0.12); blip(f * 1.33, 0.09, "sine", 0.14, 0.05); },
  wrong: () => { slide(220, 110, 0.28, "sawtooth", 0.18); },
  tick: () => blip(900, 0.04, "square", 0.08),
  win: () => { [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.16, "triangle", 0.2, i * 0.12)); },
  gameover: () => { [392, 330, 262].forEach((f, i) => blip(f, 0.22, "sine", 0.18, i * 0.16)); },
  levelup: () => { [659, 880, 1175].forEach((f, i) => blip(f, 0.14, "triangle", 0.2, i * 0.09)); },
};

// Haptic feedback (mobile). No-op where unsupported.
export function haptic(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
