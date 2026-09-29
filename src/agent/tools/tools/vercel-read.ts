/**
 * BC Agent P9 — vercel.read: read-only Vercel production diagnostics.
 *
 * Capability is constrained by implementation: this module contains GET
 * requests only. It can inspect project/deployment metadata and bounded
 * deployment events for operational diagnosis, but it cannot deploy,
 * promote, rollback, mutate env vars, or change domains.
 *
 * Runtime/build event text is external untrusted data. It is bounded and
 * scrubbed for common credential shapes before entering the Agent trust
 * boundary.
 */

import { z } from "zod";
import { defineTool } from "../../core/tool";
import type { ToolContext, ToolDefinition } from "../../core/tool";
import type { ToolOutputEnvelope } from "../types";
import { boundedOutput } from "./shared";
import { fetchJsonBounded, HttpToolError } from "./http";

export const VERCEL_READ_NAME = "vercel.read";

export const VERCEL_READ_LIMITS = {
  limit: 50,
  maxBytes: 256 * 1024,
  timeoutMs: 15_000,
  maxSinceMinutes: 24 * 60,
} as const;

export const vercelReadInputSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("project"), project: z.string().min(1).max(100) }),
  z.object({
    op: z.literal("deployments"),
    project: z.string().min(1).max(100),
    limit: z.number().int().min(1).max(VERCEL_READ_LIMITS.limit).default(10),
  }),
  z.object({ op: z.literal("deployment"), deploymentId: z.string().min(1).max(200) }),
  z.object({
    op: z.literal("runtime_logs"),
    project: z.string().min(1).max(100),
    deploymentId: z.string().min(1).max(200).optional(),
    limit: z.number().int().min(1).max(VERCEL_READ_LIMITS.limit).default(30),
    sinceMinutes: z.number().int().min(1).max(VERCEL_READ_LIMITS.maxSinceMinutes).default(60),
    severity: z.enum(["errors", "all"]).default("errors"),
  }),
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
  deployments: ["uid", "name", "url", "state", "readyState", "createdAt", "createdBy", "meta", "target"],
  deployment: ["uid", "id", "name", "url", "state", "readyState", "createdAt", "ready", "buildingAt", "meta", "target"],
};

