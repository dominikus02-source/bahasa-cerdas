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
import { HERO_CANVAS_PX, LOGICAL_TILE_PX, clampZoom } from "./world-scale";
import { createSpriteLoader } from "./asset-registry";
import { manifestLookup } from "./rpg-asset-manifest";
import { resolveTileAsset } from "./tile-visuals";
import { frameAt, clipFor, mirrorForDirection } from "./animation";
import { spriteDrawRect, spriteFrameRect } from "./sprite-math";
import type { RPGWorldEntity } from "../world/world-state";
import { findNearestInteraction } from "../world/interaction";
import type { LiveEnemy } from "../combat/encounter";
import { resolveEntityAsset, isEntityAssetReady } from "./entity-asset-resolver";
import { createVisualFeedbackState, triggerImpact, triggerVictory, shakeOffset, flashAlpha, floatingDamageOpacity, floatingDamageOffset, impactBurstOpacity, impactBurstParticle, createImpactBurst, type VisualFeedbackState, type FloatingDamage, type ImpactBurst } from "./visual-feedback";

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
  render(
    state: RPGGameState,
    camera: RPGCameraState,
    liveEnemies?: readonly LiveEnemy[],
    allowedNpcIds?: readonly string[],
  ): void;
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

  // ── Approved Arga locomotion (P2.6C) ──────────────────────────────
  // Only the three READY walk sheets may be loaded. There is no approved
  // idle/attack/hurt asset, so an idle pose uses frame 0 of the appropriate
  // READY walk sheet; it never pretends a missing animation exists.
  const argaImages = new Map<string, HTMLImageElement>();
  const requestedArgaPaths = new Set<string>();
  let lastPlayerPosition: { x: number; y: number } | null = null;
  let visualPlayerPosition: { x: number; y: number } | null = null;
  let lastPlayerMoveAt = 0;

  // Presentation-only combat feel. Authoritative battle state remains untouched.
  let visualFeedback: VisualFeedbackState = createVisualFeedbackState();
  let previousBattleId: string | null = null;
  let previousBattlePlayerHp: number | null = null;
  let previousBattleResult: string | undefined;
  const previousBattleEnemyHp = new Map<string, number>();
  let floatingDamageSeq = 0;
  let floatingDamages: FloatingDamage[] = [];
  let impactBurstSeq = 0;
  let impactBursts: ImpactBurst[] = [];

  function argaEntryForFacing(facing: string) {
    const direction = facing === "up" ? "up" : facing === "down" ? "down" : "side";
    const entry = manifestLookup(`sheet-char-arga-walk-${direction}`);
    return entry?.status === "READY" ? entry : null;
  }

  function requestArga(entry: NonNullable<ReturnType<typeof argaEntryForFacing>>) {
    if (argaImages.has(entry.path) || requestedArgaPaths.has(entry.path)) return;
    requestedArgaPaths.add(entry.path);
    const image = new Image();
    image.onload = () => argaImages.set(entry.path, image);
    image.onerror = () => console.warn(`[rpg] approved Arga locomotion could not load: ${entry.path}`);
    image.src = entry.path;
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

  function drawWaterShimmer(x: number, y: number, tilePx: number): void {
    const phase = performance.now() / 900 + (x + y) * 0.008;
    const wave = (Math.sin(phase) + 1) / 2;
    ctx.save();
    ctx.globalAlpha = 0.08 + wave * 0.08;
    ctx.strokeStyle = "#dbeafe";
    ctx.lineWidth = Math.max(1, tilePx * 0.018);
    ctx.beginPath();
    ctx.moveTo(x - tilePx * 0.28, y - tilePx * 0.12 + wave * 2);
    ctx.quadraticCurveTo(x, y - tilePx * 0.2 - wave * 2, x + tilePx * 0.28, y - tilePx * 0.12 + wave * 2);
    ctx.stroke();
    ctx.restore();
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
          const tileNum = Number(tileId.split(".")[1]);
          if (tileNum === 3) drawWaterShimmer(sx.x, sx.y, tilePx);
          continue;
        }
        // P2.9: Fix dead fallback — tileId is "tile.N", not "ground.path".
        // Use numeric tile for color selection when no sprite binding exists.
        const tileNum = Number(tileId.split(".")[1]);
        const color = tileNum === 1 ? COLORS.path
          : tileNum === 3 ? COLORS.water
          : tileNum === 13 ? "#a0845c"  // dry ground
          : COLORS.grass;
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

  // P2.9C.1: Preload READY entity assets on first render to avoid procedural→sprite pop.
  let entityAssetsPreloaded = false;
  function preloadRuntimeAsset(assetKey: string | undefined): void {
    const resolution = resolveEntityAsset(assetKey);
    if (!isEntityAssetReady(resolution)) return;
    if (requestedTilePaths.has(resolution.path)) return;
    requestedTilePaths.add(resolution.path);
    void tileLoader.load(resolution.path);
  }

  function preloadEntityAssets(entities: readonly RPGWorldEntity[]): void {
    for (const entity of entities) {
      preloadRuntimeAsset(entity.asset);
    }
  }

  function drawReadyEntitySprite(
    entry: { path: string; sourceRect?: { x: number; y: number; width: number; height: number } },
    screenX: number,
    feetY: number,
    maxSize: number,
  ): boolean {
    const cached = tileLoader.cached(entry.path);
    if (!cached) {
      if (!requestedTilePaths.has(entry.path)) {
        requestedTilePaths.add(entry.path);
        void tileLoader.load(entry.path);
      }
      return false;
    }
    const rect = entry.sourceRect ?? { x: 0, y: 0, width: cached.width, height: cached.height };
    const scale = maxSize / Math.max(rect.width, rect.height);
    const dw = rect.width * scale;
    const dh = rect.height * scale;
    ctx.drawImage(
      cached as unknown as CanvasImageSource,
      rect.x, rect.y, rect.width, rect.height,
      screenX - dw / 2, feetY - dh, dw, dh,
    );
    return true;
  }


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
    // P2.9C.1: Preload entity assets once to avoid first-frame procedural pop.
    if (!entityAssetsPreloaded) {
      entityAssetsPreloaded = true;
      preloadEntityAssets(state.world.entities);
    }

    const zoom = clampZoom(camera.zoom ?? 1);
    const sorted = sortEntitiesForDepth(state.world.entities);

    for (const entity of sorted) {
      const screen = worldToScreenScaled(
        entity.position, camera,
        state.world.tiles.width, state.world.tiles.height,
      );
      const baseSize =
        entity.type === "house" ? 96 :
        entity.type === "tree" ? 64 :
        entity.type === "well" ? 48 :
        entity.type === "fence" ? 48 :
        entity.type === "rock" ? 32 :
        entity.type === "bush" ? 34 :
        entity.type === "flowers" ? 28 :
        entity.type === "bamboo" ? 82 :
        entity.type === "shrine" ? 88 :
        entity.type === "lantern" ? 42 :
        entity.type === "bridge" ? 92 : 36;
      const size = baseSize * entity.scale * zoom;

      // P2.11: READY visual atlas first; procedural fallback remains only for
      // asset types that are genuinely not yet promoted.
      const resolution = resolveEntityAsset(entity.asset);
      let spriteRendered = false;
      if (isEntityAssetReady(resolution)) {
        spriteRendered = drawReadyEntitySprite(resolution.entry, screen.x, screen.y, size);
      }

      // Procedural fallback (always drawn if sprite not rendered).
      if (!spriteRendered) {
        switch (entity.type) {
          case "tree":
            drawRect(screen.x - 4, screen.y - 4, 8, 16, COLORS.treeTrunk);
            drawCircle(screen.x, screen.y - 12, size / 2, COLORS.tree);
            break;
          case "house":
            drawRect(
              screen.x - size / 2,
              screen.y - size / 3,
              size,
              size * 0.6,
              COLORS.house,
            );
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
            drawRect(screen.x - size / 2, screen.y - 8, 4, 16, COLORS.fence);
            drawRect(screen.x + size / 2 - 4, screen.y - 8, 4, 16, COLORS.fence);
            break;
          default:
            drawCircle(screen.x, screen.y, size / 3, "#9ca3af");
        }
      }
    }
  }

  function isInteractionAllowed(interaction: { kind: string; ref: string }, allowedNpcIds?: readonly string[]): boolean {
    if (
      interaction.kind === "NPC" &&
      allowedNpcIds &&
      !allowedNpcIds.includes(interaction.ref.replace(/^npc\./, ""))
    ) return false;
    return true;
  }

  function interactionLabel(interaction: { kind: string; ref: string }): string {
    if (interaction.kind === "NPC") {
      const names: Record<string, string> = {
        "npc.ki": "Ki Jaka", "npc.ratmi": "Bu Ratmi", "npc.sari": "Bu Sari",
        "npc.eyang": "Eyang Kartala", "npc.empu": "Pak Empu", "npc.bagas": "Bagas",
        "npc.tani": "Pak Warsa", "npc.pendaki": "Pendaki",
      };
      return names[interaction.ref] ?? "Karakter";
    }
    if (interaction.kind === "CHEST") return "Peti";
    if (interaction.kind === "PORTAL") return "Gerbang";
    return "Interaksi";
  }

  /** Render interaction points (portals, chests). */
  function renderInteractions(state: RPGGameState, camera: RPGCameraState, allowedNpcIds?: readonly string[]) {
    const zoom = clampZoom(camera.zoom ?? 1);
    const nearest = findNearestInteraction(state.world, state.player.position);
    for (const interaction of state.world.interactions) {
      if (!isInteractionAllowed(interaction, allowedNpcIds)) continue;
      const screen = worldToScreenScaled(
        interaction.position, camera,
        state.world.tiles.width, state.world.tiles.height,
      );

      if (nearest?.id === interaction.id && isInteractionAllowed(interaction, allowedNpcIds)) {
        const pulse = 0.5 + Math.sin(performance.now() / 260) * 0.15;
        ctx.save();
        ctx.globalAlpha = 0.28 + pulse * 0.18;
        ctx.strokeStyle = "#fde68a";
        ctx.lineWidth = Math.max(1.5, 2 * zoom);
        ctx.beginPath();
        ctx.arc(screen.x, screen.y - 2 * zoom, 22 * zoom + pulse * 3 * zoom, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#fde68a";
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - 30 * zoom);
        ctx.lineTo(screen.x - 5 * zoom, screen.y - 38 * zoom);
        ctx.lineTo(screen.x + 5 * zoom, screen.y - 38 * zoom);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

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
        case "NPC": {
          const npcAssetKeys: Record<string, string> = {
            "npc.ki": "npc.ki-jaka",
            "npc.ratmi": "npc.bu-ratmi",
            "npc.sari": "npc.bu-sari",
            "npc.eyang": "npc.eyang-kartala",
            "npc.empu": "npc.pak-empu",
            "npc.bagas": "npc.bagas",
            "npc.tani": "npc.pak-warsa",
            "npc.pendaki": "npc.pendaki",
          };
          const resolution = resolveEntityAsset(npcAssetKeys[interaction.ref]);
          const rendered = isEntityAssetReady(resolution)
            ? drawReadyEntitySprite(resolution.entry, screen.x, screen.y, 52 * zoom)
            : false;
          if (!rendered) {
            // Explicit technical fallback only when an asset is unavailable.
            drawCircle(screen.x, screen.y - 12, 11 * zoom, "#78350f");
            drawCircle(screen.x, screen.y - 18, 6 * zoom, "#fbbf24");
          }
          const npcNames: Record<string, string> = {
            "npc.ki": "Ki Jaka", "npc.ratmi": "Bu Ratmi", "npc.sari": "Bu Sari",
            "npc.eyang": "Eyang Kartala", "npc.bagas": "Bagas", "npc.tani": "Pak Warsa",
            "npc.empu": "Pak Empu", "npc.pendaki": "Pak Pendaki",
          };
          const name = npcNames[interaction.ref];
          if (name) {
            ctx.fillStyle = "#fff7ed";
            ctx.font = `bold ${Math.round(11 * zoom)}px sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText(name, screen.x, screen.y - 38 * zoom);
          }
          break;
        }
      }
    }
  }

  /** Procedural encounter markers; no enemy artwork is promoted here. */
  function renderLiveEnemies(
    state: RPGGameState,
    camera: RPGCameraState,
    liveEnemies: readonly LiveEnemy[],
  ) {
    const zoom = clampZoom(camera.zoom ?? 1);
    for (const enemy of liveEnemies) {
      if (!enemy.alive) continue;
      const screen = worldToScreenScaled(
        { x: (enemy.tile.x + 0.5) / state.world.tiles.width, y: (enemy.tile.y + 0.5) / state.world.tiles.height },
        camera, state.world.tiles.width, state.world.tiles.height,
      );
      const resolution = resolveEntityAsset(enemy.def.asset);
      const maxSize = enemy.boss ? 92 * zoom : 58 * zoom;
      const rendered = isEntityAssetReady(resolution)
        ? drawReadyEntitySprite(resolution.entry, screen.x, screen.y, maxSize)
        : false;
      if (!rendered) {
        // Explicit technical fallback only when an enemy asset is unavailable.
        drawCircle(screen.x, screen.y - 13 * zoom, 12 * zoom, "#7f1d1d");
        drawCircle(screen.x - 4 * zoom, screen.y - 16 * zoom, 2 * zoom, "#fef3c7");
        drawCircle(screen.x + 4 * zoom, screen.y - 16 * zoom, 2 * zoom, "#fef3c7");
      }
      ctx.fillStyle = enemy.boss ? "#fff7ed" : "#fee2e2";
      ctx.font = `bold ${Math.round((enemy.boss ? 11 : 10) * zoom)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(enemy.def.name, screen.x, screen.y - (maxSize + 8 * zoom));
    }
  }

  /**
   * Render the player character.
   *
   * Uses only manifest READY walk sheets. Frame zero is the explicit technical
   * idle fallback until approved idle art arrives; the fallback disc is shown
   * only while the approved image is loading or unavailable at runtime.
   */
  function renderPlayer(state: RPGGameState, camera: RPGCameraState) {
    const player = state.player;
    const zoom = clampZoom(camera.zoom ?? 1);
    // Feet origin: gameplay position == bottom-center contact point.
    const r = 12 * zoom;
    const now = performance.now();
    if (
      !lastPlayerPosition ||
      Math.abs(lastPlayerPosition.x - player.position.x) > 0.000001 ||
      Math.abs(lastPlayerPosition.y - player.position.y) > 0.000001
    ) {
      lastPlayerPosition = { ...player.position };
      lastPlayerMoveAt = now;
    }

    // Presentation-only locomotion smoothing. Authoritative position stays
    // untouched; the sprite eases toward it so fixed-tick movement reads as
    // continuous motion instead of a sequence of micro-snaps.
    if (!visualPlayerPosition) {
      visualPlayerPosition = { ...player.position };
    } else {
      const dx = player.position.x - visualPlayerPosition.x;
      const dy = player.position.y - visualPlayerPosition.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 0.14) {
        visualPlayerPosition = { ...player.position };
      } else {
        const smoothing = 0.24;
        visualPlayerPosition = {
          x: visualPlayerPosition.x + dx * smoothing,
          y: visualPlayerPosition.y + dy * smoothing,
        };
      }
    }

    const feet = worldToScreenScaled(
      visualPlayerPosition, camera,
      state.world.tiles.width, state.world.tiles.height,
    );

    // Shadow (engine-baked ellipse at the feet origin, never in sprite art)
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.ellipse(feet.x, feet.y + 2 * zoom, r * 0.85, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.globalAlpha = 1;

    const entry = argaEntryForFacing(player.facing);
    if (entry) requestArga(entry);
    const image = entry ? argaImages.get(entry.path) : undefined;
    if (entry && image) {
      const moving = now - lastPlayerMoveAt < 120;
      const frame = moving ? frameAt(clipFor("walk", entry.frames, true, 80), now) : 0;
      const source = spriteFrameRect({
        frameWidthPx: entry.width / entry.frames,
        frameHeightPx: entry.height,
        columns: entry.frames,
        index: frame,
      });
      const dest = spriteDrawRect({
        feetX: feet.x,
        feetY: feet.y,
        canvasWidthPx: HERO_CANVAS_PX,
        canvasHeightPx: HERO_CANVAS_PX,
        scale: 0.5 * zoom,
        mirror: mirrorForDirection(player.facing),
      });
      if (dest.mirror) {
        ctx.save();
        ctx.translate(dest.dx + dest.dw / 2, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(image, source.sx, source.sy, source.sw, source.sh, -dest.dw / 2, dest.dy, dest.dw, dest.dh);
        ctx.restore();
      } else {
        ctx.drawImage(image, source.sx, source.sy, source.sw, source.sh, dest.dx, dest.dy, dest.dw, dest.dh);
      }
      return;
    }

    // Technical load/error fallback, visibly distinct from approved artwork.
    drawCircle(feet.x, feet.y - r, r, COLORS.player);
    ctx.strokeStyle = COLORS.playerOutline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(feet.x, feet.y - r, r, 0, Math.PI * 2);
    ctx.stroke();
    drawTriangle(feet.x, feet.y - r, 6 * zoom, player.facing, "#fff");
  }

  /** Render contextual interaction prompt when near an interactable. */
  function renderInteractionPrompt(state: RPGGameState, camera: RPGCameraState, allowedNpcIds?: readonly string[]) {
    const nearest = findNearestInteraction(state.world, state.player.position);
    if (!nearest || !isInteractionAllowed(nearest, allowedNpcIds)) return;

    const screen = worldToScreenScaled(
      nearest.position, camera,
      state.world.tiles.width, state.world.tiles.height,
    );
    const zoom = clampZoom(camera.zoom ?? 1);
    const pulse = 0.5 + Math.sin(performance.now() / 320) * 0.12;
    const action = nearest.kind === "NPC" ? "Bicara" : nearest.kind === "CHEST" ? "Buka" : "Masuk";
    const label = `${action} · ${interactionLabel(nearest)}`;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.round(11 * zoom)}px sans-serif`;
    const textWidth = ctx.measureText(label).width;
    const boxW = textWidth + 54 * zoom;
    const boxH = 28 * zoom;
    const promptY = screen.y - 46 * zoom;

    ctx.globalAlpha = 0.82 + pulse * 0.12;
    ctx.fillStyle = "rgba(15, 23, 42, 0.86)";
    ctx.beginPath();
    ctx.roundRect(screen.x - boxW / 2, promptY - boxH / 2, boxW, boxH, 9 * zoom);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.roundRect(screen.x - boxW / 2 + 7 * zoom, promptY - 9 * zoom, 22 * zoom, 18 * zoom, 5 * zoom);
    ctx.fill();

    ctx.fillStyle = "#451a03";
    ctx.font = `900 ${Math.round(10 * zoom)}px sans-serif`;
    ctx.fillText("E", screen.x - boxW / 2 + 18 * zoom, promptY);

    ctx.fillStyle = "#fff7ed";
    ctx.font = `700 ${Math.round(11 * zoom)}px sans-serif`;
    ctx.fillText(label, screen.x + 12 * zoom, promptY);
    ctx.restore();
  }

  function updateCombatFeedback(
    state: RPGGameState,
    liveEnemies: readonly LiveEnemy[],
    nowMs: number,
  ): void {
    const battle = state.battle;
    if (!battle) {
      previousBattleId = null;
      previousBattlePlayerHp = null;
      previousBattleResult = undefined;
      previousBattleEnemyHp.clear();
      floatingDamages = floatingDamages.filter((d) => floatingDamageOpacity(d, nowMs) > 0);
      impactBursts = impactBursts.filter((b) => impactBurstOpacity(b, nowMs) > 0);
      return;
    }

    if (previousBattleId !== battle.battleId) {
      previousBattleId = battle.battleId;
      previousBattlePlayerHp = battle.player.hp;
      previousBattleResult = battle.result;
      previousBattleEnemyHp.clear();
      for (const enemy of battle.enemies) previousBattleEnemyHp.set(enemy.id, enemy.hp);
      return;
    }

    if (previousBattlePlayerHp !== null && battle.player.hp < previousBattlePlayerHp) {
      const damage = previousBattlePlayerHp - battle.player.hp;
      const intensity = Math.min(1, damage / Math.max(1, battle.player.maxHp) * 3);
      visualFeedback = triggerImpact(visualFeedback, nowMs, intensity);
      impactBursts.push(createImpactBurst(
        impactBurstSeq++, state.player.position.x, state.player.position.y, nowMs, intensity,
      ));
      floatingDamages.push({
        id: floatingDamageSeq++, value: damage,
        x: state.player.position.x, y: state.player.position.y,
        startedAtMs: nowMs, durationMs: 620, critical: false,
      });
    }

    for (const enemy of battle.enemies) {
      const previousHp = previousBattleEnemyHp.get(enemy.id);
      if (previousHp !== undefined && enemy.hp < previousHp) {
        const damage = previousHp - enemy.hp;
        const intensity = Math.min(1, damage / Math.max(1, enemy.maxHp) * 3);
        visualFeedback = triggerImpact(visualFeedback, nowMs, intensity);
        const live = liveEnemies.find((e) => e.instanceId === enemy.id);
        const pos = live
          ? { x: (live.tile.x + 0.5) / state.world.tiles.width, y: (live.tile.y + 0.5) / state.world.tiles.height }
          : state.player.position;
        impactBursts.push(createImpactBurst(
          impactBurstSeq++, pos.x, pos.y, nowMs, intensity,
        ));
        floatingDamages.push({
          id: floatingDamageSeq++, value: damage,
          x: pos.x, y: pos.y,
          startedAtMs: nowMs, durationMs: 620, critical: damage >= enemy.maxHp * 0.25,
        });
      }
      previousBattleEnemyHp.set(enemy.id, enemy.hp);
    }

    if (battle.result === "WIN" && previousBattleResult !== "WIN") {
      visualFeedback = triggerVictory(visualFeedback, nowMs);
      impactBursts.push(createImpactBurst(
        impactBurstSeq++, state.player.position.x, state.player.position.y, nowMs, 1, true,
      ));
    }

    previousBattlePlayerHp = battle.player.hp;
    previousBattleResult = battle.result;
    floatingDamages = floatingDamages.filter((d) => floatingDamageOpacity(d, nowMs) > 0);
    impactBursts = impactBursts.filter((b) => impactBurstOpacity(b, nowMs) > 0);
  }

  function renderFloatingDamage(
    camera: RPGCameraState,
    state: RPGGameState,
    nowMs: number,
  ): void {
    for (const damage of floatingDamages) {
      const opacity = floatingDamageOpacity(damage, nowMs);
      if (opacity <= 0) continue;
      const screen = worldToScreenScaled(
        { x: damage.x, y: damage.y }, camera,
        state.world.tiles.width, state.world.tiles.height,
      );
      const y = screen.y + floatingDamageOffset(damage, nowMs);
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.textAlign = "center";
      ctx.font = damage.critical ? "900 18px sans-serif" : "800 15px sans-serif";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(15, 23, 42, 0.9)";
      ctx.strokeText(`-${damage.value}`, screen.x, y);
      ctx.fillStyle = damage.critical ? "#fbbf24" : "#fff7ed";
      ctx.fillText(`-${damage.value}`, screen.x, y);
      ctx.restore();
    }
  }

  function renderImpactBursts(
    camera: RPGCameraState,
    state: RPGGameState,
    nowMs: number,
  ): void {
    impactBursts = impactBursts.filter((burst) => impactBurstOpacity(burst, nowMs) > 0);
    for (const burst of impactBursts) {
      const opacity = impactBurstOpacity(burst, nowMs);
      if (opacity <= 0) continue;
      const center = worldToScreenScaled(
        { x: burst.x, y: burst.y }, camera,
        state.world.tiles.width, state.world.tiles.height,
      );
      const count = burst.victory ? 12 : 8;
      for (let i = 0; i < count; i += 1) {
        const particle = impactBurstParticle(burst, i, nowMs);
        const point = worldToScreenScaled(
          {
            x: particle.x,
            y: particle.y,
          },
          camera,
          state.world.tiles.width,
          state.world.tiles.height,
        );
        ctx.save();
        ctx.globalAlpha = particle.opacity * 0.92;
        ctx.strokeStyle = burst.victory ? "#fbbf24" : "#fff7ed";
        ctx.lineWidth = Math.max(1, particle.size);
        const dx = point.x - center.x;
        const dy = point.y - center.y;
        const length = Math.max(3, particle.size * 2.5);
        const magnitude = Math.hypot(dx, dy) || 1;
        const nx = dx / magnitude;
        const ny = dy / magnitude;
        ctx.beginPath();
        ctx.moveTo(point.x - nx * length, point.y - ny * length);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  /**
   * Lightweight scene atmosphere: authored tint + vignette by canonical map.
   * This is presentation-only and keeps gameplay coordinates untouched.
   */
  function renderAtmosphere(state: RPGGameState): void {
    const mapId = state.world.mapId;
    const tint = mapId === "map.menara"
      ? "rgba(64, 74, 120, 0.12)"
      : mapId === "map.gunung"
        ? "rgba(112, 78, 48, 0.08)"
        : "rgba(244, 190, 92, 0.055)";

    ctx.save();
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, width, height);

    const vignette = ctx.createRadialGradient(
      width / 2, height * 0.46, Math.min(width, height) * 0.18,
      width / 2, height * 0.46, Math.max(width, height) * 0.72,
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(12, 18, 24, 0.22)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  /** Main render function — called by game loop. */
  function render(
    state: RPGGameState,
    camera: RPGCameraState,
    liveEnemies: readonly LiveEnemy[] = [],
    allowedNpcIds?: readonly string[],
  ) {
    const nowMs = performance.now();
    updateCombatFeedback(state, liveEnemies, nowMs);

    if (nowMs < visualFeedback.freezeUntilMs) return;

    // P2.11: preload visible runtime art to avoid procedural→sprite pop once approved assets exist.
    for (const interaction of state.world.interactions) {
      if (interaction.kind === "NPC") {
        const npcAssetKeys: Record<string, string> = {
          "npc.ki": "npc.ki-jaka", "npc.ratmi": "npc.bu-ratmi", "npc.sari": "npc.bu-sari",
          "npc.eyang": "npc.eyang-kartala",
          "npc.empu": "npc.pak-empu", "npc.bagas": "npc.bagas",
          "npc.tani": "npc.pak-warsa", "npc.pendaki": "npc.pendaki",
        };
        preloadRuntimeAsset(npcAssetKeys[interaction.ref]);
      }
    }
    for (const enemy of liveEnemies) preloadRuntimeAsset(enemy.def.asset);

    // Clear canvas before applying presentation shake.
    ctx.clearRect(0, 0, width, height);
    const shake = shakeOffset(visualFeedback, nowMs);
    ctx.save();
    ctx.translate(shake.x, shake.y);

    // Background
    ctx.fillStyle = COLORS.grassDark;
    ctx.fillRect(0, 0, width, height);

    // Render layers in order
    renderTiles(state, camera);
    renderEntities(state, camera);
    renderInteractions(state, camera, allowedNpcIds);
    renderLiveEnemies(state, camera, liveEnemies);
    renderPlayer(state, camera);
    renderInteractionPrompt(state, camera, allowedNpcIds);
    renderFloatingDamage(camera, state, nowMs);
    renderImpactBursts(camera, state, nowMs);
    ctx.restore();

    const alpha = flashAlpha(visualFeedback, nowMs);
    if (alpha > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(255, 244, 230, " + (alpha * 0.55) + ")";
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
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
