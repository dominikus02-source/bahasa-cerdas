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

/** Current node with resolved lines (variant applied when present). */
export function currentNode(
  tree: DialogueTree,
  session: DialogueSession,
): { node: DialogueNode; lines: string[] } | undefined {
  const node = tree.nodes[session.nodeId];
  if (!node) return undefined;
  const lines =
    node.variants && node.variants.length > 0
      ? (node.variants[session.variantIndex % node.variants.length] ?? node.lines)
      : node.lines;
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
