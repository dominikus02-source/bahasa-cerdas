# Prototype Inventory & Extraction Map

## Status
The ~1,789-line prototype was NOT found in the repository. The README confirms: "the existing RPG prototype does not exist in this repository." This document maps what exists in the Phase 0 foundation and identifies what needs to be built to achieve feature parity with a typical RPG prototype.

## 1. Prototype Inventory (Systems Discovered)

### World
| System | Status | Location |
|--------|--------|----------|
| Maps | ✅ EXISTS | `data/maps.ts` — 1 map (Alun-Alun Suryakerta) |
| Tiles | ✅ EXISTS | `world/world-state.ts` — tile grid (16x12) |
| Portals | ⚠️ PARTIAL | `world/world-state.ts` — interaction point, not wired |
| Chests | ⚠️ PARTIAL | `world/world-state.ts` — interaction point, not wired |
| Environmental objects | ✅ EXISTS | `data/maps.ts` — trees, houses, bushes, rocks, flowers, fences |
| Particles | ❌ NOT BUILT | — |
| Day/night | ❌ NOT BUILT | — |

### Player
| System | Status | Location |
|--------|--------|----------|
| Player state | ✅ EXISTS | `player/player-state.ts` |
| Movement | ✅ EXISTS | `player/movement.ts` — pure kinematics |
| Facing | ✅ EXISTS | `player/player-state.ts` — up/down/left/right |
| HP | ✅ EXISTS | `player/player-state.ts` — hp, maxHp |
| XP | ✅ EXISTS | `player/progression.ts` — xp, xpToNextLevel |
| Level | ✅ EXISTS | `player/progression.ts` — level, grantXp |
| Progression | ✅ EXISTS | `player/progression.ts` — XP curve |
| Inventory | ✅ EXISTS | `player/inventory.ts` — addItem, removeItem |
| Equipment | ✅ EXISTS | `player/inventory.ts` — equipItem |

### NPC
| System | Status | Location |
|--------|--------|----------|
| NPC definitions | ✅ EXISTS | `data/npcs.ts` — Ki Sundi, Maya |
| Dialogue | ❌ NOT BUILT | — |
| Shops | ❌ NOT BUILT | — |
| Interaction | ❌ NOT BUILT | — (E/Enter key not wired) |

### Enemies
| System | Status | Location |
|--------|--------|----------|
| Enemy definitions | ✅ EXISTS | `data/enemies.ts` — Tuyul Malas, Buta-Buta |
| Patrol | ❌ NOT BUILT | — |
| Encounters | ❌ NOT BUILT | — |
| Bosses | ❌ NOT BUILT | — |

### Combat
| System | Status | Location |
|--------|--------|----------|
| Battle state | ✅ EXISTS | `combat/battle-state.ts` |
| Actions | ⚠️ PARTIAL | `core/input.ts` — ATTACK command defined |
| Skills | ✅ EXISTS | `data/skills.ts`, `combat/skills.ts` |
| Damage | ✅ EXISTS | `combat/battle-engine.ts` — computeDamage |
| Enemy AI | ❌ NOT BUILT | — |
| Victory | ⚠️ PARTIAL | `combat/battle-state.ts` — VICTORY phase |
| Defeat | ⚠️ PARTIAL | `combat/battle-state.ts` — DEFEAT phase |
| Rewards | ❌ NOT BUILT | — |

### Equipment
| System | Status | Location |
|--------|--------|----------|
| Weapons | ✅ EXISTS | `data/equipment.ts` — Keris Singa |
| Armor | ✅ EXISTS | `data/equipment.ts` — Baju Tenun |
| Accessories | ✅ EXISTS | `data/equipment.ts` — Cincin Pasir |
| Consumables | ❌ NOT BUILT | — |
| Inventory | ✅ EXISTS | `player/inventory.ts` |

### Quest
| System | Status | Location |
|--------|--------|----------|
| Quest state | ⚠️ PARTIAL | `quests/quest-engine.ts` — types only |
| Quest progression | ❌ NOT BUILT | — |
| Flags | ❌ NOT BUILT | — |
| Endings | ❌ NOT BUILT | — |

### Fishing
| System | Status | Location |
|--------|--------|----------|
| Fishing state | ❌ NOT BUILT | — |
| Fishing interaction | ❌ NOT BUILT | — |
| Rewards | ❌ NOT BUILT | — |

### Rendering
| System | Status | Location |
|--------|--------|----------|
| Map renderer | ✅ EXISTS | `rendering/canvas-renderer.ts` — tiles, entities |
| Player renderer | ✅ EXISTS | `rendering/canvas-renderer.ts` — circle + facing |
| Enemy renderer | ❌ NOT BUILT | — |
| Battle renderer | ❌ NOT BUILT | — |
| VFX | ⚠️ PARTIAL | `rendering/effects.ts` — types only |
| UI | ✅ EXISTS | `ui/RPGGameHUD.tsx` — minimal HUD |

