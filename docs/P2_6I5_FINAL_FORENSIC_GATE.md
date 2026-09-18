# P2.6I.5 Final Forensic Gate

## Overview
P2.6I.5 implements server-authoritative equipment and inventory state for Pendekar Suryakerta. This gate verifies the complete implementation across contracts, state, API routes, game engine triggers, persistence hydration, and client integration.

## Verdict: GREEN — READY FOR COMMIT

## Gate Results

| # | Section | Status | Detail |
|---|---------|--------|--------|
| 1 | Server contracts (types + parsers) | ✅ | `weaponPlus: number` in projections, 4 mutation types, `parseEquipmentMutationInput`, `parseInventoryMutationInput` in `server-contracts.ts` |
| 2 | Server state: mutateEquipment | ✅ | 3 kinds (FORGE_UPGRADE, EQUIP, UNEQUIP), catalog validation via `EQUIPMENT.find()`, weaponPlus 0–5 validation, replay guard, version increment. `server-state.ts` L1219–1323 |
| 3 | Server state: mutateInventory | ✅ | 6 kinds (SHOP_PURCHASE, CHEST_GRANT, BATTLE_DROP, CONSUME, FISH_SELL, FORGE_COST), quantity validation, FISH_SELL deletes fish without itemKey, upsert/delete logic, version increment. `server-state.ts` L1325–1428 |
| 4 | Replay guard | ✅ | In-memory `Set<string>` with `${userId}:${requestKey}` dedup. 256-per-player pruning via loop with early delete. Same implementation in both `mutateEquipment` and `mutateInventory`. |
| 5 | API routes | ✅ | Created `app/api/rpg/equipment/mutate/route.ts` and `app/api/rpg/inventory/mutate/route.ts` following existing quest/mutate pattern. Auth via `requireRpgFounderPreviewApiAccess`, parser validation, error mapping (OwnershipError→404, InvariantError→422). |
| 6 | Equipment triggers in game-engine | ✅ | EQUIP handler L1603–1660: equip/unequip for weapon/armor/accessory, validates item in inventory + catalog, fires `fireServerCall(mutateEquipment(...))` with idempotent keys. FORGE_UPGRADE L1574–1576: fires `mutateEquipment("FORGE_UPGRADE", "weapon", { equipmentKey, weaponPlus })`. |
| 7 | Inventory triggers in game-engine | ✅ | 6 trigger points: SHOP_PURCHASE L1504, CHEST_GRANT L1048, BATTLE_DROP L688, CONSUME×2 L1314/L1363, FISH_SELL L1461, FORGE_COST L1583. All use `fireServerCall(mutateInventory(...))` with appropriate kind, quantity, and itemKey. |
| 8 | Equipment mapping | ✅ | `equipment-mapping.ts`: `EQUIPMENT_KEY_MAP` maps prototype keys (`wpn`, `arm`, `ring`) to production IDs (`equip.keris-singa`, `equip.baju-tenun`, `equip.cincin-pasir`). `resolveEquipmentKey()` validates against EQUIPMENT catalog. |
| 9 | Rewards integration | ✅ | `rewards.ts` L23: imports `resolveEquipmentKey`. L62–63: uses it for `wpn` and `arm` equipment intents. |
| 10 | Events type | ✅ | `events.ts` L65: `{ type: "EQUIP"; playerId; itemId; slot: "weapon" | "armor" | "accessory" }` added to `RPGEvent` union. |
| 11 | Client API wrappers | ✅ | `server-api-client.ts`: `mutateEquipment()` (L281–296) and `mutateInventory()` (L301–315) use `fetchServer` (not retry), generate fresh requestKey per call. Both return typed `FetchResult<...> | FetchFail`. |
| 12 | FireServerCall error handling | ✅ | `fireServerCall` (game-engine.ts L361–380): catches errors, classifies via `classifyError`, calls `pendingServerCalls.failed()` or `.retryableFailure()`. 404 from missing route → classified as PERMANENT (HTTP 4xx non-retryable) → `failed()`. Game never crashes. |
| 13 | Persistence hydration | ✅ | `persistence.ts` L204–208: `weaponPlus: ws.equipment.weaponPlus ?? 0` with nullish coalescing. EquipmentIntents stored in world.equipmentIntents. |
| 14 | State projection | ✅ | `server-state.ts` L319–321: `safeJson` with `{ weaponId: null, armorId: null, accessoryId: null, weaponPlus: 0 }` default. L1934: projection includes all 4 fields. |
| 15 | RPGGame hydration | ✅ | `RPGGame.tsx` L181: `equipment: serverSnapshot.worldState.equipment` — equipment hydrated directly from server snapshot. Legacy path (L200–202) carries equipmentIntents. |
| 16 | Network resilience | ✅ | `network-resilience.ts`: `classifyError` maps 4xx non-retryable statuses to PERMANENT (L64–67). `fetchServerWithRetry` (server-api-client.ts L123–157) retries RETRYABLE/UNKNOWN only, respects PERMANENT. |
| 17 | Tests | ✅ | 42/42 pass (`scripts/test-p2-6i5-inventory-equipment.ts`). No vitest/jest; standalone scripts via `npx tsx`. |
| 18 | TypeScript | ✅ | `npx tsc --noEmit --pretty false` → 0 errors. All imports resolve, all types satisfied. |

## Defects Found & Fixed

### DEFECT-1: Missing API routes (BLOCKING)
**Severity**: BLOCKER (game would work client-side but server state would diverge)
**File**: `app/api/rpg/equipment/mutate/route.ts`, `app/api/rpg/inventory/mutate/route.ts`
**Fix**: Created both route handlers following the `quest/mutate/route.ts` pattern: `requireRpgFounderPreviewApiAccess` → `parse*MutationInput` → `PendekarStateService.mutate*` → error mapping.
**Status**: FIXED before this report.

### DEFECT-2: Missing parser functions (BLOCKING)
**Severity**: BLOCKER (API routes would fail to validate input)
**File**: `lib/game/rpg/server-contracts.ts`
**Fix**: Added `parseEquipmentMutationInput()` and `parseInventoryMutationInput()` with full field validation (kind, slot, equipmentKey, weaponPlus, quantityDelta, requestKey).
**Status**: FIXED before this report.

## Architecture Notes

1. **Fire-and-forget pattern**: Equipment/inventory mutations are sent as background tasks via `fireServerCall()`. The game never awaits them or blocks rendering. Client state updates immediately; server state confirms asynchronously.

2. **No atomic cross-entity mutations**: FORGE_UPGRADE fires TWO separate calls (equipment mutation + inventory cost). This is by design (per design doc §10): each is idempotent, and partial failure is acceptable (player loses cost without upgrade, which is a recoverable edge case).

3. **Equipment is an array**: `EQUIPMENT` is `RPGEquipmentDefinition[]`, not a record. All lookups use `.find((e) => e.id === key)`, not `[key]`. Verified in server-state.ts and game-engine.ts.

4. **Slot type is lowercase**: `RPGEquipmentSlot = "weapon" | "armor" | "accessory"`. All comparisons in game-engine.ts verified lowercase.

5. **weaponPlus in existing column**: Stored in the existing `equipment` Json column on `PendekarPlayer`. No Prisma migration needed. Client type `RPGEquipment.weaponPlus` is optional (`weaponPlus?: number`), server always provides it via `safeJson` with default `0`.

## Recommendation
GREEN. All 18 gate sections pass. Both blocking defects (missing routes + missing parsers) have been fixed. Ready for `git add` + `git commit` + `git push`.
