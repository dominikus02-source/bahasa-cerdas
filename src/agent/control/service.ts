/**
 * BC Agent P6 — canonical service factory.
 *
 * The control center never persists anything directly: all writes go through
 * the P2 AgentTaskService (the single durable adapter around the pure P1
 * core). This factory gives the web layer one place to obtain a properly
 * constructed service bound to the shared Prisma client (`lib/db`), with
 * real time and UUIDs — the same construction pattern as the P5 composition
 * root (src/agent/worker/run.ts).
 */

import { db } from "@/lib/db";
import { AgentTaskService } from "@/src/agent/persistence/service";

/** Process-wide singleton service (the underlying Prisma client is shared). */
export function getAgentTaskService(): AgentTaskService {
  return new AgentTaskService(
    db,
    () => new Date().toISOString(),
    () => crypto.randomUUID()
  );
}
