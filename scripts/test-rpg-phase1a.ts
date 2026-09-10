/**
 * RPG Phase 1A — Unit Tests
 *
 * Tests for:
 * - Movement (up/down/left/right, boundary clamping)
 * - Progression (XP gain, level-up threshold)
 * - Game State (initial state valid, player exists, world exists)
 * - Input (keyboard command mapping, memory input source)
 * - Camera (coordinate transformation)
 *
 * Run: npx tsx scripts/test-rpg-phase1a.ts
 */

import { createDefaultPlayer, type RPGPlayerState } from "../src/game/rpg/player/player-state";
import { stepPlayer, faceDirection, RPG_BASE_SPEED_UNITS_PER_SEC } from "../src/game/rpg/player/movement";
import { grantXp, xpForLevel, RPG_XP_BASE } from "../src/game/rpg/player/progression";
import { clampToWorld, RPG_WORLD_BOUNDS } from "../src/game/rpg/core/constants";
import { createInitialGameState, type RPGGameState } from "../src/game/rpg/core/game-state";
import { createMemoryInputSource } from "../src/game/rpg/core/input";
import type { RPGCommand } from "../src/game/rpg/core/input";
import { createCamera, followTarget, worldToScreen, screenToWorld, resizeCamera } from "../src/game/rpg/rendering/camera";
import { MAP_VILLAGE_SQUARE } from "../src/game/rpg/data/maps";
import { validateWorldState } from "../src/game/rpg/world/world-state";

// ── Test Helpers ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition: boolean, message: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.log(`  ❌ ${message}`);
  }
}

function assertApprox(a: number, b: number, epsilon: number, message: string) {
  assert(Math.abs(a - b) < epsilon, `${message} (${a} ≈ ${b})`);
}

// ── Movement Tests ────────────────────────────────────────────────────

console.log("\n🏃 Movement Tests");

{
  const player = createDefaultPlayer("test-1", "Test");
  const dt = 1; // 1 second

  // Up movement
  const upPlayer = faceDirection(player, "up");
  const up = stepPlayer(upPlayer, dt, true);
  assert(up.position.y < player.position.y, "Up movement decreases Y");
  assert(up.position.x === player.position.x, "Up movement doesn't change X");

  // Down movement
  const downPlayer = faceDirection(player, "down");
  const down = stepPlayer(downPlayer, dt, true);
  assert(down.position.y > player.position.y, "Down movement increases Y");

  // Left movement
  const leftPlayer = faceDirection(player, "left");
  const left = stepPlayer(leftPlayer, dt, true);
  assert(left.position.x < player.position.x, "Left movement decreases X");

  // Right movement
  const rightPlayer = faceDirection(player, "right");
  const right = stepPlayer(rightPlayer, dt, true);
  assert(right.position.x > player.position.x, "Right movement increases X");

  // No movement when not moving
  const stationary = stepPlayer(player, dt, false);
  assert(
    stationary.position.x === player.position.x && stationary.position.y === player.position.y,
    "No movement when moving=false"
  );

  // Boundary clamping
  const edgePlayer = createDefaultPlayer("edge", "Edge");
  edgePlayer.position = { x: 0.99, y: 0.99 };
  edgePlayer.facing = "right";
  const clamped = stepPlayer(edgePlayer, dt, true);
  assert(clamped.position.x <= RPG_WORLD_BOUNDS.max.x, "X clamped to world max");
  assert(clamped.position.y <= RPG_WORLD_BOUNDS.max.y, "Y clamped to world max");

  // Facing direction
  const faced = faceDirection(player, "left");
  assert(faced.facing === "left", "Face direction updates correctly");
  assert(faced.position.x === player.position.x, "Facing doesn't change position");
}

// ── Progression Tests ─────────────────────────────────────────────────

console.log("\n📈 Progression Tests");

{
  const progression = { level: 1, xp: 0, xpToNextLevel: xpForLevel(1) };

  // XP gain
  const afterGain = grantXp(progression, 50);
  assert(afterGain.xp === 50, "XP gained correctly");
  assert(afterGain.level === 1, "No level up at 50 XP");

  // Level up
  const afterLevelUp = grantXp(progression, 100);
  assert(afterLevelUp.level === 2, "Level up at 100 XP");
  assert(afterLevelUp.xp === 0, "XP resets after level up");

  // Multiple level ups
  const bigGain = grantXp(progression, 1000);
  assert(bigGain.level > 2, "Multiple level ups with large XP gain");
  assert(bigGain.xp >= 0, "XP non-negative after level up");
  assert(bigGain.xp < bigGain.xpToNextLevel, "XP less than next threshold");

  // Level doesn't regress
  const noRegression = grantXp(progression, 0);
  assert(noRegression.level === 1, "Level doesn't regress with 0 XP");

  // XP formula
  const xp1 = xpForLevel(1);
  const xp2 = xpForLevel(2);
  assert(xp2 > xp1, "XP requirement increases with level");
}

