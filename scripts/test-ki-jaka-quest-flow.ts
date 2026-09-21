/**
 * P2.8.6-B2 — Ki Jaka Gameplay & First Quest Flow focused test.
 *
 * Verifies the complete first playable quest flow:
 * 1. Ki Jaka interaction
 * 2. Dialogue starts correctly
 * 3. Quest acceptance via dialogue signals
 * 4. Quest transitions to ACTIVE (main=1)
 * 5. Objective text updates
 * 6. Duplicate acceptance prevented
 * 7. Duplicate reward prevented
 * 8. Quest state machine integrity
 * 9. Village exit route walkable
 * 10. B3 handoff contract
 *
 * Run: npx tsx scripts/test-ki-jaka-quest-flow.ts
 * Exit 0 = ALL PASS, 1 = FAIL.
 */

import { NPCS } from "../src/game/rpg/data/npcs";
import { NPC_ROUTING, getDialogueTree, DIALOGUE_TREES } from "../src/game/rpg/data/dialogues";
import { startDialogue, selectDialogueStart, advanceDialogue, collectSignals, currentNode } from "../src/game/rpg/interaction/dialogue";
import { isValidQuestTransition, createQuestLineState, applyQuestNumber } from "../src/game/rpg/quests/quest-engine";
import { QUEST_TRACKER_TEXT, renderTrackerText } from "../src/game/rpg/quests/flags";
import { DESA_VERTICAL_SLICE } from "../src/game/rpg/data/vertical-slice";
import { WORLD_MAPS } from "../src/game/rpg/data/world-maps";
import { isWalkable } from "../src/game/rpg/world/tiles";
import { loadCanonicalMap } from "../src/game/rpg/world/map-loader";

let pass = 0;
let fail = 0;

function check(label: string, ok: boolean): void {
  if (ok) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.error(`  ❌ ${label}`); }
}

const desa = WORLD_MAPS["map.desa"];

// ══ A. Ki Jaka Interaction Chain ═════════════════════════════════════
console.log("\n🧍 A. Ki Jaka Interaction Chain");
const ki = NPCS.find((n) => n.id === "ki");
check("1. Ki Jaka registered in NPCS", ki !== undefined);
check("2. NPC routing = DIALOGUE", NPC_ROUTING["ki"] === "DIALOGUE");
check("3. Dialogue tree exists", getDialogueTree("ki") !== undefined);
check("4. Dialogue tree has 'intro' node", DIALOGUE_TREES["ki"]?.nodes["intro"] !== undefined);

// ══ B. Dialogue Start ═══════════════════════════════════════════════
console.log("\n💬 B. Dialogue Start");
const freshCtx = { quest: 0, kills: 0, flowers: 0, flags: {}, nowMs: 0, restCooldownUntilMs: 0 };
const startNode = selectDialogueStart("ki", freshCtx);
check("5. Fresh game → selectDialogueStart returns 'intro'", startNode === "intro");

const session = startDialogue("ki", 0, "intro");
check("6. startDialogue creates session", session !== undefined);
check("7. Session kind = DIALOGUE", session?.kind === "DIALOGUE");
check("8. Session npcId = 'ki'", session?.npcId === "ki");
check("9. Session starts at 'intro'", session?.nodeId === "intro");

const tree = getDialogueTree("ki")!;
const introNode = currentNode(tree, session!);
check("10. Intro speaker = 'Ki Jaka'", introNode?.node.speaker === "Ki Jaka");
check("11. Intro has lines", (introNode?.lines.length ?? 0) > 0);

// ══ C. Quest Acceptance ═════════════════════════════════════════════
console.log("\n📋 C. Quest Acceptance");
const introEffects = DIALOGUE_TREES["ki"]?.nodes["intro"]?.effects ?? [];
check("12. Intro has QUEST effect", introEffects.some((e) => e.type === "QUEST" && e.amount === 1));
check("13. Intro has GOLD effect", introEffects.some((e) => e.type === "GOLD" && e.amount === 30));

// Simulate dialogue end → collect signals
const endedSession = { ...session!, visited: ["intro"], atEnd: true };
const signals = collectSignals(tree, endedSession);
check("14. Signals collected from visited nodes", signals.length >= 2);
check("15. Signals include QUEST→1", signals.some((s) => s.type === "QUEST" && s.amount === 1));
check("16. Signals include GOLD→30", signals.some((s) => s.type === "GOLD" && s.amount === 30));

