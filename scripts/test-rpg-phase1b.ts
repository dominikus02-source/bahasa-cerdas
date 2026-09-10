/**
 * RPG Phase 1B — Unit Tests
 *
 * Tests for:
 * - Collision detection
 * - Interaction system
 * - Persistence boundary
 *
 * Run: npx tsx scripts/test-rpg-phase1b.ts
 */

import { checkCollision, findNearestInteractable } from "../src/game/rpg/world/collision";
import { findNearestInteraction, processInteraction, isNearInteractable } from "../src/game/rpg/world/interaction";
import { createLocalStoragePersistence, createNoopPersistence } from "../src/game/rpg/core/persistence";
import { MAP_VILLAGE_SQUARE } from "../src/game/rpg/data/maps";
import type { RPGWorldState } from "../src/game/rpg/world/world-state";
import type { RPGGameState } from "../src/game/rpg/core/game-state";
import { createInitialGameState } from "../src/game/rpg/core/game-state";
import { createDefaultPlayer } from "../src/game/rpg/player/player-state";

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

// ── Test Data ─────────────────────────────────────────────────────────

const testWorld: RPGWorldState = {
  mapId: "map.village-square",
  tiles: MAP_VILLAGE_SQUARE.tiles,
  entities: MAP_VILLAGE_SQUARE.entities,
  interactions: MAP_VILLAGE_SQUARE.interactions,
};

// ── Collision Tests ───────────────────────────────────────────────────

console.log("\n🚧 Collision Tests");

{
  // Open space - should be allowed
  const openResult = checkCollision(testWorld, { x: 0.5, y: 0.5 });
  assert(openResult.allowed, "Open space allows movement");
  assert(openResult.blockedBy === null, "No entity blocks in open space");

  // Near a tree - should be blocked
  const treePos = { x: 0.06, y: 0.18 }; // ent.tree.1
  const nearTree = checkCollision(testWorld, treePos);
  assert(!nearTree.allowed, "Position inside tree is blocked");
  assert(nearTree.blockedBy !== null, "Tree blocks movement");

  // Near a house - should be blocked
  const housePos = { x: 0.22, y: 0.16 }; // ent.house.1
  const nearHouse = checkCollision(testWorld, housePos);
  assert(!nearHouse.allowed, "Position inside house is blocked");

  // Near a bush (not solid) - should be allowed
  const bushPos = { x: 0.35, y: 0.3 }; // ent.bush.1
  const nearBush = checkCollision(testWorld, bushPos);
  assert(nearBush.allowed, "Bush does not block (not solid)");

  // Near flowers (not solid) - should be allowed
  const flowersPos = { x: 0.42, y: 0.68 }; // ent.flowers.1
  const nearFlowers = checkCollision(testWorld, flowersPos);
  assert(nearFlowers.allowed, "Flowers do not block (not solid)");

  // Collision resolution pushes player out (slightly inside the entity)
  const resolvedPos = checkCollision(testWorld, { x: 0.07, y: 0.19 });
  assert(
    resolvedPos.position.x !== 0.07 || resolvedPos.position.y !== 0.19,
    "Collision resolves position"
  );
}

// ── Interaction Tests ─────────────────────────────────────────────────

console.log("\n🤝 Interaction Tests");

{
  // Near portal - should find it
  const portalPos = { x: 0.5, y: 0.94 }; // int.portal.south
  const nearPortal = findNearestInteraction(testWorld, portalPos, 0.1);
  assert(nearPortal !== null, "Found portal near position");
  assert(nearPortal?.kind === "PORTAL", "Portal is PORTAL type");

  // Near chest - should find it
  const chestPos = { x: 0.3, y: 0.55 }; // int.chest.1
  const nearChest = findNearestInteraction(testWorld, chestPos, 0.1);
  assert(nearChest !== null, "Found chest near position");
  assert(nearChest?.kind === "CHEST", "Chest is CHEST type");

  // Far from any interaction - should not find
  const farPos = { x: 0.1, y: 0.1 };
  const farResult = findNearestInteraction(testWorld, farPos, 0.05);
  assert(farResult === null, "No interaction found far away");

  // Process portal interaction
  if (nearPortal) {
    const result = processInteraction(nearPortal, { items: [] });
    assert(result.success, "Portal interaction succeeds");
    assert(result.type === "PORTAL", "Portal interaction type is PORTAL");
    assert(
      result.payload.kind === "PORTAL" && result.payload.targetMapId === "map.forest-path",
      "Portal targets correct map"
    );
  }

  // Process chest interaction
  if (nearChest) {
    const result = processInteraction(nearChest, { items: [] });
    assert(result.success, "Chest interaction succeeds");
    assert(result.type === "CHEST", "Chest interaction type is CHEST");
    assert(
      result.payload.kind === "LOOT" && result.payload.items.length > 0,
      "Chest gives loot"
    );
  }

  // isNearInteractable
  assert(isNearInteractable(testWorld, portalPos, 0.1), "Player near interactable");
  assert(!isNearInteractable(testWorld, farPos, 0.05), "Player not near interactable");
}

// ── Persistence Tests ─────────────────────────────────────────────────

console.log("\n💾 Persistence Tests");

{
  // Noop persistence
  const noop = createNoopPersistence();
  assert(!noop.exists(), "Noop persistence has no saves");
  assert(noop.load() === null, "Noop persistence loads null");
  assert(!noop.save({} as RPGGameState), "Noop persistence save returns false");

  // Create a test game state
  const player = createDefaultPlayer("test-player", "Test Hero");
  const gameState: RPGGameState = {
    ...createInitialGameState("test-player"),
    player,
    world: {
      mapId: "map.village-square",
      tiles: MAP_VILLAGE_SQUARE.tiles,
      entities: MAP_VILLAGE_SQUARE.entities,
      interactions: MAP_VILLAGE_SQUARE.interactions,
    },
  };

  // Note: localStorage tests only work in browser environment
  // These tests verify the contract, not the implementation
  console.log("  ℹ️  localStorage tests require browser environment");
  console.log("  ℹ️  Testing noop persistence contract only");

  // Verify persistence interface
  assert(typeof noop.save === "function", "Persistence has save method");
  assert(typeof noop.load === "function", "Persistence has load method");
  assert(typeof noop.clear === "function", "Persistence has clear method");
  assert(typeof noop.exists === "function", "Persistence has exists method");
}

// ── Integration Tests ─────────────────────────────────────────────────

console.log("\n🔗 Integration Tests");

{
  // Verify collision + interaction work together
  const playerPos = { x: 0.5, y: 0.94 }; // Near portal
  const collision = checkCollision(testWorld, playerPos);
  assert(collision.allowed, "Player can stand near portal");

  const interaction = findNearestInteraction(testWorld, playerPos, 0.1);
  assert(interaction !== null, "Player can interact with portal");

  // Verify no collision with interaction points
  const interactionPos = interaction?.position;
  if (interactionPos) {
    const interactionCollision = checkCollision(testWorld, interactionPos);
    assert(interactionCollision.allowed, "Interaction point is not solid");
  }
}

// ── Summary ───────────────────────────────────────────────────────────

console.log("\n" + "=".repeat(50));
console.log(`\n📊 Results: ${passed}/${total} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