// ── Game State Tests ──────────────────────────────────────────────────

console.log("\n🎮 Game State Tests");

{
  const state = createInitialGameState("player-1");

  assert(state.session.playerId === "player-1", "Player ID set correctly");
  assert(state.session.mode === "ADVENTURE", "Initial mode is ADVENTURE");
  assert(state.session.sessionId.length > 0, "Session ID generated");
  assert(state.battle === null, "No active battle");
}

// ── World State Tests ─────────────────────────────────────────────────

console.log("\n🌍 World State Tests");

{
  const map = MAP_VILLAGE_SQUARE;
  const world = {
    mapId: map.id,
    tiles: map.tiles,
    entities: map.entities,
    interactions: map.interactions,
  };

  const errors = validateWorldState(world);
  assert(errors.length === 0, `World state valid (${errors.length} errors: ${errors.join(", ")})`);
  assert(world.tiles.width === 16, "Map width is 16");
  assert(world.tiles.height === 12, "Map height is 12");
  assert(world.entities.length > 0, `Map has entities (${world.entities.length})`);
  assert(world.interactions.length > 0, `Map has interactions (${world.interactions.length})`);
}

// ── Input Tests ───────────────────────────────────────────────────────

console.log("\n⌨️ Input Tests");

{
  const source = createMemoryInputSource();

  // Push and drain
  const cmd1: RPGCommand = { type: "MOVE", playerId: "p1", dir: "up" };
  const cmd2: RPGCommand = { type: "STOP_MOVE", playerId: "p1" };
  source.push(cmd1);
  source.push(cmd2);

  const drained = source.drain();
  assert(drained.length === 2, "Drain returns all commands");
  assert(drained[0].type === "MOVE", "First command is MOVE");
  assert(drained[1].type === "STOP_MOVE", "Second command is STOP_MOVE");

  // Drain clears queue
  const empty = source.drain();
  assert(empty.length === 0, "Drain clears queue");

  // Direction mapping
  const moveCmd: RPGCommand = { type: "MOVE", playerId: "p1", dir: "right" };
  source.push(moveCmd);
  const right = source.drain();
  assert(right[0].type === "MOVE" && (right[0] as any).dir === "right", "Direction preserved in command");
}

// ── Camera Tests ──────────────────────────────────────────────────────

console.log("\n📷 Camera Tests");

{
  // Create camera
  const cam = createCamera({ x: 0.5, y: 0.5 }, 800, 600);
  assert(cam.position.x === 0.5, "Camera X position");
  assert(cam.position.y === 0.5, "Camera Y position");
  assert(cam.viewportWidth === 800, "Camera viewport width");
  assert(cam.viewportHeight === 600, "Camera viewport height");

  // World to screen
  const screen = worldToScreen({ x: 0.5, y: 0.5 }, cam);
  assertApprox(screen.x, 400, 1, "Center world = center screen X");
  assertApprox(screen.y, 300, 1, "Center world = center screen Y");

  // Screen to world (inverse)
  const world = screenToWorld(screen, cam);
  assertApprox(world.x, 0.5, 0.001, "Inverse transform X");
  assertApprox(world.y, 0.5, 0.001, "Inverse transform Y");

  // Follow target
  const target = { x: 0.6, y: 0.6 };
  const followed = followTarget(cam, target);
  assert(
    followed.position.x > cam.position.x && followed.position.x < target.x,
    "Camera moves toward target"
  );

  // Resize
  const resized = resizeCamera(cam, 1024, 768);
  assert(resized.viewportWidth === 1024, "Resized width");
  assert(resized.viewportHeight === 768, "Resized height");
}

// ── Clamp to World Tests ──────────────────────────────────────────────

console.log("\n🔒 Clamp to World Tests");

{
  const clamped1 = clampToWorld({ x: -0.1, y: 0.5 });
  assert(clamped1.x >= 0, "Clamped X min");

  const clamped2 = clampToWorld({ x: 1.5, y: 0.5 });
  assert(clamped2.x <= 1, "Clamped X max");

  const clamped3 = clampToWorld({ x: 0.5, y: -0.1 });
  assert(clamped3.y >= 0, "Clamped Y min");

  const clamped4 = clampToWorld({ x: 0.5, y: 1.5 });
  assert(clamped4.y <= 1, "Clamped Y max");

  const inside = clampToWorld({ x: 0.5, y: 0.5 });
  assert(inside.x === 0.5 && inside.y === 0.5, "Inside bounds unchanged");
}

// ── Summary ───────────────────────────────────────────────────────────

console.log("\n" + "=".repeat(50));
console.log(`\n📊 Results: ${passed}/${total} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
