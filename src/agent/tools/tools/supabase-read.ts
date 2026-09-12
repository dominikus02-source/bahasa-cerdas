/**
 * BC Agent P4 — supabase.read: read-only database inspection (§15).
 *
 * Mechanism FACT: the repository has NO read-only database role (P0
 * finding, still true). This tool therefore does NOT fake the guarantee —
 * it achieves read-safety architecturally:
 *
 * 1. It runs ONLY a fixed allowlist of metadata queries (table row counts,
 *   column listings, migration list) and `SELECT *` on an explicit
 *   allowlist of agent-owned tables — arbitrary SQL is impossible because
 *   there is no SQL input field.
 * 2. Every query runs inside a READ ONLY transaction
 *   (`SET TRANSACTION READ ONLY`) — PostgreSQL rejects any mutation at the
 *   engine level even if code above it changed.
 * 3. `statement_timeout` bounds every query (§17).
 * 4. Row limits are applied in SQL (LIMIT) — never unbounded.
 * 5. The Prisma client instance is injected; the tool never reads env vars
 *   or connection strings, and NEVER returns credentials.
 *
 * What it intentionally does NOT expose: arbitrary table contents (only
 * the agent's own tables), user PII columns, or schema-privileged metadata.
 */

import { z } from "zod";
import { defineTool } from "../../core/tool";
import type { PrismaClient } from "@prisma/client";
import type { ToolContext, ToolDefinition } from "../../core/tool";
import type { ToolOutputEnvelope } from "../types";
import { boundedOutput } from "./shared";

export const SUPABASE_READ_NAME = "supabase.read";

export const SUPABASE_READ_LIMITS = {
  maxRows: 50,
  timeoutMs: 10_000,
  /** Tables whose contents the agent may inspect (its own domain only). */
  allowedTables: ["AgentTask", "TaskAttempt", "TaskEvent", "AgentApproval", "ToolExecution", "ToolEvidence"] as const,
} as const;

export const supabaseReadInputSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("tables"), schema: z.string().max(63).default("public") }),
  z.object({ op: z.literal("columns"), table: z.string().min(1).max(63) }),
  z.object({
    op: z.literal("rows"),
    table: z.enum(SUPABASE_READ_LIMITS.allowedTables),
    limit: z.number().int().min(1).max(SUPABASE_READ_LIMITS.maxRows).default(20),
  }),
  z.object({ op: z.literal("migrations") }),
]);

export const supabaseReadOutputSchema = z.object({
  data: z.object({
    op: z.string(),
    readOnlyTransaction: z.literal(true),
    items: z.array(z.record(z.unknown())),
    count: z.number().int().nonnegative(),
  }),
  bytes: z.number().int().nonnegative(),
  maxBytes: z.number().int().positive(),
  items: z.number().int().nonnegative(),
  truncated: z.boolean(),
  source: z.string(),
});

export type SupabaseReadInput = z.infer<typeof supabaseReadInputSchema>;
export type SupabaseReadOutput = z.infer<typeof supabaseReadOutputSchema>["data"];

/** Identifier guard — allows only plain SQL identifiers (no quoting tricks). */
function safeIdentifier(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`supabase.read: unsafe identifier "${name.slice(0, 60)}"`);
  }
  return name;
}

export function makeSupabaseReadTool(deps: { prisma: PrismaClient }): ToolDefinition & {
  input: typeof supabaseReadInputSchema;
  output: typeof supabaseReadOutputSchema;
  run: (input: SupabaseReadInput, ctx: ToolContext) => Promise<ToolOutputEnvelope<SupabaseReadOutput>>;
} {
  return {
    ...defineTool({
      name: SUPABASE_READ_NAME,
      description:
        "Read-only database inspection: table/column metadata, row counts, agent-table samples, migration list. Runs in a READ ONLY transaction with statement timeout; no mutation path exists.",
      risk: "READ",
      reversible: true,
      requiresApproval: false,
      autonomyLevel: "L0",
      inputSchema: "bc.supabase.read.input@1",
      outputSchema: "bc.supabase.read.output@1",
      timeoutMs: SUPABASE_READ_LIMITS.timeoutMs,
      productionImpact: "NONE",
      category: "OBSERVE",
      idempotent: false,
    }),
    input: supabaseReadInputSchema,
    output: supabaseReadOutputSchema,
    async run(input, ctx): Promise<ToolOutputEnvelope<SupabaseReadOutput>> {
      // Everything below runs in one READ ONLY transaction with a statement
      // timeout — the engine rejects mutations regardless of caller intent.
      const rows = await deps.prisma.$transaction(
        async (tx) => {
          await tx.$executeRawUnsafe(`SET LOCAL statement_timeout = ${SUPABASE_READ_LIMITS.timeoutMs}`);
          await tx.$executeRawUnsafe("SET LOCAL TRANSACTION READ ONLY");

          switch (input.op) {
            case "tables": {
              const schema = safeIdentifier(input.schema);
              return tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
                `SELECT c.relname AS "table",
                        c.reltuples::bigint AS "estimatedRows",
                        pg_size_pretty(pg_total_relation_size(c.oid)) AS "totalSize"
                 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                 WHERE n.nspname = '${schema}' AND c.relkind = 'r'
                 ORDER BY pg_total_relation_size(c.oid) DESC LIMIT 100`
              );
            }
            case "columns": {
              const table = safeIdentifier(input.table);
              return tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
                `SELECT column_name AS "column", data_type AS "type", is_nullable AS "nullable"
                 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = '${table}'
                 ORDER BY ordinal_position LIMIT 100`
              );
            }
            case "rows": {
              const table = safeIdentifier(input.table);
              return tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
                `SELECT * FROM "${table}" ORDER BY "createdAt" DESC LIMIT ${input.limit}`
              );
            }
            case "migrations": {
              return tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
                `SELECT migration_name AS "migration", finished_at AS "appliedAt"
                 FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 50`
              );
            }
          }
        },
        { timeout: SUPABASE_READ_LIMITS.timeoutMs + 5_000 }
      );

      const items = (rows ?? []) as Array<Record<string, unknown>>;
      // JSON-safety + redaction pass: Prisma raw queries surface BigInt for
      // Postgres bigint columns (counts/sizes) — convert before the output
      // envelope serializes; secret-named values are redacted (defense in
      // depth for sampled rows).
      const safe = items.map((r) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r)) {
          if (/(token|key|secret|password|authorization)/i.test(k)) {
            out[k] = "[redacted]";
          } else if (typeof v === "bigint") {
            out[k] = Number(v);
          } else {
            out[k] = v;
          }
        }
        return out;
      });

      const source = `supabase:${input.op}`;
      return boundedOutput(
        { op: input.op, readOnlyTransaction: true as const, items: safe, count: safe.length },
        { maxBytes: 256 * 1024, items: safe.length, source }
      );
    },
  };
}
