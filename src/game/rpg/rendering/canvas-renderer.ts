/**
 * Canvas renderer implementation — draws the RPG world to an HTML5 Canvas.
 *
 * RESPONSIBILITIES:
 * - Responsive container (fills parent, maintains aspect ratio)
 * - Retina/HiDPI aware (devicePixelRatio scaling)
 * - Resize-safe (observes container changes)
 * - Cleanup (animation frame + event listeners on dispose)
 * - NO memory leaks
 *
 * RULES:
 * - Renderer ONLY reads state; never mutates it
 * - Draw calls go through this module, not directly to canvas
 * - All coordinates come from camera transform
 */

import type { RPGGameState } from "../core/game-state";
import type { RPGCameraState } from "./camera";
import { worldToScreenScaled } from "./camera";
import { LOGICAL_TILE_PX, clampZoom } from "./world-scale";
import { createEmptyManifest, createSpriteLoader, diagnoseAsset, lookupAsset } from "./asset-registry";
import { manifestLookup } from "./rpg-asset-manifest";
import { resolveTileAsset } from "./tile-visuals";
import { argaAssetKey } from "./arga-contract";
import type { RPGWorldEntity } from "../world/world-state";
import { findNearestInteraction } from "../world/interaction";

/** Depth layer order (z sequence, then y-sort within a layer). */
const LAYER_ORDER = [
  "GROUND_DECOR",
  "BEHIND_ENTITIES",
  "ENTITIES",
  "FRONT_OF_ENTITIES",
  "OVERLAY",
] as const;

/**
 * Depth comparator: layer order first, then normalized y (tall props
 * overhang the row above; actors walk behind them). Pure — unit-tested.
 */
export function compareDepth(
  a: Pick<RPGWorldEntity, "layer" | "position">,
  b: Pick<RPGWorldEntity, "layer" | "position">,
): number {
  const layerDiff =
    LAYER_ORDER.indexOf(a.layer as (typeof LAYER_ORDER)[number]) -
    LAYER_ORDER.indexOf(b.layer as (typeof LAYER_ORDER)[number]);
  if (layerDiff !== 0) return layerDiff;
  return a.position.y - b.position.y;
}

/** Depth-sorted copy (never mutates state). */
export function sortEntitiesForDepth<T extends Pick<RPGWorldEntity, "layer" | "position">>(entities: T[]): T[] {
  return [...entities].sort(compareDepth);
}

/** Color palette for placeholder rendering. */
const COLORS = {
  grass: "#4ade80",
  path: "#d4a574",
  grassDark: "#22c55e",
  tree: "#166534",
  treeTrunk: "#92400e",
  house: "#b45309",
  houseRoof: "#dc2626",
  bush: "#15803d",
  rock: "#6b7280",
  flowers: "#ec4899",
  fence: "#a16207",
  player: "#7c3aed",
  playerOutline: "#4c1d95",
  water: "#3b82f6",
  chest: "#eab308",
  portal: "#8b5cf6",
} as const;

