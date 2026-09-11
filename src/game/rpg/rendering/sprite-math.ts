/**
 * Sprite math — Pendekar Suryakerta (P2.0A).
 *
 * Feet-origin drawing math (bible §14, non-negotiable): the gameplay
 * position corresponds to the BOTTOM-CENTER of the character's feet.
 * drawRect() converts (feet screen point, canvas px, scale, mirror) into a
 * canvas drawImage rect. Collision/hitboxes NEVER derive from these numbers.
 *
 * Pure + deterministic. No DOM.
 */

export interface SpriteDrawRect {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  /** True when the frame must be mirrored (leftward side travel). */
  mirror: boolean;
}

/**
 * Destination rect for a feet-anchored sprite.
 * (feetX, feetY) = screen point of the feet contact (from worldToScreenScaled).
 */
export function spriteDrawRect(args: {
  feetX: number;
  feetY: number;
  canvasWidthPx: number;
  canvasHeightPx: number;
  scale: number;
  mirror: boolean;
}): SpriteDrawRect {
  const dw = args.canvasWidthPx * args.scale;
  const dh = args.canvasHeightPx * args.scale;
  return {
    dx: args.feetX - dw / 2,
    dy: args.feetY - dh,
    dw,
    dh,
    mirror: args.mirror,
  };
}

/** Source rect for frame `index` in a horizontal-strip/grid sheet. */
export function spriteFrameRect(args: {
  frameWidthPx: number;
  frameHeightPx: number;
  columns: number;
  index: number;
}): { sx: number; sy: number; sw: number; sh: number } {
  const col = args.index % Math.max(1, args.columns);
  const row = Math.floor(args.index / Math.max(1, args.columns));
  return {
    sx: col * args.frameWidthPx,
    sy: row * args.frameHeightPx,
    sw: args.frameWidthPx,
    sh: args.frameHeightPx,
  };
}

/**
 * Engine-baked shadow ellipse at the feet origin (bible: never in sprite
 * art). Returns radii scaled to the actor footprint — subtle by design.
 */
export function shadowRadii(spriteWidthPx: number, scale: number): { rx: number; ry: number } {
  const rx = spriteWidthPx * scale * 0.32;
  return { rx, ry: rx * 0.32 };
}
