/**
 * BC Agent P4 — tool registry.
 *
 * A pure in-memory catalog: register (with P1 validation), lookup, list.
 * The registry NEVER executes tools and holds no business logic — it is
 * the executor's trusted source of tool definitions. Registration runs the
 * full P1 `validateToolDefinition` so contradictory metadata is rejected
 * at the door (P1's audit finding, enforced here for every P4 tool).
 */

import type { ToolDefinition } from "../core/tool";
import { validateToolDefinition } from "../core/tool";
import { ToolDuplicateError, ToolNotFoundError } from "./errors";

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  /** Register a tool; runs full P1 validation. Duplicate names are rejected. */
  register(tool: ToolDefinition): void {
    validateToolDefinition(tool); // typed InvalidToolDefinitionError on violation
    if (this.tools.has(tool.name)) {
      throw new ToolDuplicateError(tool.name);
    }
    this.tools.set(tool.name, tool);
  }

  /** Lookup by exact dotted name. Unknown → typed error. */
  get(name: string): ToolDefinition {
    const tool = this.tools.get(name);
    if (!tool) throw new ToolNotFoundError(name);
    return tool;
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  /** Stable list sorted by name (deterministic for callers/tests). */
  list(): readonly ToolDefinition[] {
    return [...this.tools.values()].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  }

  get size(): number {
    return this.tools.size;
  }
}
