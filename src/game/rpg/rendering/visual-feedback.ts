/**
 * Presentation-only combat feedback — Pendekar Suryakerta.
 *
 * This layer never changes authoritative game state. It turns state deltas
 * into short-lived visual feedback: hit-stop, camera shake, flash and damage
 * numbers. The intent mirrors production RPG "game feel" patterns while
 * keeping all timing deterministic and cheap for a Canvas renderer.
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