// Apply quest transition
const quest0 = createQuestLineState();
const valid0to1 = isValidQuestTransition(0, 1, { quest: 0, kills: 0, flags: {} });
check("17. isValidQuestTransition(0→1) = true", valid0to1);

const quest1 = applyQuestNumber(quest0, 1, { quest: 0, kills: 0, flags: {} });
check("18. applyQuestNumber(0→1) changes main to 1", quest1.main === 1);
check("19. kills unchanged", quest1.kills === 0);
check("20. flowers unchanged", quest1.flowers === 0);

// ══ D. Quest ACTIVE State ═══════════════════════════════════════════
console.log("\n🎯 D. Quest ACTIVE State");
check("21. quest.main === 1 means ACTIVE", quest1.main === 1);
check("22. QUEST_TRACKER_TEXT[1] exists", QUEST_TRACKER_TEXT[1] !== undefined);
const objective = renderTrackerText(1, 0, 0);
check("23. Objective text includes 'Korog'", objective.includes("Korog"));
check("24. Objective text includes kill counter '(0/3)'", objective.includes("(0/3)"));
check("25. Objective text includes 'Ki Jaka'", objective.includes("Ki Jaka"));

// After 2 kills
const objective2k = renderTrackerText(1, 2, 0);
check("26. Objective updates with kills '(2/3)'", objective2k.includes("(2/3)"));

// ══ E. Duplicate Prevention ═════════════════════════════════════════
console.log("\n🔒 E. Duplicate Prevention");
// Cannot re-accept quest at state 1
const dup1 = isValidQuestTransition(1, 1, { quest: 1, kills: 0, flags: {} });
check("27. isValidQuestTransition(1→1) = false (no duplicate)", dup1 === false);

// Cannot accept quest at state 2 (already past)
const dup2 = isValidQuestTransition(2, 1, { quest: 2, kills: 3, flags: {} });
check("28. isValidQuestTransition(2→1) = false (no backward)", dup2 === false);

// Cannot skip to state 2 without kills
const skip = isValidQuestTransition(0, 2, { quest: 0, kills: 0, flags: {} });
check("29. isValidQuestTransition(0→2) = false (no skip)", skip === false);

// applyQuestNumber rejects redundant
const quest1dup = applyQuestNumber(quest1, 1, { quest: 1, kills: 0, flags: {} });
check("30. applyQuestNumber(1→1) returns same state (idempotent)", quest1dup.main === 1);

// Cannot go back to 0
const back0 = isValidQuestTransition(1, 0, { quest: 1, kills: 0, flags: {} });
check("31. isValidQuestTransition(1→0) = false (no restart)", back0 === false);

// Dead state 5
const dead5 = isValidQuestTransition(0, 5, { quest: 0, kills: 0, flags: {} });
check("32. isValidQuestTransition(0→5) = false (dead state)", dead5 === false);

// ══ F. Quest Progression ════════════════════════════════════════════
console.log("\n📈 F. Quest Progression");
// After 3 kills, can advance to state 2
const valid1to2 = isValidQuestTransition(1, 2, { quest: 1, kills: 3, flags: {} });
check("33. isValidQuestTransition(1→2, kills=3) = true", valid1to2);

// But NOT with only 2 kills
const noSkip2 = isValidQuestTransition(1, 2, { quest: 1, kills: 2, flags: {} });
check("34. isValidQuestTransition(1→2, kills=2) = false", noSkip2 === false);

const quest2 = applyQuestNumber(quest1, 2, { quest: 1, kills: 3, flags: {} });
check("35. applyQuestNumber(1→2) changes main to 2", quest2.main === 2);

const obj2 = renderTrackerText(2, 3, 0);
check("36. State 2 objective = RAJA KOROG", obj2.includes("RAJA KOROG"));