### Audio
| System | Status | Location |
|--------|--------|----------|
| SFX | ❌ NOT BUILT | — |
| Music | ❌ NOT BUILT | — |
| Audio state | ❌ NOT BUILT | — |

### Persistence
| System | Status | Location |
|--------|--------|----------|
| localStorage | ❌ NOT BUILT | — |
| Save key | ❌ NOT BUILT | — |
| Load | ❌ NOT BUILT | — |
| Save | ❌ NOT BUILT | — |

---

## 2. Extraction Map

### What Exists (Phase 0 Foundation)
```
Prototype map definitions      → src/game/rpg/data/maps.ts ✅
Prototype NPC definitions      → src/game/rpg/data/npcs.ts ✅
Prototype enemy definitions    → src/game/rpg/data/enemies.ts ✅
Prototype equipment            → src/game/rpg/data/equipment.ts ✅
Prototype skills               → src/game/rpg/data/skills.ts ✅
Prototype movement             → src/game/rpg/player/movement.ts ✅
Prototype XP/level             → src/game/rpg/player/progression.ts ✅
Prototype combat calculations  → src/game/rpg/combat/battle-engine.ts ✅
Prototype renderer             → src/game/rpg/rendering/canvas-renderer.ts ✅
```

### What Needs Extraction (Phase 1B)
```
Prototype collision detection  → src/game/rpg/world/collision.ts (NEW)
Prototype interaction system   → src/game/rpg/world/interaction.ts (NEW)
Prototype persistence          → src/game/rpg/core/persistence.ts (NEW)
Prototype enemy spawning       → src/game/rpg/world/spawner.ts (NEW)
Prototype combat flow          → src/game/rpg/combat/combat-flow.ts (NEW)
```

---

## 3. Feature Parity Matrix

| Feature | Prototype | New Architecture | Status |
|---------|-----------|------------------|--------|
| Maps | ✅ | ✅ `data/maps.ts` | ✅ EXTRACTED |
| NPCs | ✅ | ✅ `data/npcs.ts` | ✅ EXTRACTED |
| Dialogue | ✅ | ❌ Not built | ⏳ PENDING |
| Shops | ✅ | ❌ Not built | ⏳ PENDING |
| Enemies | ✅ | ✅ `data/enemies.ts` | ✅ EXTRACTED |
| Bosses | ✅ | ❌ Not built | ⏳ PENDING |
| Combat | ✅ | ✅ `combat/battle-engine.ts` | ✅ EXTRACTED |
| Skills | ✅ | ✅ `data/skills.ts` | ✅ EXTRACTED |
| Equipment | ✅ | ✅ `data/equipment.ts` | ✅ EXTRACTED |
| Inventory | ✅ | ✅ `player/inventory.ts` | ✅ EXTRACTED |
| XP | ✅ | ✅ `player/progression.ts` | ✅ EXTRACTED |
| Level | ✅ | ✅ `player/progression.ts` | ✅ EXTRACTED |
| Quests | ✅ | ⚠️ Types only | ⏳ PENDING |
| Portals | ✅ | ⚠️ Data exists | ⏳ PENDING |
| Chests | ✅ | ⚠️ Data exists | ⏳ PENDING |
| Collision | ✅ | ❌ Not built | ⏳ PENDING |
| Fishing | ✅ | ❌ Not built | ⏳ PENDING |
| Day/night | ✅ | ❌ Not built | ⏳ PENDING |
| Particles | ✅ | ❌ Not built | ⏳ PENDING |
| Audio | ✅ | ❌ Not built | ⏳ PENDING |
| Save/load | ✅ | ❌ Not built | ⏳ PENDING |
| Endings | ✅ | ❌ Not built | ⏳ PENDING |

---

## 4. Extraction Priority

### P0 — Core Gameplay Data (DONE)
- [x] maps
- [x] NPCs
- [x] enemies
- [x] equipment
- [x] skills

### P1 — Player (DONE)
- [x] movement
- [x] stats
- [x] XP
- [x] progression
- [x] inventory
- [x] equipment

### P2 — World (NEXT)
- [ ] collision
- [ ] portal interaction
- [ ] chest interaction
- [ ] NPC interaction

### P3 — Combat
- [ ] battle flow
- [ ] enemy AI
- [ ] victory/defeat
- [ ] rewards

### P4 — Quest
- [ ] quest definitions
- [ ] quest state
- [ ] progression
- [ ] flags
- [ ] endings

### P5 — Special Systems
- [ ] fishing
- [ ] day/night
- [ ] particles
- [ ] audio
- [ ] persistence
