/**
 * Agent Registry — central registry of all AI agents.
 *
 * Supports:
 * - registerAgent() — add an agent at runtime
 * - getAgent() — retrieve agent by ID
 * - listAgents() — list all registered agents
 * - isValidAgentId() — type guard
 */

import type { AgentDefinition, AgentId, AgentInput, AgentOutput } from "./agent-types";

const agents = new Map<AgentId, AgentDefinition<any, any>>();

/**
 * Register an agent in the registry.
 */
export function registerAgent<I extends AgentInput = AgentInput, O extends AgentOutput = AgentOutput>(
  agent: AgentDefinition<I, O>
): void {
  if (agents.has(agent.id)) {
    console.warn(`[AgentRegistry] Overwriting existing agent: ${agent.id}`);
  }
  agents.set(agent.id, agent as unknown as AgentDefinition);
}

/**
 * Get an agent by ID.
 */
export function getAgent(id: AgentId): AgentDefinition | undefined {
  return agents.get(id);
}

/**
 * List all registered agents (returns copies to prevent mutation).
 */
export function listAgents(): AgentDefinition[] {
  return Array.from(agents.values()).map((a) => ({ ...a }));
}

/**
 * Check if a string is a valid registered agent ID.
 */
export function isValidAgentId(id: string): id is AgentId {
  return agents.has(id as AgentId);
}

/**
 * List agents filtered by target user.
 */
export function getAgentsForUser(role: "guru" | "murid" | "admin"): AgentDefinition[] {
  return Array.from(agents.values()).filter(
    (a) => a.targetUser === role || a.targetUser === "all"
  );
}

/**
 * Get total registered agent count.
 */
export function agentCount(): number {
  return agents.size;
}

/**
 * Clear all agents (for testing).
 */
export function resetRegistry(): void {
  agents.clear();
}
