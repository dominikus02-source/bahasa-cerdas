# P2.6I.5 — Inventory & Equipment Authority: Implementation Design

**Gate Type**: Design-only (no implementation, no commit, no push)  
**Audit Source**: `docs/P2_6I4_INVENTORY_EQUIPMENT_FORENSIC_AUDIT.md`  
**Date**: September 2026  
**Status**: DRAFT — awaiting founder review

---

## Table of Contents

1. [Existing Schema Assessment](#1-existing-schema-assessment)
2. [Inventory Mutation Contract](#2-inventory-mutation-contract)
3. [Equipment Mutation Contract](#3-equipment-mutation-contract)
4. [weaponPlus Authority](#4-weaponplus-authority)
5. [itemPlan Settlement Decision](#5-itemplan-settlement-decision)
6. [Prototype ID Mapping](#6-prototype-id-mapping)
7. [Atomicity & Transactions](#7-atomicity--transactions)
8. [Idempotency](#8-idempotency)
9. [Server-Wins Hydration](#9-server-wins-hydration)
10. [Migration Strategy](#10-migration-strategy)
11. [Implementation Order](#11-implementation-order)
12. [Test Plan](#12-test-plan)

---

## 1. Existing Schema Assessment

### 1.1 PendekarPlayer Model (Prisma schema.prisma:2687)

```
model PendekarPlayer {
  id, userId, rpgLevel, rpgXp,
  mapKey, positionX, positionY, facing,
  hp, maxHp, mp, maxMp, attack, defense, speed,
  goldBalance,
  flags?, openedChests?, deadBossIds?,
  equipment?, questState?, pickedGe?,
  version, stateSchemaVersion, lastCheckpointAt
}
```

**`equipment` column** (Json?): Stores `{ weaponId, armorId, accessoryId }` — the three equipment slots. No `weaponPlus` field in the DB JSON. Default on creation = null ( hydrated as `{ weaponId: null, armorId: null, accessoryId: null }` from `createDefaultPlayer`).

### 1.2 PendekarInventoryItem Model (schema.prisma:2742)

```
model PendekarInventoryItem {
  id, playerId, itemKey, quantity, createdAt, updatedAt
  @@unique([playerId, itemKey])
}
```

**Status**: Table exists, relation exists (`player.inventoryItems`), projection reads from it (`server-state.ts:343`). **No mutation methods exist** — the table is read-only in production.

### 1.3 PendekarRewardReceipt (schema.prisma:2862)

```
model PendekarRewardReceipt {
  id, playerId, sourceType, sourceId, definitionVersion,
  status, rpgXp, globalXp, goldDelta, itemPlan?,
  failureCode?, settledAt?, createdAt, updatedAt
  @@unique([playerId, sourceType, sourceId])
}
```

**`itemPlan` column** (Json?): Exists in schema but **explicitly rejected** during settlement (`assertSettleableBattleReceipt` at `server-state.ts:1562`: `receipt.itemPlan !== null` → error). Currently always null.

### 1.4 What Already Works (READ)

| Component | Status | File |
|-----------|--------|------|
| Projection reads inventory | ✅ | `server-state.ts:343` — maps `inventoryItems` → `{ itemKey, quantity }[]` |
| Projection reads equipment | ✅ | `server-state.ts:332-336` — reads `equipment` Json column |
| Hydration reads inventory | ✅ | `persistence.ts:218-219` — maps projection → `RPGInventoryItem[]` |
| Hydration reads equipment | ✅ | `persistence.ts:204-209` — maps projection → `RPGEquipment` (weaponPlus hardcoded 0) |
| Pure inventory ops | ✅ | `inventory.ts` — `addItem`, `removeItem`, `equipItem` (all pure) |
| Pure economy ops | ✅ | `economy.ts` — `applyShopPurchase`, `applyForgeUpgrade` (all pure) |
| Pure forge validation | ✅ | `forge.ts` — `validateForge` (pure) |
| Pure shop validation | ✅ | `shop.ts` — `validatePurchase` (pure) |
| Pure chest rewards | ✅ | `rewards.ts` — `applyChestRewards` (pure, equipment as intents) |

### 1.5 What Is MISSING (WRITE)

| Gap | Severity | Impact |
|-----|----------|--------|
| No `mutateInventory` server method | HIGH | Shop purchases, chest rewards, battle drops, consume, fish sell — all client-only until `saveCheckpoint` |
| No `mutateEquipment` server method | HIGH | Forge upgrades, equip/unequip — all client-only forever (no saveCheckpoint writes equipment) |
| `weaponPlus` absent from DB/equipment Json | MEDIUM | Forge applies `weaponPlus` in-memory only; hydration resets to 0; forge progress lost on reload |
| `itemPlan` rejected in settlement | MEDIUM | Battle item drops cannot be settled server-side; all item rewards deferred |
| Prototype `wpn`/`arm` unmapped to `equip.*` | LOW | Shop gear and chest gear cannot be applied to equipment state |

---

## 2. Inventory Mutation Contract

### 2.1 Design Principle

The pure inventory operations (`addItem`, `removeItem` in `inventory.ts`) already define correct in-memory transitions. The server mutation wraps these in a DB transaction with ownership, idempotency, and optimistic locking.

### 2.2 New Method: `mutateInventory`

```typescript
// lib/game/rpg/server-state.ts — add to PendekarServerState class

type InventoryMutationKind =
  | "SHOP_PURCHASE"    // shop buy: addItem
  | "CHEST_GRANT"      // chest open: addItem per item
  | "BATTLE_DROP"      // victory drop: addItem
  | "CONSUME"          // use item: removeItem
  | "FISH_SELL"        // sell all fish: removeItem × 3
  | "FORGE_COST";      // forge material: removeItem (bijih)

interface InventoryMutationInput {
  kind: InventoryMutationKind;
  /** Unique key for idempotency (e.g. `shop:${txSeq}`, `chest:${chestId}`, `battle-drop:${battleId}:${itemId}`). */
  requestKey: string;
  /** Items to add (kind SHOP_PURCHASE, CHEST_GRANT, BATTLE_DROP). */
  adds?: Array<{ itemKey: string; quantity: number }>;
  /** Items to remove (kind CONSUME, FISH_SELL, FORGE_COST). */
  removes?: Array<{ itemKey: string; quantity: number }>;
}

interface InventoryMutationResult {
  category: "APPLIED" | "REPLAYED";
  inventory: Array<{ itemKey: string; quantity: number }>;
  version: number;
}
```

### 2.3 Server Logic

```
mutateInventory(userId, input):
  1. getOwnedPendekarPlayer(userId) — ownership gate
  2. serializable(tx):
     a. Re-fetch player + inventoryItems under serializable
     b. Replay guard: dedupKey = `${userId}:${input.requestKey}`
        - If seen → return REPLAYED with current inventory
        - If new → add to replayGuard
     c. Validate:
        - adds/removes must not be empty
        - For each remove: check current quantity ≥ requested (else fail)
        - For CONSUME: validate itemId is consumable via canonicalItemById
        - For FISH_SELL: validate f1/f2/f3 quantities match removes
     d. Apply:
        - For each add: upsert PendekarInventoryItem (quantity += add.quantity)
        - For each remove: decrement quantity, delete row if reaches 0
     e. Optimistic lock: update PendekarPlayer.version += 1
     f. Return APPLIED + new inventory snapshot
```

### 2.4 Client Wiring

The client currently applies inventory changes in-memory via the pure functions. After `mutateInventory` exists:

1. **Fire-and-forget**: After each in-memory inventory mutation, fire `mutateInventory` via `fireServerCall` (same pattern as `mutateQuestState`).
2. **Server = truth**: On next hydration, server inventory overwrites client.
3. **Optimistic UX**: Client shows the change immediately; server confirms in background.

### 2.5 Trigger Points (6 locations in game-engine.ts)

| Trigger | Engine Line | RequestKey Pattern | Adds | Removes |
|---------|------------|-------------------|------|---------|
| Shop purchase | L1446 | `shop:${txSeq}` | `[{itemKey, quantity}]` | — |
| Fish sell | L1414 | `fish-sell:${txSeq}` | — | `[{f1, qty}, {f2, qty}, {f3, qty}]` |
| Chest open | L1008 | `chest:${chestId}` | `[{ram, qty}, ...]` | — |
| Battle drop (bijih) | L674 | `drop-${battleId}-${itemId}` | `[{bijih, 1}]` | — |
| Forge cost (bijih) | L1510 | `forge:${txSeq}` | — | `[{bijih, 1}]` |
| Consume (HP/MP) | L1254+ | `consume:${itemId}-${txSeq}` | — | `[{itemId, 1}]` |

---

## 3. Equipment Mutation Contract

### 3.1 Design Principle

Equipment state is the three-slot map (`weaponId`, `armorId`, `accessoryId`) plus `weaponPlus`. Mutations are rare (forge upgrade, equip/upgrade from shop/chest). The server method owns the authoritative write.

### 3.2 New Method: `mutateEquipment`

```typescript
type EquipmentMutationKind =
  | "FORGE_UPGRADE"    // Pak Empu forge: weaponPlus += 1
  | "EQUIP"            // equip an item from inventory to a slot
  | "UNEQUIP";         // remove item from slot back to inventory

interface EquipmentMutationInput {
  kind: EquipmentMutationKind;
  requestKey: string;
  /** FORGE_UPGRADE: weaponPlus value to set (server validates +1). */
  weaponPlus?: number;
  /** EQUIP/UNEQUIP: slot + itemKey. */
  slot?: "weapon" | "armor" | "accessory";
  itemKey?: string;
}

interface EquipmentMutationResult {
  category: "APPLIED" | "REPLAYED";
  equipment: { weaponId: string | null; armorId: string | null; accessoryId: string | null; weaponPlus: number };
  inventory?: Array<{ itemKey: string; quantity: number }>; // for EQUIP/UNEQUIP (inventory side-effect)
  version: number;
}
```

### 3.3 Server Logic

```
mutateEquipment(userId, input):
  1. getOwnedPendekarPlayer(userId) — ownership gate
  2. serializable(tx):
     a. Re-fetch player + equipment + inventoryItems under serializable
     b. Replay guard (same pattern)
     c. Validate + apply per kind:
        - FORGE_UPGRADE:
          * Read current equipment JSON → weaponPlus
          * Validate: currentPlus < FORGE_MAX_PLUS (5)
          * Validate: weaponPlus === currentPlus + 1 (server-derived, not client-chosen)
          * Update equipment JSON: { ...current, weaponPlus: newPlus }
          * Update PendekarPlayer.version += 1
        - EQUIP:
          * Validate: item exists in inventory with quantity ≥ 1
          * Validate: item slot matches target slot (via EQUIPMENT lookup or canonical mapping)
          * Remove 1 from inventory, set equipment[slot] = itemKey
          * Update PendekarPlayer.version += 1
        - UNEQUIP:
          * Validate: equipment[slot] === itemKey (not empty)
          * Set equipment[slot] = null, add 1 to inventory
          * Update PendekarPlayer.version += 1
     d. Return APPLIED + new equipment + new inventory
```

### 3.4 Client Wiring

Same pattern as inventory: fire-and-forget after in-memory mutation, server overwrites on next hydration.

### 3.5 Trigger Points

| Trigger | Engine Line | RequestKey | Kind |
|---------|------------|------------|------|
| Forge craft | L1509 | `forge-equip:${txSeq}` | FORGE_UPGRADE |
| Equip item (UI) | N/A (no handler yet) | `equip:${itemKey}-${txSeq}` | EQUIP |
| Unequip item (UI) | N/A (no handler yet) | `unequip:${slot}-${txSeq}` | UNEQUIP |

---

## 4. weaponPlus Authority

### 4.1 Current Gap

- **In-memory**: `equipment.weaponPlus` is set by `applyForgeUpgrade` (economy.ts:113) → persisted in engine state → saved via `saveGame` → serialized to localStorage.
- **Server**: `equipment` JSON column stores `{ weaponId, armorId, accessoryId }` — **no `weaponPlus`**.
- **Hydration**: `persistence.ts:208` hardcodes `weaponPlus: 0` from the server snapshot.
- **Result**: Forge progress is lost on every reload. The `+5` cap is enforced against the in-memory value (which resets to 0), allowing unlimited upgrades within a session.

### 4.2 Design

**Store `weaponPlus` in the `equipment` JSON column**:

```json
{ "weaponId": "equip.keris-singa", "armorId": null, "accessoryId": null, "weaponPlus": 3 }
```

- Schema: No migration needed. The `equipment` column is `Json?` — the shape is application-controlled.
- `mutateEquipment` FORGE_UPGRADE writes the new `weaponPlus` value.
- Hydration reads `weaponPlus` from the equipment JSON (default 0 if absent).
- `PendekarWorldState.equipment` type in `server-contracts.ts` gains `weaponPlus: number`.

### 4.3 Changes Required

| File | Change |
|------|--------|
| `server-contracts.ts:87` | Add `weaponPlus: number` to `PendekarWorldState.equipment` |
| `server-state.ts:332-336` | Read `weaponPlus` from equipment JSON (default 0) |
| `persistence.ts:204-209` | Read `weaponPlus` from `ws.equipment` instead of hardcoding 0 |
| `server-state.ts:playerToBattleState` | Read `weaponPlus` from player equipment (currently returns `weaponPlus: 0` at L1716) |

---

## 5. itemPlan Settlement Decision

### 5.1 Current Gap

- `projectBattleRewardReceipt` (rewards.ts via `projectBattleRewardReceipt` in server-state.ts:1888) creates a `PendekarRewardReceipt` with `itemPlan: null`.
- `assertSettleableBattleReceipt` (server-state.ts:1562) **explicitly rejects** non-null `itemPlan`: `receipt.itemPlan !== null` → error.
- Battle item drops (bijih) are applied client-only in `applyWinFlow` (game-engine.ts:674).

### 5.2 Design Decision: DEFER

**Rationale**: itemPlan settlement requires a new receipt shape, a new settlement path in `settleAuthoritativeBattleReward`, and atomic inventory mutation within the settlement transaction. This is a significant scope expansion beyond the core inventory/equipment authority goal.

**Decision**: Keep `itemPlan: null` and `itemPlan !== null` rejection in P2.6I.5. Battle drops continue to be synced via the new `mutateInventory` (BATTLE_DROP kind) fire-and-forget path — same as other inventory mutations.

**Future**: When itemPlan is implemented, the `mutateInventory` method already provides the atomic inventory write. The settlement path would call `mutateInventory` inside its transaction instead of duplicating inventory logic.

### 5.3 Why This Is Safe

- Battle drops are **append-only** (bijih +1) — no removal, no conflict.
- The `mutateInventory` BATTLE_DROP path uses idempotent `requestKey` (`drop-${battleId}-${itemId}`) — replay is safe.
- On hydration, server inventory includes the drop — client doesn't need to re-apply.

---

## 6. Prototype ID Mapping

### 6.1 Current Gap

Shop and chest use prototype equipment keys:
- `wpn:baja` → Pedang Baja (attack +4)
- `arm:kulit` → Zirah Kulit (defense +3)
- `wpn:empu` → Pedang Empu (attack +9)
- `arm:baja` → Zirah Baja (defense +7)

Production equipment definitions (`data/equipment.ts`):
- `equip.keris-singa` (weapon, attack +4)
- `equip.baju-tenun` (armor, defense +3, hp +10)
- `equip.cincin-pasir` (accessory, speed +1)

**No mapping exists** between prototype keys and production IDs.

### 6.2 Design

**Create a canonical mapping** in a new shared module:

```typescript
// src/game/rpg/data/equipment-mapping.ts

export const EQUIPMENT_KEY_MAP: Record<string, { productionId: string; slot: "weapon" | "armor" | "accessory" }> = {
  "wpn:baja":  { productionId: "equip.keris-singa", slot: "weapon" },
  "wpn:empu":  { productionId: "equip.keris-singa", slot: "weapon" },  // +9 variant
  "arm:kulit": { productionId: "equip.baju-tenun",  slot: "armor" },
  "arm:baja":  { productionId: "equip.baju-tenun",  slot: "armor" },   // +7 variant
};

export function resolveEquipmentKey(prototypeKey: string): { productionId: string; slot: "weapon" | "armor" } | null {
  return EQUIPMENT_KEY_MAP[prototypeKey] ?? null;
}
```

### 6.3 Integration Points

| Location | Change |
|----------|--------|
| `shop.ts:validatePurchase` | Pass `equipmentResolvable` that checks `resolveEquipmentKey` — replaces the current `false` default that makes all gear purchases fail with `EQUIPMENT_UNMAPPED` |
| `rewards.ts:applyChestRewards` | Equipment intents now resolved via `resolveEquipmentKey` — chest gear applied to equipment instead of deferred |
| `server-state.ts:mutateEquipment` EQUIP kind | Uses `resolveEquipmentKey` to validate slot compatibility |
| Game engine EQUIP handler (new) | Uses `resolveEquipmentKey` to determine target slot |

### 6.4 Note on Equipment Variants

The shop has two weapons (`wpn:baja` +4, `wpn:empu` +9) and two armors (`arm:kulit` +3, `arm:baja` +7), but production equipment.ts only defines one weapon (`equip.keris-singa` +4) and one armor (`equip.baju-tenun` +3). The mapping points both to the same production ID because production equipment has no stat variants yet — stats are the base modifiers from `EQUIPMENT[]`.

**Alternative (deferred)**: Extend `EQUIPMENT[]` with variant IDs (e.g. `equip.pedang-baja`, `equip.pedang-empu`) and map 1:1. This is a data expansion, not a structural change — can be done in a later phase.

---

## 7. Atomicity & Transactions

### 7.1 Transaction Boundaries

All mutations use `this.serializable()` (Prisma `$transaction` with `SERIALIZABLE` isolation):

| Operation | What Is Transactional | What Is Fire-and-Forget |
|-----------|----------------------|------------------------|
| `mutateInventory` | DB inventory rows + player.version | — (this IS the DB write) |
| `mutateEquipment` | DB equipment JSON + player.version + optional inventory | — (this IS the DB write) |
| `mutateQuestState` (existing) | DB quest/flags/world columns + player.version | — (this IS the DB write) |
| `settleAuthoritativeBattleReward` (existing) | DB receipt + xpEntry + walletEntry + player stats | — (this IS the DB write) |
| Client `fireServerCall` | — | HTTP call (may fail, retried) |

### 7.2 Compound Mutations

Some game actions require multiple DB writes atomically:

| Game Action | Mutations Needed | Strategy |
|-------------|-----------------|----------|
| Forge craft | `mutateInventory` (remove bijih) + `mutateEquipment` (weaponPlus += 1) | **Two separate fire-and-forget calls**. Not atomic across HTTP. Acceptable because: (a) both are idempotent, (b) server validates each independently, (c) partial failure leaves inconsistent state that hydrates correctly on next load (bijih removed but weaponPlus not yet upgraded → player can retry forge). |
| Shop purchase (gear) | `mutateInventory` (add gear item) + `mutateEquipment` (equip) | Two calls. Same rationale as forge. |
| Battle settlement + drop | `settleAuthoritativeBattleReward` (existing) + `mutateInventory` (bijih drop) | Settlement is already atomic. Drop is separate fire-and-forget. |

### 7.3 Rationale for Non-Atomic Compound Mutations

Creating a single `mutateForgeCraft` method that wraps both inventory and equipment in one transaction would be cleaner but:
1. It duplicates the validation logic of `mutateInventory` + `mutateEquipment`.
2. It creates a new API surface that must be maintained alongside the individual methods.
3. The idempotent design means partial failure is recoverable — no data loss.

**Decision**: Keep mutations atomic per-entity (inventory OR equipment), not cross-entity. Document the compound pattern.

---

## 8. Idempotency

### 8.1 Mechanism

All mutations use the existing `replayGuard` (in-memory `Set<string>` with 256-per-player pruning):

```
dedupKey = `${userId}:${input.requestKey}`
```

- First call: add to guard, apply mutation.
- Replay: return `REPLAYED` with current state, no DB write.

### 8.2 RequestKey Patterns

| Mutation Kind | RequestKey Pattern | Uniqueness |
|---------------|-------------------|------------|
| SHOP_PURCHASE | `shop:${txSeq}` | Per session (txSeq monotonic) |
| CHEST_GRANT | `chest:${chestId}` | Per chest (global unique) |
| BATTLE_DROP | `drop-${battleId}-${itemId}` | Per battle + item |
| CONSUME | `consume:${itemId}-${txSeq}` | Per session |
| FISH_SELL | `fish-sell:${txSeq}` | Per session |
| FORGE_COST | `forge:${txSeq}` | Per session |
| FORGE_UPGRADE | `forge-equip:${txSeq}` | Per session |
| EQUIP | `equip:${itemKey}-${txSeq}` | Per session |
| UNEQUIP | `unequip:${slot}-${txSeq}` | Per session |

### 8.3 Server Restart

The `replayGuard` is in-memory — resets on server restart. This is acceptable because:
- Duplicate application of an idempotent mutation is harmless (quantity already updated, guard already set).
- DB-level constraints (`@@unique([playerId, itemKey])` on inventory) prevent duplicate inserts.
- The `version` field on `PendekarPlayer` provides optimistic locking for concurrent writes.

---

## 9. Server-Wins Hydration

### 9.1 Current Flow

```
loadServerSnapshot(playerId)
  → readServerSnapshotCache(playerId)     // reads JSON from DB
  → hydrateFromServerSnapshot(snapshot)    // maps projection → RPGGameState
  → returns full state to engine.load()
```

### 9.2 Changes Required

| Component | Current | Design |
|-----------|---------|--------|
| `PendekarWorldState.equipment` | `{ weaponId, armorId, accessoryId }` | Add `weaponPlus: number` |
| `hydrateFromServerSnapshot` L204-209 | `weaponPlus: 0` hardcoded | `weaponPlus: ws.equipment.weaponPlus ?? 0` |
| `persistence.ts` L269 | `equipmentIntents: []` | Keep empty (intents resolved server-side after P2.6I.5) |
| `persistence.ts` L270-272 | `gold: snapshot.player.wallet.goldBalance` | Already correct |
| `persistence.ts` L218-219 | `inventory: { items: snapshot.inventory.map(...) }` | Already correct |

### 9.3 Hydration Priority

On game load:
1. Server snapshot is fetched (existing).
2. `equipment.weaponPlus` is read from the snapshot (new).
3. Client localStorage cache is checked (existing P2.6I.1 fallback).
4. Server overwrites client — **server always wins** (existing principle).

No changes to the hydration priority — just adding `weaponPlus` to the data flow.

---

## 10. Migration Strategy

### 10.1 Schema Migration

**None required**. All new data fits in existing columns:
- `equipment` (Json?) — add `weaponPlus` to the JSON shape.
- `PendekarInventoryItem` — table already exists with correct schema.

### 10.2 Data Migration

**None required**. Existing players:
- `equipment` JSON will have no `weaponPlus` key → hydration defaults to 0 (correct for new players).
- `inventoryItems` table is empty for all existing players (no mutations have written to it).
- After first login post-deploy, client writes will fire `mutateInventory`/`mutateEquipment` which populate the DB.

### 10.3 Rollback

If the new methods are removed:
- Client continues to work with in-memory state (existing behavior).
- DB columns `equipment` and `inventoryItems` become stale but harmless.
- No schema change to roll back.

---

## 11. Implementation Order

### Phase 1: Equipment Authority (HIGH priority — forge is the most visible gap)

| Step | Files | Description |
|------|-------|-------------|
| 1.1 | `server-contracts.ts` | Add `weaponPlus: number` to `PendekarWorldState.equipment` |
| 1.2 | `server-state.ts` (projection) | Read `weaponPlus` from equipment JSON in `getStateProjection` |
| 1.3 | `server-state.ts` (playerToBattleState) | Read `weaponPlus` from player equipment |
| 1.4 | `server-state.ts` (new method) | Implement `mutateEquipment` (FORGE_UPGRADE, EQUIP, UNEQUIP) |
| 1.5 | `persistence.ts` | Hydrate `weaponPlus` from `ws.equipment` |
| 1.6 | `game-engine.ts` (FORGE_CRAFT) | Add `fireServerCall(mutateEquipment(...))` after in-memory apply |
| 1.7 | `game-engine.ts` (new EQUIP handler) | Implement EQUIP command handler + fire `mutateEquipment` |

### Phase 2: Inventory Authority (HIGH priority — all item flows)

| Step | Files | Description |
|------|-------|-------------|
| 2.1 | `server-state.ts` (new method) | Implement `mutateInventory` (6 kinds) |
| 2.2 | `game-engine.ts` (SHOP_BUY consumables) | Add `fireServerCall(mutateInventory(...))` |
| 2.3 | `game-engine.ts` (fish sell) | Add `fireServerCall(mutateInventory(...))` |
| 2.4 | `game-engine.ts` (CHEST_OPEN) | Add `fireServerCall(mutateInventory(...))` |
| 2.5 | `game-engine.ts` (battle drops) | Add `fireServerCall(mutateInventory(...))` |
| 2.6 | `game-engine.ts` (FORGE_CRAFT bijih cost) | Add `fireServerCall(mutateInventory(...))` |
| 2.7 | `game-engine.ts` (USE_ITEM) | Add `fireServerCall(mutateInventory(...))` |

### Phase 3: Prototype Mapping (LOW priority — enables gear purchases)

| Step | Files | Description |
|------|-------|-------------|
| 3.1 | New: `data/equipment-mapping.ts` | Canonical key→productionId mapping |
| 3.2 | `shop.ts` | Wire `equipmentResolvable` to `resolveEquipmentKey` |
| 3.3 | `rewards.ts` | Resolve equipment intents via `resolveEquipmentKey` |

### Phase 4: Hydration Hardening (MEDIUM priority — consistency)

| Step | Files | Description |
|------|-------|-------------|
| 4.1 | `persistence.ts` | Ensure `weaponPlus` hydration from DB |
| 4.2 | `server-state.ts` | Ensure projection includes `weaponPlus` |
| 4.3 | Tests | Verify hydration round-trip for weaponPlus |

---

## 12. Test Plan

### 12.1 Unit Tests (Pure Logic)

| Test | File | Assertions |
|------|------|------------|
| `resolveEquipmentKey` mapping | `data/equipment-mapping.test.ts` | 4 mappings resolve, unknown returns null |
| `validatePurchase` with resolvable gear | `interaction/shop.test.ts` | Gear purchases no longer fail with EQUIPMENT_UNMAPPED |
| `applyChestRewards` with resolved gear | `economy/rewards.test.ts` | Equipment intents resolved to production IDs |

### 12.2 Server Mutation Tests (Integration)

| Test | File | Assertions |
|------|------|------------|
| `mutateInventory` — add item | `server-state.test.ts` | Quantity incremented, version incremented |
| `mutateInventory` — remove item | `server-state.test.ts` | Quantity decremented, row deleted at 0 |
| `mutateInventory` — insufficient quantity | `server-state.test.ts` | Error thrown, no DB change |
| `mutateInventory` — replay dedup | `server-state.test.ts` | Second call returns REPLAYED |
| `mutateEquipment` — FORGE_UPGRADE | `server-state.test.ts` | weaponPlus incremented, version incremented |
| `mutateEquipment` — FORGE_UPGRADE at max | `server-state.test.ts` | Error when weaponPlus >= 5 |
| `mutateEquipment` — EQUIP | `server-state.test.ts` | Slot set, inventory decremented |
| `mutateEquipment` — UNEQUIP | `server-state.test.ts` | Slot cleared, inventory incremented |
| `mutateEquipment` — replay dedup | `server-state.test.ts` | Second call returns REPLAYED |

### 12.3 Hydration Round-Trip Tests

| Test | File | Assertions |
|------|------|------------|
| Hydration with weaponPlus | `persistence.test.ts` | `weaponPlus` read from equipment JSON, not hardcoded 0 |
| Hydration with inventory | `persistence.test.ts` | Inventory items mapped from projection |
| Hydration with equipment slots | `persistence.test.ts` | weaponId/armorId/accessoryId mapped correctly |

### 12.4 E2E Flow Tests

| Test | Scenario | Expected |
|------|----------|----------|
| Forge flow | Player with 100G + 1 bijih → forge → reload | weaponPlus persisted, gold/bijih deducted |
| Shop gear flow | Player with 150G → buy wpn:baja → reload | Gear in inventory (or equipped), gold deducted |
| Chest flow | Open chest with ram+bijih → reload | Items in inventory |
| Battle drop flow | Win battle with bijih drop → reload | Bijih in inventory |
| Equip flow | Player with gear in inventory → equip → reload | Equipment slot set, inventory decremented |

### 12.5 Regression Tests

All existing tests must pass unchanged:
- `test:rpg-inventory` (existing)
- `test:rpg-engine` (existing)
- `test:rpg-persistence` (existing)
- `test:pendekar-world-state` (existing)

---

## Appendix A: Files Changed (Summary)

| File | Change Type | Description |
|------|-------------|-------------|
| `lib/game/rpg/server-contracts.ts` | MODIFY | Add `weaponPlus` to `PendekarWorldState.equipment` |
| `lib/game/rpg/server-state.ts` | MODIFY | Add `mutateInventory`, `mutateEquipment`; update projection |
| `lib/game/rpg/server-state.ts` (playerToBattleState) | MODIFY | Read `weaponPlus` from player equipment |
| `src/game/rpg/core/persistence.ts` | MODIFY | Hydrate `weaponPlus` from DB |
| `src/game/rpg/core/game-engine.ts` | MODIFY | Add fireServerCall for inventory/equipment mutations; add EQUIP handler |
| `src/game/rpg/data/equipment-mapping.ts` | NEW | Prototype→production key mapping |
| `src/game/rpg/core/input.ts` | UNCHANGED | EQUIP command type already defined |

## Appendix B: Commit = NONE, Push = NONE

This is a design document only. No code is implemented, committed, or pushed.

---

**End of P2.6I.5 Implementation Design**
