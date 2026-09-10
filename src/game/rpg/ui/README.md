# UI boundary (Phase 0 — folders planned, no dead code yet)

UI is strictly downstream: **UI reads state, emits `RPGCommand`s (core/input.ts),
and renders events. It never mutates state directly.**

Planned subfolders, created when their features are implemented (not before —
no dummy placeholders per the Phase 0 rule):

| Folder | Purpose | Trigger to create |
|---|---|---|
| `hud/` | HP, peluru, level, objective bar, timer | First playable vertical slice |
| `dialogue/` | NPC dialogue overlay | NPC interaction phase |
| `inventory/` | Inventory + equipment screens | Item pickup phase |
| `battle/` | Battle UI over the battle engine | Combat phase |

The pipeline these will follow (multiplayer-ready):

```text
Input → Command → Authoritative logic → State change → Event → UI/Rendering
```
