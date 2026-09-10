# Pendekar Suryakerta — Legenda Nusantara (RPG foundation)

**STANDALONE RPG.** Nothing in `src/game/rpg/` imports from Kuis Tempur or any
existing game module, and nothing existing imports from here. The dependency
boundary is one-way and enforced by convention in Phase 0.

## Phase 0 status

This is the **foundation only**: state boundaries, contracts, data shapes, and
a minimal engine core. There is intentionally **no route, no page, no renderer
implementation, and no gameplay wired into the app yet** — the existing RPG
prototype does not exist in this repository, and Phase 0 does not build one.

## Ownership contract (multiplayer-ready from day one)

| State | Owner in multiplayer | Notes |
|---|---|---|
| `player.position`, `facing` | **Server (authoritative)** | Client predicts; server corrects via events |
| `player.stats`, `progression`, `inventory`, `equipment` | **Server (authoritative)** | Mutated only via engine modules |
| `world.entities`, `world.interactions` | **Server (authoritative)** | Synced via `multiplayer/world-sync.ts` |
| Battle resolution, rewards, quest progress, learning results | **Server (authoritative)** | Pure engines → runnable server-side |
| Camera, animation phase, transient input, visual effects, UI open/closed | **Client-owned** | Never broadcast as truth |

All state is plain serializable data (no classes, no DOM handles) so it can be
transferred to an authoritative server and diffed for sync without refactoring.

## Pipeline

```text
Input → Command → Authoritative Game Logic → State Change → Event → Client Rendering
```

- Commands: `core/input.ts` (`RPGCommand`)
- Events: `multiplayer/events.ts` (`RPGEvent`) — contract only, no transport
- Engines: pure functions (`combat/battle-engine.ts`, `player/*`)

## Layout

```text
core/        constants, canonical game state, loop, input→command
world/       tile map + normalized-coordinate entities (state only)
player/      player state + pure movement/progression/inventory ops
combat/      battle state + pure engine (no DOM)
quests/      quest progress state + definition contract
learning/    first-class learning challenges → gameplay effects
multiplayer/ event contract, session/player/world sync seams (no network yet)
rendering/   renderer contract (state in, draw calls out — never mutates state)
ui/          planned: hud, dialogue, inventory, battle (see ui/README.md)
data/        data-driven maps, NPCs, enemies, equipment, skills
```

## Migration plan (from prototype → production)

```text
Existing Prototype → Foundation (DONE in Phase 0)
  → Extract Data (map/NPC/enemy content into data/)
  → Extract State (runtime slices into world/, player/, combat/)
  → Extract Engine (pure simulation into engines)
  → Extract Renderer (canvas impl of rendering/ contract)
  → Production Vertical Slice (first playable route)
  → Multiplayer (authoritative server implements the contracts above)
```
