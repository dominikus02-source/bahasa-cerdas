/**
 * Battle learning panel decision — Pendekar Suryakerta (P1.9A).
 *
 * Pure presentation routing (no JSX, no DOM): given authoritative battle +
 * learning snapshots, decide which panel the overlay shows. Three states:
 *
 * - HIDDEN: no battle, no learning moment, or moment fully consumed.
 * - QUESTION: PENDING challenge awaiting an answer.
 * - FEEDBACK: answered moment with retained feedback (includes the attack
 *   CTA — feedback persists until the next attack consumes it).
 *
 * Directly unit-tested (no browser timing). The component renders whatever
 * this returns; it never invents visibility.
 */

export type LearningPanelKind = "HIDDEN" | "QUESTION" | "FEEDBACK";

export function resolveLearningPanel(args: {
  inBattle: boolean;
  learningStatus?: "PENDING" | "RESOLVED";
  hasChallenge: boolean;
  hasFeedback: boolean;
}): LearningPanelKind {
  if (!args.inBattle) return "HIDDEN";
  if (args.learningStatus === "PENDING" && args.hasChallenge) return "QUESTION";
  if (args.learningStatus === "RESOLVED" && args.hasFeedback) return "FEEDBACK";
  return "HIDDEN";
}
