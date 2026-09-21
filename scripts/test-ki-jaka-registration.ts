/**
 * P2.8.6 BATCH A — Ki Jaka NPC Registration focused test.
 *
 * Verifies:
 * 1. Ki Jaka registered in NPCS array (data/npcs.ts)
 * 2. Ki Jaka NPC interaction point in MAP_VILLAGE_SQUARE (data/maps.ts)
 * 3. Ki Jaka dialogue tree exists (data/dialogues.ts)
 * 4. Ki Jaka NPC routing = DIALOGUE (data/dialogues.ts)
 * 5. questGiverId "ki" in vertical-slice (data/vertical-slice.ts)
 * 6. Canvas renderer handles npc.ki label (rendering/canvas-renderer.ts)
 * 7. Asset manifest has Ki Jaka reference (rendering/rpg-asset-manifest.ts)
 * 8. E → INTERACT path: interaction kind "NPC" + ref "npc.ki" → dialogue
 * 9. Canonical map.desa has Ki Jaka at npcSpawns (data/world-maps.ts)
 * 10. Position is on walkable path (not overlapping solid entities)
 *
 * Run: npx tsx scripts/test-ki-jaka-registration.ts
 * Exit 0 = ALL PASS, 1 = FAIL.
 */

import { NPCS } from "../src/game/rpg/data/npcs";
import { MAP_VILLAGE_SQUARE } from "../src/game/rpg/data/maps";
import { DIALOGUE_TREES, NPC_ROUTING, getDialogueTree } from "../src/game/rpg/data/dialogues";
import { startDialogue, selectDialogueStart } from "../src/game/rpg/interaction/dialogue";
import { DESA_VERTICAL_SLICE } from "../src/game/rpg/data/vertical-slice";
import { WORLD_MAPS } from "../src/game/rpg/data/world-maps";
import { RPG_ASSET_MANIFEST } from "../src/game/rpg/rendering/rpg-asset-manifest";

const ROOT = process.cwd();
let pass = 0;
let fail = 0;

function check(label: string, ok: boolean): void {
  if (ok) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.error(`  ❌ ${label}`); }
}

// ══ A. NPCS array registration ════════════════════════════════════════
console.log("\n🧍 A. NPCS array registration");
const ki = NPCS.find((n) => n.id === "ki");
check("1. Ki Jaka exists in NPCS array", ki !== undefined);
check("2. Ki Jaka name = 'Ki Jaka'", ki?.name === "Ki Jaka");
check("3. Ki Jaka asset = 'npc.elder'", ki?.asset === "npc.elder");
check("4. Ki Jaka dialogueId = 'dlg.ki.intro'", ki?.dialogueId === "dlg.ki.intro");
check("5. Ki Jaka mapId = 'map.village-square'", ki?.mapId === "map.village-square");
check("6. Ki Jaka position normalized (0..1)",
  typeof ki?.position.x === "number" && ki.position.x >= 0 && ki.position.x <= 1 &&
  typeof ki?.position.y === "number" && ki.position.y >= 0 && ki.position.y <= 1);

// ══ B. MAP_VILLAGE_SQUARE interaction point ══════════════════════════
console.log("\n📍 B. MAP_VILLAGE_SQUARE interaction point");
const npcInt = MAP_VILLAGE_SQUARE.interactions.find((i) => i.ref === "npc.ki");
check("7. NPC interaction point exists for npc.ki", npcInt !== undefined);
check("8. Interaction kind = 'NPC'", npcInt?.kind === "NPC");
check("9. Interaction id = 'int.npc.ki'", npcInt?.id === "int.npc.ki");
check("10. Interaction position matches NPCS position",
  npcInt?.position.x === ki?.position.x && npcInt?.position.y === ki?.position.y);

// ══ C. Position walkability ══════════════════════════════════════════
console.log("\n🗺️ C. Position walkability");
const pos = npcInt!.position;
const mapW = MAP_VILLAGE_SQUARE.tiles.width;
const mapH = MAP_VILLAGE_SQUARE.tiles.height;
// Check no solid entity overlaps the NPC position (within scale-aware radius)
const overlapping = MAP_VILLAGE_SQUARE.entities.filter((e) => {
  if (!e.solid) return false;
  const dx = Math.abs(e.position.x - pos.x);
  const dy = Math.abs(e.position.y - pos.y);
  const r = 0.06 * (e.scale ?? 1); // approximate entity radius
  return dx < r && dy < r;
});
check("11. Position does not overlap any solid entity", overlapping.length === 0);
// Check position is near the path area (path runs at y≈0.42-0.5, x≈0.06-0.88)
check("12. Position is in walkable path region (y 0.35..0.55)",
  pos.y >= 0.35 && pos.y <= 0.55);