function trimItem(op: string, item: Record<string, unknown>): Record<string, unknown> {
  const fields = FIELD_LIMITS[op];
  if (!fields) return item;
  const out: Record<string, unknown> = {};
  for (const field of fields) if (item[field] !== undefined) out[field] = item[field];
  return out;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sanitizeLogText(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+/gi, "Bearer [redacted]")
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[redacted-key]")
    .replace(/\bAIza[A-Za-z0-9_-]{8,}\b/g, "[redacted-key]")
    .replace(/(["']?(?:api[_-]?key|token|secret|password|authorization)["']?\s*[:=]\s*)["']?[^\s,"'}]+/gi, "$1[redacted]")
    .slice(0, 700);
}

function runtimeEvent(event: Record<string, unknown>): Record<string, unknown> {
  const payload = record(event.payload);
  const proxy = record(payload.proxy);
  const statusCode = asNumber(payload.statusCode) ?? asNumber(proxy.statusCode);
  return {
    type: typeof event.type === "string" ? event.type : "unknown",
    created: asNumber(event.created),
    statusCode,
    requestMethod: typeof proxy.method === "string" ? proxy.method.slice(0, 16) : null,
    requestPath: typeof proxy.path === "string" ? proxy.path.slice(0, 300) : null,
    region: typeof proxy.region === "string" ? proxy.region.slice(0, 40) : null,
    requestId: typeof payload.requestId === "string" ? payload.requestId.slice(0, 120) : null,
    message: sanitizeLogText(payload.text),
  };
}

function isErrorRuntimeEvent(item: Record<string, unknown>): boolean {
  const type = item.type;
  const status = item.statusCode;
  return type === "fatal" || type === "stderr" || (typeof status === "number" && status >= 400);
}

export function makeVercelReadTool(): ToolDefinition & {
  input: typeof vercelReadInputSchema;
  output: typeof vercelReadOutputSchema;
  run: (input: VercelReadInput, ctx: ToolContext) => Promise<ToolOutputEnvelope<VercelReadOutput>>;
} {
  return {
    ...defineTool({
      name: VERCEL_READ_NAME,
      description:
        "Read-only Vercel diagnostics. Ops: project {project}; deployments {project,limit}; deployment {deploymentId}; runtime_logs {project,deploymentId?,limit,sinceMinutes,severity}. runtime_logs defaults to the latest READY production deployment and error-like events.",
      risk: "READ",
      reversible: true,
      requiresApproval: false,
      autonomyLevel: "L0",
      inputSchema: "bc.vercel.read.input@2",
      outputSchema: "bc.vercel.read.output@2",
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
        throw new HttpToolError(
          "AUTH",
          VERCEL_READ_NAME,
          null,
          "vercelToken credential not provided for this execution"
        );
      }

      const teamId = ctx.credentials?.vercelTeamId;
      const teamQ = teamId ? `teamId=${encodeURIComponent(teamId)}` : "";
      const teamSuffix = teamQ ? `?${teamQ}` : "";
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };

      if (input.op === "project") {
        const raw = await fetchJsonBounded({
          url: `https://api.vercel.com/v9/projects/${encodeURIComponent(input.project)}${teamSuffix}`,
          headers,
          timeoutMs: VERCEL_READ_LIMITS.timeoutMs,
          maxBytes: VERCEL_READ_LIMITS.maxBytes,
          toolName: VERCEL_READ_NAME,
        });
        const items = [trimItem("project", record(raw))];
        return boundedOutput(
          { op: input.op, authenticated: true, items, count: items.length },
          { maxBytes: VERCEL_READ_LIMITS.maxBytes, items: items.length, source: `vercel:project/${input.project}` }
        );
      }

      if (input.op === "deployments") {
        const raw = await fetchJsonBounded({
          url:
            `https://api.vercel.com/v7/deployments?projectId=${encodeURIComponent(input.project)}&limit=${input.limit}` +
            (teamQ ? `&${teamQ}` : ""),
          headers,
          timeoutMs: VERCEL_READ_LIMITS.timeoutMs,
          maxBytes: VERCEL_READ_LIMITS.maxBytes,
          toolName: VERCEL_READ_NAME,
        });
        const list = Array.isArray(record(raw).deployments)
          ? (record(raw).deployments as Array<Record<string, unknown>>)
          : [];
        const items = list.map((item) => trimItem("deployments", record(item)));
        return boundedOutput(
          { op: input.op, authenticated: true, items, count: items.length },
          { maxBytes: VERCEL_READ_LIMITS.maxBytes, items: items.length, source: `vercel:deployments/${input.project}` }
        );
      }

      if (input.op === "deployment") {
        const raw = await fetchJsonBounded({
          url: `https://api.vercel.com/v13/deployments/${encodeURIComponent(input.deploymentId)}${teamSuffix}`,
          headers,
          timeoutMs: VERCEL_READ_LIMITS.timeoutMs,
          maxBytes: VERCEL_READ_LIMITS.maxBytes,
          toolName: VERCEL_READ_NAME,
        });
        const items = [trimItem("deployment", record(raw))];
        return boundedOutput(
          { op: input.op, authenticated: true, items, count: items.length },
          { maxBytes: VERCEL_READ_LIMITS.maxBytes, items: items.length, source: `vercel:deployment/${input.deploymentId.slice(0, 60)}` }
        );
      }

      // runtime_logs: resolve the project first so the caller may pass the
      // stable project name ("bahasa-cerdas") instead of an opaque id.
      const projectRaw = await fetchJsonBounded({
        url: `https://api.vercel.com/v9/projects/${encodeURIComponent(input.project)}${teamSuffix}`,
        headers,
        timeoutMs: VERCEL_READ_LIMITS.timeoutMs,
        maxBytes: VERCEL_READ_LIMITS.maxBytes,
        toolName: VERCEL_READ_NAME,
      });
      const project = record(projectRaw);
      const projectId = typeof project.id === "string" ? project.id : input.project;

      let deploymentId = input.deploymentId;
      if (!deploymentId) {
        const latestRaw = await fetchJsonBounded({
          url:
            `https://api.vercel.com/v7/deployments?projectId=${encodeURIComponent(projectId)}&target=production&state=READY&limit=1` +
            (teamQ ? `&${teamQ}` : ""),
          headers,
          timeoutMs: VERCEL_READ_LIMITS.timeoutMs,
          maxBytes: VERCEL_READ_LIMITS.maxBytes,
          toolName: VERCEL_READ_NAME,
        });
        const deployments = Array.isArray(record(latestRaw).deployments)
          ? (record(latestRaw).deployments as Array<Record<string, unknown>>)
          : [];
        const latest = record(deployments[0]);
        const candidate =
          typeof latest.uid === "string"
            ? latest.uid
            : typeof latest.id === "string"
              ? latest.id
              : null;
        if (!candidate) {
          throw new HttpToolError("FAILED", VERCEL_READ_NAME, null, "no READY production deployment found");
        }
        deploymentId = candidate;
      }

      const since = Date.now() - input.sinceMinutes * 60_000;
      const eventLimit = Math.min(100, Math.max(input.limit, input.limit * 3));
      const eventsRaw = await fetchJsonBounded({
        url:
          `https://api.vercel.com/v3/deployments/${encodeURIComponent(deploymentId)}/events?direction=backward&follow=0&limit=${eventLimit}&since=${since}` +
          (teamQ ? `&${teamQ}` : ""),
        headers,
        timeoutMs: VERCEL_READ_LIMITS.timeoutMs,
        maxBytes: VERCEL_READ_LIMITS.maxBytes,
        toolName: VERCEL_READ_NAME,
      });

      const rawEvents = Array.isArray(eventsRaw)
        ? (eventsRaw as Array<Record<string, unknown>>)
        : Array.isArray(record(eventsRaw).events)
          ? (record(eventsRaw).events as Array<Record<string, unknown>>)
          : [];
      const normalized = rawEvents.map((event) => runtimeEvent(record(event)));
      const filtered = (input.severity === "errors" ? normalized.filter(isErrorRuntimeEvent) : normalized)
        .slice(0, input.limit);

      return boundedOutput(
        {
          op: input.op,
          authenticated: true,
          items: filtered,
          count: filtered.length,
        },
        {
          maxBytes: VERCEL_READ_LIMITS.maxBytes,
          items: filtered.length,
          source: `vercel:runtime-events/${deploymentId.slice(0, 80)}`,
        }
      );
    },
  };
}
