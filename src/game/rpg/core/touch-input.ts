/**
 * Touch input adapter — Pendekar Suryakerta.
 *
 * Mobile controls are translated into the same serializable command stream as
 * keyboard input. The game engine remains device-agnostic.
 *
 * Design:
 * - Virtual stick emits one cardinal MOVE command every fixed-tick drain while
 *   held, matching the keyboard adapter's continuous movement semantics.
 * - Direction changes are emitted immediately on pointer movement.
 * - Release emits STOP_MOVE.
 * - Action button emits INTERACT.
 * - Pointer events + capture make the controls reliable on touchscreens.
 */

import type { RPGFacing } from "./constants";
import type { RPGCommand, RPGInputSource } from "./input";

export type RPGTouchInputSource = RPGInputSource & { attach(): void; detach(): void };

interface TouchInputElements {
  joystick: HTMLElement;
  action: HTMLElement;
  /** Optional presentation hook for a native-feeling virtual stick thumb. */
  thumb?: HTMLElement;
}

export function createTouchInputSource(
  playerId: string,
  elements: TouchInputElements,
): RPGTouchInputSource {
  let active = false;
  let pointerId: number | null = null;
  let direction: RPGFacing | null = null;
  let centerX = 0;
  let centerY = 0;
  let visualX = 0;
  let visualY = 0;

  const radius = 42;
  const deadZone = 12;

  function updateThumb(x: number, y: number): void {
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.hypot(dx, dy);
    const limited = Math.min(radius, distance);
    const scale = distance > 0 ? limited / distance : 0;
    visualX = dx * scale;
    visualY = dy * scale;
    if (elements.thumb) {
      elements.thumb.style.transform = `translate(calc(-50% + ${visualX}px), calc(-50% + ${visualY}px))`;
      elements.thumb.style.opacity = active ? "1" : "0.78";
    }
  }

  function resetThumb(): void {
    visualX = 0;
    visualY = 0;
    if (elements.thumb) {
      elements.thumb.style.transform = "translate(-50%, -50%)";
      elements.thumb.style.opacity = "0.78";
    }
  }

  function emitDirection(x: number, y: number): void {
    updateThumb(x, y);
    const dx = x - centerX;
    const dy = y - centerY;
    if (Math.hypot(dx, dy) < deadZone) {
      direction = null;
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? "right" : "left";
    } else {
      direction = dy > 0 ? "down" : "up";
    }
  }

  function begin(e: PointerEvent): void {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    pointerId = e.pointerId;
    active = true;
    const rect = elements.joystick.getBoundingClientRect();
    centerX = rect.left + rect.width / 2;
    centerY = rect.top + rect.height / 2;
    elements.joystick.setPointerCapture?.(e.pointerId);
    emitDirection(e.clientX, e.clientY);
  }

  function move(e: PointerEvent): void {
    if (!active || pointerId !== e.pointerId) return;
    e.preventDefault();
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const distance = Math.hypot(dx, dy);
    if (distance > radius) {
      const scale = radius / distance;
      emitDirection(centerX + dx * scale, centerY + dy * scale);
    } else {
      emitDirection(e.clientX, e.clientY);
    }
  }

  function end(e: PointerEvent): void {
    if (pointerId !== e.pointerId) return;
    e.preventDefault();
    active = false;
    pointerId = null;
    direction = null;
    resetThumb();
    pending.push({ type: "STOP_MOVE", playerId });
    try { elements.joystick.releasePointerCapture?.(e.pointerId); } catch {}
  }

  function action(e: PointerEvent): void {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    pending.push({ type: "INTERACT", playerId });
  }

  const pending: RPGCommand[] = [];

  function attach(): void {
    elements.joystick.addEventListener("pointerdown", begin);
    elements.joystick.addEventListener("pointermove", move);
    elements.joystick.addEventListener("pointerup", end);
    elements.joystick.addEventListener("pointercancel", end);
    elements.action.addEventListener("pointerdown", action);
  }

  function detach(): void {
    elements.joystick.removeEventListener("pointerdown", begin);
    elements.joystick.removeEventListener("pointermove", move);
    elements.joystick.removeEventListener("pointerup", end);
    elements.joystick.removeEventListener("pointercancel", end);
    elements.action.removeEventListener("pointerdown", action);
    active = false;
    pointerId = null;
    direction = null;
    resetThumb();
    pending.length = 0;
  }

  function drain(): RPGCommand[] {
    const commands = pending.splice(0, pending.length);
    if (active && direction) {
      commands.push({ type: "MOVE", playerId, dir: direction });
    } else if (!active) {
      // STOP_MOVE is emitted only on release transition in end(); avoid
      // flooding the authoritative command pipeline here.
    }
    return commands;
  }

  return { attach, detach, drain };
}