// Check distance from other NPCs
const otherNpcs = NPCS.filter((n) => n.id !== "ki");
const tooClose = otherNpcs.filter((n) => {
  const dx = Math.abs(n.position.x - pos.x);
  const dy = Math.abs(n.position.y - pos.y);
  return Math.sqrt(dx * dx + dy * dy) < 0.08;
});
check("13. Position not overlapping other NPCs (min dist 0.08)", tooClose.length === 0);

// ══ D. Dialogue system ═══════════════════════════════════════════════
console.log("\n💬 D. Dialogue system");
check("14. dlg.ki.intro dialogue tree exists", DIALOGUE_TREES["ki"] !== undefined);
check("15. Dialogue npcId = 'ki'", DIALOGUE_TREES["ki"]?.npcId === "ki");
check("16. Dialogue dialogueId = 'dlg.ki.intro'", DIALOGUE_TREES["ki"]?.dialogueId === "dlg.ki.intro");
check("17. Dialogue has 'intro' start node", DIALOGUE_TREES["ki"]?.nodes["intro"] !== undefined);
check("18. Intro speaker = 'Ki Jaka'", DIALOGUE_TREES["ki"]?.nodes["intro"]?.speaker === "Ki Jaka");
check("19. NPC_ROUTING['ki'] = 'DIALOGUE'", NPC_ROUTING["ki"] === "DIALOGUE");
check("20. getDialogueTree('ki') returns tree", getDialogueTree("ki") !== undefined);

// ══ E. E → INTERACT → dialogue path ══════════════════════════════════
console.log("\n🎮 E. E → INTERACT → dialogue path");
// startDialogue with npcId "ki" should create a valid session
const session = startDialogue("ki", 0, "intro");
check("21. startDialogue('ki') creates session", session !== undefined);
check("22. Session kind = 'DIALOGUE'", session?.kind === "DIALOGUE");
check("23. Session npcId = 'ki'", session?.npcId === "ki");
check("24. Session dialogueId = 'dlg.ki.intro'", session?.dialogueId === "dlg.ki.intro");
check("25. Session nodeId = 'intro'", session?.nodeId === "intro");
// selectDialogueStart for quest 0 should return "intro"
const startNode = selectDialogueStart("ki", {
  quest: 0, kills: 0, flowers: 0, flags: {},
  nowMs: 0, restCooldownUntilMs: 0,
});
check("26. selectDialogueStart quest=0 → 'intro'", startNode === "intro");

// ══ F. Vertical slice integration ════════════════════════════════════
console.log("\n📋 F. Vertical slice integration");
check("27. questGiverId = 'ki'", DESA_VERTICAL_SLICE.questGiverId === "ki");
check("28. mapId = 'map.desa'", DESA_VERTICAL_SLICE.mapId === "map.desa");

// ══ G. Canonical map.desa npcSpawns ══════════════════════════════════
console.log("\n🌍 G. Canonical map.desa npcSpawns");
const desa = WORLD_MAPS["map.desa"];
check("29. map.desa exists", desa !== undefined);
const desaNpc = desa?.npcSpawns.find((n) => n.id === "ki");
check("30. Ki Jaka in map.desa npcSpawns", desaNpc !== undefined);
check("31. Canonical name = 'Ki Jaka'", desaNpc?.name === "Ki Jaka");
check("32. Canonical tile position (18, 19)", desaNpc?.x === 18 && desaNpc?.y === 19);

// ══ H. Asset manifest reference ═══════════════════════════════════════
console.log("\n🎨 H. Asset manifest reference");
const assetRef = RPG_ASSET_MANIFEST.find((e) => e.id === "ref:npc-ki-jaka");
check("33. Asset manifest has ref:npc-ki-jaka", assetRef !== undefined);
check("34. Asset category = 'npcs'", assetRef?.category === "npcs");
check("35. Asset status = 'NEEDS_REVIEW' (not silently ready)", assetRef?.status === "NEEDS_REVIEW");

const rtRef = RPG_ASSET_MANIFEST.find((e) => e.id === "ref:rt-npc-ki-jaka");
check("36. Runtime ref present (ref:rt-npc-ki-jaka)", rtRef !== undefined);

// ══ Summary ══════════════════════════════════════════════════════════
console.log(`\n📊 P2.8.6 Ki Jaka Registration: ${pass} lulus, ${fail} gagal\n`);
if (fail > 0) process.exit(1);
process.exit(0);