/** Canvas renderer — reads state, issues draw calls. */
export interface CanvasRenderer {
  render(state: RPGGameState, camera: RPGCameraState): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

/**
 * Create a canvas renderer attached to a container element.
 * The renderer manages its own canvas element and handles cleanup.
 */
export function createCanvasRenderer(
  container: HTMLDivElement,
): CanvasRenderer {
  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  container.appendChild(canvas);

  const ctxMaybe = canvas.getContext("2d");
  if (!ctxMaybe) throw new Error("Failed to get 2D context");
  const ctx: CanvasRenderingContext2D = ctxMaybe;

  let dpr = window.devicePixelRatio || 1;
  let width = 0;
  let height = 0;

  /** Set canvas resolution for retina displays. */
  function updateSize(w: number, h: number) {
    width = w;
    height = h;
    dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** Initial size. */
  const rect = container.getBoundingClientRect();
  updateSize(rect.width, rect.height);

  /** Resize observer for responsive container. */
  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width: w, height: h } = entry.contentRect;
      if (w > 0 && h > 0) {
        updateSize(w, h);
      }
    }
  });
  ro.observe(container);

  // ── Arga production registry (P2.0A) ──────────────────────────────
  // The manifest is intentionally EMPTY: no production sheets have landed.
  // reportMissingArgaOnce() emits ONE explicit diagnostic per renderer
  // lifetime; the DEV placeholder above keeps rendering. Missing art is
  // reported as missing — never silently substituted, never faked.
  const argaManifest = createEmptyManifest();
  let argaMissingReported = false;

  function reportMissingArgaOnce(): void {
    if (argaMissingReported) return;
    argaMissingReported = true;
    const key = argaAssetKey("idle", "down");
    const hit = lookupAsset(argaManifest, key);
    if (!hit.ok) {
      console.warn(`[rpg] ${diagnoseAsset(argaManifest, key)}`);
    }
  }

  /** Draw a filled rectangle. */
  function drawRect(
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
  ) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  /** Draw a circle. */
  function drawCircle(
    x: number,
    y: number,
    radius: number,
    color: string,
  ) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  /** Draw a triangle (for player facing indicator). */
  function drawTriangle(
    x: number,
    y: number,
    size: number,
    facing: string,
    color: string,
  ) {
    ctx.fillStyle = color;
    ctx.beginPath();
    switch (facing) {
      case "up":
        ctx.moveTo(x, y - size);
        ctx.lineTo(x - size / 2, y + size / 2);
        ctx.lineTo(x + size / 2, y + size / 2);
        break;
      case "down":
        ctx.moveTo(x, y + size);
        ctx.lineTo(x - size / 2, y - size / 2);
        ctx.lineTo(x + size / 2, y - size / 2);
        break;
      case "left":
        ctx.moveTo(x - size, y);
        ctx.lineTo(x + size / 2, y - size / 2);
        ctx.lineTo(x + size / 2, y + size / 2);
        break;
      case "right":
        ctx.moveTo(x + size, y);
        ctx.lineTo(x - size / 2, y - size / 2);
        ctx.lineTo(x - size / 2, y + size / 2);
        break;
    }
    ctx.closePath();
    ctx.fill();
  }

  /** Render tile grid (world-authoritative scale + viewport culling). */
  function renderTiles(state: RPGGameState, camera: RPGCameraState) {
    const { tiles } = state.world;
    const zoom = clampZoom(camera.zoom ?? 1);
    const tilePx = LOGICAL_TILE_PX * zoom;

    for (let y = 0; y < tiles.height; y++) {
      for (let x = 0; x < tiles.width; x++) {
        // Cull off-screen tiles (margin of one tile).
        const sx = worldToScreenScaled(
          { x: (x + 0.5) / tiles.width, y: (y + 0.5) / tiles.height },
          camera, tiles.width, tiles.height,
        );
        if (sx.x < -tilePx || sx.y < -tilePx || sx.x > width + tilePx || sx.y > height + tilePx) {
          continue;
        }
        const tileId = tiles.tiles[y * tiles.width + x];
        // Bound production art (P2.1): numeric tile → READY slice, drawn
        // full-bleed at the tile rect. Unbound tiles keep the legacy color
        // wash (zero visual regression by construction). Loads are cached;
        // a missing image falls back to color (never throws in the loop).
        const bound = boundTileImage(state.world.mapId, tileId, x, y);
        if (bound) {
          ctx.drawImage(
            bound as unknown as CanvasImageSource,
            sx.x - tilePx / 2, sx.y - tilePx / 2, tilePx, tilePx,
          );
          continue;
        }
        const color = tileId === "ground.path" ? COLORS.path : COLORS.grass;
        drawRect(sx.x - tilePx / 2, sx.y - tilePx / 2, tilePx + 1, tilePx + 1, color);

        // Grid lines (subtle)
        ctx.strokeStyle = "rgba(0,0,0,0.05)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(sx.x - tilePx / 2, sx.y - tilePx / 2, tilePx, tilePx);
      }
    }
  }

  // ── Tile art cache (P2.1) ─────────────────────────────────────────
  // One loader per renderer; requested-once set prevents per-frame fetch.
  const tileLoader = createSpriteLoader(
    (src) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`tile load failed: ${src}`));
        img.src = src;
      }),
  );
  const requestedTilePaths = new Set<string>();

  /** Cached READY tile image for a bound tile, or null (color fallback). */
  function boundTileImage(
    mapId: string, tileId: string, x: number, y: number,
  ): { width: number; height: number } | null {
    const num = Number(tileId.split(".")[1]);
    if (!Number.isInteger(num)) return null;
    const assetId = resolveTileAsset(mapId, num, x, y);
    if (!assetId) return null;
    const entry = manifestLookup(assetId);
    if (!entry || entry.status !== "READY") return null;
    const hit = tileLoader.cached(entry.path);
    if (hit) return hit;
    if (!requestedTilePaths.has(entry.path)) {
      requestedTilePaths.add(entry.path);
      void tileLoader.load(entry.path);
    }
    return null;
  }

  /** Render world entities (trees, houses, bushes, etc.). */
  function renderEntities(state: RPGGameState, camera: RPGCameraState) {
    const zoom = clampZoom(camera.zoom ?? 1);
    const sorted = sortEntitiesForDepth(state.world.entities);

    for (const entity of sorted) {
      const screen = worldToScreenScaled(
        entity.position, camera,
        state.world.tiles.width, state.world.tiles.height,
      );
      const size = 24 * entity.scale * zoom;

      switch (entity.type) {
        case "tree":
          // Trunk
          drawRect(screen.x - 4, screen.y - 4, 8, 16, COLORS.treeTrunk);
          // Canopy
          drawCircle(screen.x, screen.y - 12, size / 2, COLORS.tree);
          break;
        case "house":
          // Body
          drawRect(
            screen.x - size / 2,
            screen.y - size / 3,
            size,
            size * 0.6,
            COLORS.house,
          );
          // Roof
          drawTriangle(
            screen.x,
            screen.y - size / 3 - 8,
            size / 2 + 4,
            "up",
            COLORS.houseRoof,
          );
          break;
        case "bush":
          drawCircle(screen.x, screen.y, size / 3, COLORS.bush);
          break;
        case "rock":
          drawCircle(screen.x, screen.y, size / 4, COLORS.rock);
          break;
        case "flowers":
          drawCircle(screen.x - 4, screen.y, 3, COLORS.flowers);
          drawCircle(screen.x + 4, screen.y - 2, 3, COLORS.flowers);
          drawCircle(screen.x, screen.y + 3, 3, COLORS.flowers);
          break;
        case "fence":
          drawRect(
            screen.x - size / 2,
            screen.y - 4,
            size,
            8,
            COLORS.fence,
          );
          // Posts
          drawRect(screen.x - size / 2, screen.y - 8, 4, 16, COLORS.fence);
          drawRect(screen.x + size / 2 - 4, screen.y - 8, 4, 16, COLORS.fence);
          break;
        default:
          // Generic entity placeholder
          drawCircle(screen.x, screen.y, size / 3, "#9ca3af");
      }
    }
  }

  /** Render interaction points (portals, chests). */
  function renderInteractions(state: RPGGameState, camera: RPGCameraState) {
    const zoom = clampZoom(camera.zoom ?? 1);
    for (const interaction of state.world.interactions) {
      const screen = worldToScreenScaled(
        interaction.position, camera,
        state.world.tiles.width, state.world.tiles.height,
      );

      switch (interaction.kind) {
        case "PORTAL":
          // Glowing portal
          drawCircle(screen.x, screen.y, 12 * zoom, COLORS.portal);
          ctx.globalAlpha = 0.3;
          drawCircle(screen.x, screen.y, 18 * zoom, COLORS.portal);
          ctx.globalAlpha = 1;
          break;
        case "CHEST":
          // Chest
          drawRect(screen.x - 8, screen.y - 6, 16, 12, COLORS.chest);
          drawRect(screen.x - 2, screen.y - 2, 4, 4, "#92400e");
          break;
        case "NPC":
          // NPC marker
          drawCircle(screen.x, screen.y - 16, 4, "#fbbf24");
          break;
      }
    }
  }

  /**
   * Render the player character.
   *
   * DEV PLACEHOLDER (explicit, P2.0A): production Arga sheets have not
   * landed (see rendering/arga-contract.ts), so the legacy procedural disc
   * remains — anchored at the FEET ORIGIN (bottom-center = gameplay position)
   * with an engine-baked shadow ellipse. This must never be mistaken for
   * final art. When sheets land, this branch resolves via the asset registry.
   */
  function renderPlayer(state: RPGGameState, camera: RPGCameraState) {
    const player = state.player;
    const zoom = clampZoom(camera.zoom ?? 1);
    // Feet origin: gameplay position == bottom-center contact point.
    const feet = worldToScreenScaled(
      player.position, camera,
      state.world.tiles.width, state.world.tiles.height,
    );
    const r = 12 * zoom;

    // Arga production lookup (explicit missing path — see below).
    reportMissingArgaOnce();

    // Shadow (engine-baked ellipse at the feet origin, never in sprite art)
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.ellipse(feet.x, feet.y + 2 * zoom, r * 0.85, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.globalAlpha = 1;

    // Body (DEV placeholder disc, centered one radius above the feet)
    drawCircle(feet.x, feet.y - r, r, COLORS.player);

    // Outline
    ctx.strokeStyle = COLORS.playerOutline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(feet.x, feet.y - r, r, 0, Math.PI * 2);
    ctx.stroke();

    // Facing indicator
    drawTriangle(feet.x, feet.y - r, 6 * zoom, player.facing, "#fff");
  }

  /** Render interaction prompt when near an interactable. */
  function renderInteractionPrompt(state: RPGGameState, camera: RPGCameraState) {
    const nearest = findNearestInteraction(state.world, state.player.position);
    if (!nearest) return;

    const screen = worldToScreenScaled(
      nearest.position, camera,
      state.world.tiles.width, state.world.tiles.height,
    );
    const promptY = screen.y - 30;

    // Draw "E" prompt
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.beginPath();
    ctx.roundRect(screen.x - 12, promptY - 10, 24, 20, 4);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("E", screen.x, promptY);
  }

  /** Main render function — called by game loop. */
  function render(state: RPGGameState, camera: RPGCameraState) {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = COLORS.grassDark;
    ctx.fillRect(0, 0, width, height);

    // Render layers in order
    renderTiles(state, camera);
    renderEntities(state, camera);
    renderInteractions(state, camera);
    renderPlayer(state, camera);
    renderInteractionPrompt(state, camera);
  }

  /** Resize handler. */
  function resize(w: number, h: number) {
    updateSize(w, h);
  }

  /** Cleanup — removes canvas and observers. */
  function dispose() {
    ro.disconnect();
    canvas.remove();
  }

  return { render, resize, dispose };
}
