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
import { worldToScreen } from "./camera";
import type { RPGWorldEntity } from "../world/world-state";

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

/** Tile size in pixels (base resolution). */
const TILE_SIZE = 32;

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

  /** Render tile grid. */
  function renderTiles(state: RPGGameState, camera: RPGCameraState) {
    const { tiles } = state.world;
    const tileW = width / tiles.width;
    const tileH = height / tiles.height;

    for (let y = 0; y < tiles.height; y++) {
      for (let x = 0; x < tiles.width; x++) {
        const tileId = tiles.tiles[y * tiles.width + x];
        const color = tileId === "ground.path" ? COLORS.path : COLORS.grass;
        drawRect(x * tileW, y * tileH, tileW + 1, tileH + 1, color);

        // Grid lines (subtle)
        ctx.strokeStyle = "rgba(0,0,0,0.05)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x * tileW, y * tileH, tileW, tileH);
      }
    }
  }

  /** Render world entities (trees, houses, bushes, etc.). */
  function renderEntities(state: RPGGameState, camera: RPGCameraState) {
    // Sort by layer order, then by y position for depth
    const layerOrder = [
      "GROUND_DECOR",
      "BEHIND_ENTITIES",
      "ENTITIES",
      "FRONT_OF_ENTITIES",
      "OVERLAY",
    ];

    const sorted = [...state.world.entities].sort((a, b) => {
      const layerDiff =
        layerOrder.indexOf(a.layer) - layerOrder.indexOf(b.layer);
      if (layerDiff !== 0) return layerDiff;
      return a.position.y - b.position.y;
    });

    for (const entity of sorted) {
      const screen = worldToScreen(entity.position, camera);
      const size = 24 * entity.scale;

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
    for (const interaction of state.world.interactions) {
      const screen = worldToScreen(interaction.position, camera);

      switch (interaction.kind) {
        case "PORTAL":
          // Glowing portal
          drawCircle(screen.x, screen.y, 12, COLORS.portal);
          ctx.globalAlpha = 0.3;
          drawCircle(screen.x, screen.y, 18, COLORS.portal);
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

  /** Render the player character. */
  function renderPlayer(state: RPGGameState, camera: RPGCameraState) {
    const player = state.player;
    const screen = worldToScreen(player.position, camera);

    // Shadow
    ctx.globalAlpha = 0.2;
    drawCircle(screen.x, screen.y + 12, 10, "#000");
    ctx.globalAlpha = 1;

    // Body
    drawCircle(screen.x, screen.y, 12, COLORS.player);

    // Outline
    ctx.strokeStyle = COLORS.playerOutline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 12, 0, Math.PI * 2);
    ctx.stroke();

    // Facing indicator
    drawTriangle(screen.x, screen.y, 6, player.facing, "#fff");
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
