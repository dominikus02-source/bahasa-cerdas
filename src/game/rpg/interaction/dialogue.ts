/**
 * Dialogue domain — Pendekar Suryakerta (P1.5).
 *
 * Pure session logic over data/dialogues.ts. No React, no DOM, no storage,
 * no network, no renderer, no RNG. Variant selection is an explicit index
 * (prototype used Math.random for Bagas — randomness has no place here).
 *
 * Sessions are created/advanced/closed by the engine, which owns all
 * mutation (flags, REST heal, signals). This module only computes.
 */

import type { DialogueTree, DialogueNode } from "../data/dialogues";
import { getDialogueTree } from "../data/dialogues";

/** Active dialogue session (engine-held, never persisted mid-dialogue). */
export interface DialogueSession {
  kind: "DIALOGUE";
  npcId: string;
  dialogueId: string;
  nodeId: string;
  /** Variant index chosen for variant-bearing nodes (default 0). */
  variantIndex: number;
  /** Nodes already displayed (audit trail for the session). */
  visited: string[];
  /** True once the final node has been displayed. */
  atEnd: boolean;
}

/** Start a dialogue; undefined = unknown NPC (caller no-ops). */
export function startDialogue(
  npcId: string,
  variantIndex = 0,
  startNode?: string,
): DialogueSession | undefined {
  const tree = getDialogueTree(npcId);
  if (!tree) return undefined;
  const nodeId = startNode && tree.nodes[startNode] ? startNode : tree.start;
  return {
    kind: "DIALOGUE" as const,
    npcId,
    dialogueId: tree.dialogueId,
    nodeId,
    variantIndex,
    visited: [],
    atEnd: false,
  };
}

/** Current node with resolved lines (variant + template slots applied). */
export function currentNode(
  tree: DialogueTree,
  session: DialogueSession,
  vars?: { kills?: number; flowers?: number },
): { node: DialogueNode; lines: string[] } | undefined {
  const node = tree.nodes[session.nodeId];
  if (!node) return undefined;
  const raw =
    node.variants && node.variants.length > 0
      ? (node.variants[session.variantIndex % node.variants.length] ?? node.lines)
      : node.lines;
  const lines = raw.map((l) =>
    l
      .replace("{kills}", String(Math.min(vars?.kills ?? 0, 3)))
      .replace("{flowers}", String(Math.min(vars?.flowers ?? 0, 3))),
  );
  return { node, lines };
}

/** Advance: mark current visited; move to next or finish. Pure. */
export function advanceDialogue(
  tree: DialogueTree,
  session: DialogueSession,
): DialogueSession {
  const node = tree.nodes[session.nodeId];
  const visited = [...session.visited, session.nodeId];
  if (!node || !node.next || !tree.nodes[node.next]) {
    return { ...session, visited, atEnd: true };
  }
  return { ...session, nodeId: node.next, visited, atEnd: false };
}

/** All effect signals on visited nodes (engine emits them at END, unapplied). */
export function collectSignals(
  tree: DialogueTree,
  session: DialogueSession,
): NonNullable<DialogueNode["effects"]> {
  const out: NonNullable<DialogueNode["effects"]> = [];
  for (const id of [...session.visited, ...(session.atEnd ? [] : [session.nodeId])]) {
    const n = tree.nodes[id];
    if (n?.effects) out.push(...n.effects);
  }
  return out;
}

/**
 * Pendaki entry selection (prototype rest/cooldown branch, verbatim logic).
 * Pure over explicit clock: returns the start node id. The engine supplies
 * Date.now(); tests inject fixed values. Cooldown itself is wall-clock
 * (prototype restT), not RNG — deterministic given the clock input.
 */
export function pendakiEntryNode(nowMs: number, cooldownUntilMs: number): string {
  return nowMs < cooldownUntilMs ? "cooldown" : "rest";
}

export interface BranchContext {
  quest: number;
  kills: number;
  flags: Record<string, boolean>;
  nowMs: number;
  restCooldownUntilMs: number;
}

/**
 * Canonical branch selection — VERBATIM transcription of prototype talkTo
 * branch order per NPC (talkKi → towerDone/nagaDead/bossDead/quest0/quest1/
 * else; talkSari → sari/charm; talkEyang → towerDone/nagaDead+towerIntro/
 * nagaDead/skill/bossDead/else; talkTani → tani flag; Bagas → flag tiers).
 *
 * No invented branches: every arm maps to transcribed node ids. GE pickup
 * (flowers) has no runtime system yet, so sari always resolves to `progress`
 * while uncharmed (documented; `complete` exists in data for later).
 * `player.skill` has no production counterpart, so eyang pre-boss always
 * resolves to `intro` (SKILL signal, unapplied hook).
 */
export function selectDialogueStart(npcId: string, ctx: BranchContext): string {
  const f = ctx.flags;
  switch (npcId) {
    case "ki":
      if (f.towerDone) return f.kiAfter3 ? "towerRepeat" : "towerReward";
      if (f.nagaDead) return f.kiAfter2 ? "nagaRepeat" : "nagaReward";
      if (f.bossDead) return f.kiAfter ? "bossRepeat" : "bossReward";
      if (ctx.quest === 0) return "intro";
      if (ctx.quest === 1) return ctx.kills >= 3 ? "report" : "progress";
      return "huntElse";
    case "sari":
      if (!f.sari) return "intro";
      if (!f.charm) return "progress";
      return "done";
    case "eyang":
      if (f.towerDone) return "towerDone";
      if (f.nagaDead) return f.towerIntro ? "postIntro" : "towerIntro";
      if (f.bossDead) return "gunungHint";
      return "intro";
    case "bagas":
      if (f.towerDone) return "legendTalk";
      if (f.nagaDead) return "nagaTalk";
      if (f.bossDead) return "bossTalk";
      return "intro";
    case "tani":
      return f.tani ? "repeat" : "intro";
    case "pendaki":
      return pendakiEntryNode(ctx.nowMs, ctx.restCooldownUntilMs);
    default:
      return getDialogueTree(npcId)?.start ?? "intro";
  }
}
