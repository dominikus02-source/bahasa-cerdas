/**
 * Presentation-only combat feedback — Pendekar Suryakerta.
 *
 * This layer never changes authoritative game state. It turns state deltas
 * into short-lived visual feedback: hit-stop, camera shake, flash, impact
 * bursts and damage numbers. Timing is deterministic and renderer-friendly.
 */

export interface VisualFeedbackState {
  freezeUntilMs: number;
  shakeUntilMs: number;
  shakeIntensity: number;
  flashUntilMs: number;
  flashAlpha: number;
}

export interface FloatingDamage {
  id: number;
  value: number;
  x: number;
  y: number;
  startedAtMs: number;
  durationMs: number;
  critical: boolean;
}

export interface ImpactBurst {
  id: number;
  x: number;
  y: number;
  startedAtMs: number;
  durationMs: number;
  intensity: number;
  victory: boolean;
}

export function createVisualFeedbackState(): VisualFeedbackState {
  return {
    freezeUntilMs: 0,
    shakeUntilMs: 0,
    shakeIntensity: 0,
    flashUntilMs: 0,
    flashAlpha: 0,
  };
}

export function triggerImpact(
  state: VisualFeedbackState,
  nowMs: number,
  intensity: number,
): VisualFeedbackState {
  const power = Math.max(0, Math.min(1, intensity));
  return {
    ...state,
    freezeUntilMs: Math.max(state.freezeUntilMs, nowMs + Math.round(32 + power * 28)),
    shakeUntilMs: Math.max(state.shakeUntilMs, nowMs + Math.round(90 + power * 80)),
    shakeIntensity: Math.max(state.shakeIntensity, 2 + power * 6),
    flashUntilMs: Math.max(state.flashUntilMs, nowMs + 90),
    flashAlpha: Math.max(state.flashAlpha, 0.08 + power * 0.14),
  };
}

export function triggerVictory(
  state: VisualFeedbackState,
  nowMs: number,
): VisualFeedbackState {
  return {
    ...state,
    shakeUntilMs: Math.max(state.shakeUntilMs, nowMs + 180),
    shakeIntensity: Math.max(state.shakeIntensity, 3),
    flashUntilMs: Math.max(state.flashUntilMs, nowMs + 180),
    flashAlpha: Math.max(state.flashAlpha, 0.12),
  };
}

/** Create a deterministic radial impact burst; no random source is needed. */
export function createImpactBurst(
  id: number,
  x: number,
  y: number,
  nowMs: number,
  intensity: number,
  victory = false,
): ImpactBurst {
  return {
    id,
    x,
    y,
    startedAtMs: nowMs,
    durationMs: victory ? 520 : 360,
    intensity: Math.max(0.2, Math.min(1, intensity)),
    victory,
  };
}

export function impactBurstOpacity(
  burst: ImpactBurst,
  nowMs: number,
): number {
  const elapsed = nowMs - burst.startedAtMs;
  if (elapsed <= 0 || elapsed >= burst.durationMs) return 0;
  const p = elapsed / burst.durationMs;
  return p < 0.18 ? p / 0.18 : 1 - (p - 0.18) / 0.82;
}

export function impactBurstParticle(
  burst: ImpactBurst,
  particleIndex: number,
  nowMs: number,
): { x: number; y: number; size: number; opacity: number } {
  const elapsed = Math.max(0, nowMs - burst.startedAtMs);
  const p = Math.max(0, Math.min(1, elapsed / burst.durationMs));
  const count = burst.victory ? 12 : 8;
  const angle = (Math.PI * 2 * particleIndex) / count + Math.sin(particleIndex * 17.13) * 0.12;
  // Positions are normalized world coordinates. Keep the burst local to the
  // entity instead of accidentally treating pixels as world units.
  const distance = (0.006 + p * (burst.victory ? 0.030 : 0.020)) * burst.intensity;
  const wobble = 1 + Math.sin(particleIndex * 4.7 + p * 5.5) * 0.08;
  const x = burst.x + Math.cos(angle) * distance * wobble;
  const y = burst.y + Math.sin(angle) * distance * wobble - p * (burst.victory ? 0.008 : 0.004);
  const size = (burst.victory ? 2.2 : 1.8) * burst.intensity * (1 - p * 0.35);
  return {
    x,
    y,
    size,
    opacity: impactBurstOpacity(burst, nowMs) * (1 - p * 0.35),
  };
}

export function shakeOffset(
  state: VisualFeedbackState,
  nowMs: number,
): { x: number; y: number } {
  if (nowMs >= state.shakeUntilMs) return { x: 0, y: 0 };
  const remaining = state.shakeUntilMs - nowMs;
  const progress = Math.max(0, Math.min(1, remaining / 180));
  const amplitude = state.shakeIntensity * progress;
  const t = nowMs / 1000;
  return {
    x: Math.sin(t * 91.7) * amplitude,
    y: Math.cos(t * 117.3) * amplitude * 0.72,
  };
}

export function flashAlpha(
  state: VisualFeedbackState,
  nowMs: number,
): number {
  if (nowMs >= state.flashUntilMs) return 0;
  const progress = Math.max(0, Math.min(1, (state.flashUntilMs - nowMs) / 180));
  return state.flashAlpha * progress;
}

export function floatingDamageOpacity(
  damage: FloatingDamage,
  nowMs: number,
): number {
  const elapsed = nowMs - damage.startedAtMs;
  if (elapsed <= 0 || elapsed >= damage.durationMs) return 0;
  const p = elapsed / damage.durationMs;
  return p < 0.72 ? 1 : 1 - (p - 0.72) / 0.28;
}

export function floatingDamageOffset(
  damage: FloatingDamage,
  nowMs: number,
): number {
  const elapsed = Math.max(0, nowMs - damage.startedAtMs);
  const p = Math.min(1, elapsed / damage.durationMs);
  return -28 * p;
}
