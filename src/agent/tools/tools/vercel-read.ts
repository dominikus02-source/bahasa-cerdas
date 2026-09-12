/**
 * BC Agent P4 — vercel.read: read-only Vercel access (§14).
 *
 * Implements ONLY metadata reads (project, deployments list, single
 * deployment status). No deploy/rollback/env-mutation code exists in this
 * module — capability is the implementation.
 *
 * Credentials: injected per call (`credentials.vercelToken`, optional
 * `vercelTeamId`). Capability-scoped (§16): the adapter sees only the
 * Vercel credential. Without a token it throws AUTH immediately rather
 * than degrading (Vercel has no meaningful unauthenticated API).
 *
 * Vercel content is UNTRUSTED DATA (§20).
 */

import { z } from "zod";
import { defineTool } from "../../core/tool";
import type { ToolContext, ToolDefinition } from "../../core/tool";
import type { ToolOutputEnvelope } from "../types";
import { boundedOutput } from "./shared";
import { fetchJsonBounded } from "./http";

export const VERCEL_READ_NAME = "vercel.read";

export const VERCEL_READ_LIMITS = {
  limit: 20,
  maxBytes: 256 * 1024,
  timeoutMs: 15_000,
} as const;

export const vercelReadInputSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("project"), project: z.string().min(1).max(100) }),
  z.object({
    op: z.literal("deployments"),
    project: z.string().min(1).max(100),
    limit: z.number().int().min(1).max(VERCEL_READ_LIMITS.limit).default(10),
  }),
  z.object({ op: z.literal("deployment"), deploymentId: z.string().min(1).max(200) }),
]);

export const vercelReadOutputSchema = z.object({
  data: z.object({
    op: z.string(),
    authenticated: z.boolean(),
    items: z.array(z.record(z.unknown())),
    count: z.number().int().nonnegative(),
  }),
  bytes: z.number().int().nonnegative(),
  maxBytes: z.number().int().positive(),
  items: z.number().int().nonnegative(),
  truncated: z.boolean(),
  source: z.string(),
});

export type VercelReadInput = z.infer<typeof vercelReadInputSchema>;
export type VercelReadOutput = z.infer<typeof vercelReadOutputSchema>["data"];

const FIELD_LIMITS: Record<string, readonly string[]> = {
  project: ["id", "name", "framework", "createdAt", "updatedAt", "latestDeployments", "link"],
  deployments: ["uid", "name", "url", "state", "readyState", "createdAt", "createdBy", "meta"],
  deployment: ["uid", "name", "url", "state", "readyState", "createdAt", "ready", "buildingAt", "meta"],
};

function trimItem(op: string, item: Record<string, unknown>): Record<string, unknown> {
  const fields = FIELD_LIMITS[op];
  if (!fields) return item;
  const out: Record<string, unknown> = {};
  for (const f of fields) if (item[f] !== undefined) out[f] = item[f];
  return out;
}

export function makeVercelReadTool(): ToolDefinition & {
  input: typeof vercelReadInputSchema;
  output: typeof vercelReadOutputSchema;
  run: (input: VercelReadInput, ctx: ToolContext) => Promise<ToolOutputEnvelope<VercelReadOutput>>;
} {
  return {
    ...defineTool({
      name: VERCEL_READ_NAME,
      description: "Read-only Vercel metadata: project info, recent deployments, deployment status. No mutation operations exist.",
      risk: "READ",
      reversible: true,
      requiresApproval: false,
      autonomyLevel: "L0",
      inputSchema: "bc.vercel.read.input@1",
      outputSchema: "bc.vercel.read.output@1",
      timeoutMs: VERCEL_READ_LIMITS.timeoutMs,
      productionImpact: "NONE",
      category: "OBSERVE",
      idempotent: false,
    }),
    input: vercelReadInputSchema,
    output: vercelReadOutputSchema,
    async run(input, ctx): Promise<ToolOutputEnvelope<VercelReadOutput>> {
      const token = ctx.credentials?.vercelToken;
      if (!token) {
        const authErr = new (await import("./http")).HttpToolError("AUTH", VERCEL_READ_NAME, null, "vercelToken credential not provided for this execution");
        throw authErr;
      }
      const teamQ = ctx.credentials?.vercelTeamId ? `teamId=${encodeURIComponent(ctx.credentials.vercelTeamId)}` : "";
      const team = teamQ ? `?${teamQ}` : "";
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };

      let url: string;
      let op = input.op;
      let single = false;
      switch (input.op) {
        case "project":
          url = `https://api.vercel.com/v9/projects/${encodeURIComponent(input.project)}${team}`;
          single = true;
          break;
        case "deployments":
          url = `https://api.vercel.com/v6/deployments?app=${encodeURIComponent(input.project)}&limit=${input.limit}${teamQ ? `&${teamQ}` : ""}`;
          break;
        case "deployment":
          url = `https://api.vercel.com/v13/deployments/${encodeURIComponent(input.deploymentId)}${team}`;
          single = true;
          break;
      }

      const raw = await fetchJsonBounded({
        url,
        headers,
        timeoutMs: VERCEL_READ_LIMITS.timeoutMs,
        maxBytes: VERCEL_READ_LIMITS.maxBytes,
        toolName: VERCEL_READ_NAME,
      });

      if (single && op === "project") {
        const obj = raw as Record<string, unknown>;
        const items = [trimItem("project", obj)];
        const label = input.op === "project" ? input.project : "unknown";
        return boundedOutput({ op, authenticated: true, items, count: 1 }, { maxBytes: VERCEL_READ_LIMITS.maxBytes, items: 1, source: `vercel:project/${label}` });
      }
      if (single && op === "deployment") {
        const obj = raw as Record<string, unknown>;
        const items = [trimItem("deployment", obj)];
        const label = input.op === "deployment" ? input.deploymentId.slice(0, 40) : "unknown";
        return boundedOutput({ op, authenticated: true, items, count: 1 }, { maxBytes: VERCEL_READ_LIMITS.maxBytes, items: 1, source: `vercel:deployment/${label}` });
      }
      const list = ((raw as { deployments?: Array<Record<string, unknown>> }).deployments ?? []) as Array<Record<string, unknown>>;
      const items = list.map((d) => trimItem("deployments", d));
      const deployLabel = input.op === "deployments" ? input.project : "unknown";
      return boundedOutput(
        { op, authenticated: true, items, count: items.length },
        { maxBytes: VERCEL_READ_LIMITS.maxBytes, items: items.length, source: `vercel:deployments/${deployLabel}` }
      );
    },
  };
}