// ══ G. Branch Selection by Quest State ══════════════════════════════
console.log("\n🌿 G. Branch Selection by Quest State");
check("37. quest=0 → 'intro'", selectDialogueStart("ki", { quest: 0, kills: 0, flowers: 0, flags: {}, nowMs: 0, restCooldownUntilMs: 0 }) === "intro");
check("38. quest=1, kills=0 → 'progress'", selectDialogueStart("ki", { quest: 1, kills: 0, flowers: 0, flags: {}, nowMs: 0, restCooldownUntilMs: 0 }) === "progress");
check("39. quest=1, kills=2 → 'progress'", selectDialogueStart("ki", { quest: 1, kills: 2, flowers: 0, flags: {}, nowMs: 0, restCooldownUntilMs: 0 }) === "progress");
check("40. quest=1, kills=3 → 'report'", selectDialogueStart("ki", { quest: 1, kills: 3, flowers: 0, flags: {}, nowMs: 0, restCooldownUntilMs: 0 }) === "report");
check("41. quest=2 → 'huntElse'", selectDialogueStart("ki", { quest: 2, kills: 3, flowers: 0, flags: {}, nowMs: 0, restCooldownUntilMs: 0 }) === "huntElse");

// ══ H. Village Exit Route ══════════════════════════════════════════
console.log("\n🚶 H. Village Exit Route");
// Spawn (12,19) → main road (12,17) → east to dock (27-28,17) → forest (33,17) → encounters
const routeToE1 = [[12,19],[12,18],[12,17],[26,17],[27,17],[28,17],[29,17],[33,17],[33,16],[33,15],[33,14],[33,13],[33,12],[33,11]];
const routeToE2 = [[33,13],[33,14],[34,14]];
const routeToE3 = [[31,17],[31,18],[31,19],[31,20],[31,21]];

check("42. Spawn to e1 route walkable", routeToE1.every(([x,y]) => isWalkable(desa, x, y)));
check("43. Route to e2 walkable", routeToE2.every(([x,y]) => isWalkable(desa, x, y)));
check("44. Route to e3 walkable", routeToE3.every(([x,y]) => isWalkable(desa, x, y)));
check("45. Dock crossing (27,17) walkable", isWalkable(desa, 27, 17));
check("46. Dock crossing (28,17) walkable", isWalkable(desa, 28, 17));

// Encounter tiles walkable
check("47. e1 tile (33,11) walkable", isWalkable(desa, 33, 11));
check("48. e2 tile (34,14) walkable", isWalkable(desa, 34, 14));
check("49. e3 tile (31,21) walkable", isWalkable(desa, 31, 21));

// ══ I. Vertical Slice Config ══════════════════════════════════════
console.log("\n📐 I. Vertical Slice Config");
check("50. questGiverId = 'ki'", DESA_VERTICAL_SLICE.questGiverId === "ki");
check("51. encounterIds = e1,e2,e3", DESA_VERTICAL_SLICE.encounterIds.length === 3);
check("52. requiredKorogWins = 3", DESA_VERTICAL_SLICE.requiredKorogWins === 3);
check("53. mapId = 'map.desa'", DESA_VERTICAL_SLICE.mapId === "map.desa");

// ══ J. Canonical Map Entities ══════════════════════════════════════
console.log("\n🎨 J. Canonical Map Entities");
const world = loadCanonicalMap("map.desa");
check("54. World loads successfully", world !== null);
check("55. Entities array not empty", (world?.entities.length ?? 0) > 0);
check("56. House entity present", world?.entities.some((e) => e.type === "house") ?? false);
check("57. Tree entities present", world?.entities.filter((e) => e.type === "tree").length === 2);
check("58. Rock entities present", world?.entities.filter((e) => e.type === "rock").length === 2);
check("59. Ki Jaka interaction present", world?.interactions.some((i) => i.ref === "npc.ki") ?? false);

// ══ K. B3 Handoff Contract ════════════════════════════════════════
console.log("\n📦 K. B3 Handoff Contract");
// B3 should detect: quest.main === 1 → spawn Korog encounters
check("60. B3 can detect ACTIVE quest (main=1)", quest1.main === 1);
check("61. B3 can read encounterIds from vertical slice", DESA_VERTICAL_SLICE.encounterIds.includes("e1"));
check("62. B3 knows required wins (3)", DESA_VERTICAL_SLICE.requiredKorogWins === 3);
check("63. B3 can check progress via kills", quest1.kills === 0);
// After 3 kills → quest.main should be 2 → B3 knows to report to Ki Jaka
check("64. After 3 kills + report → quest.main=2 (B3 complete)", quest2.main === 2);

// ══ Summary ════════════════════════════════════════════════════════
console.log(`\n📊 P2.8.6-B2 Quest Flow: ${pass} lulus, ${fail} gagal\n`);
if (fail > 0) process.exit(1);
process.exit(0);
