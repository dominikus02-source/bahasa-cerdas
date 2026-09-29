/**
 * BC Agent P9 — supabase.read: read-only database + BC operational health.
 *
 * Read-safety is architectural, not a model promise:
 * - no arbitrary SQL input exists;
 * - every operation is a fixed query selected by a discriminated union;
 * - every query runs inside SET LOCAL TRANSACTION READ ONLY;
 * - statement timeout and row/response limits are enforced;
 * - raw user PII is never exposed by the BC health operations.
 *
 * Supabase transaction-pooler note (2026): SET LOCAL / SET TRANSACTION is
 * intentionally transaction-scoped so read-only state cannot contaminate a
 * pooled backend connection after this transaction finishes.
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
  maxWindowHours: 168,
  allowedTables: ["AgentTask", "TaskAttempt", "TaskEvent", "AgentApproval", "ToolExecution", "ToolEvidence"] as const,
} as const;

const windowHoursSchema = z.number().int().min(1).max(SUPABASE_READ_LIMITS.maxWindowHours).default(24);

export const supabaseReadInputSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("tables"), schema: z.string().max(63).default("public") }),
  z.object({ op: z.literal("columns"), table: z.string().min(1).max(63) }),
  z.object({
    op: z.literal("rows"),
    table: z.enum(SUPABASE_READ_LIMITS.allowedTables),
    limit: z.number().int().min(1).max(SUPABASE_READ_LIMITS.maxRows).default(20),
  }),
  z.object({ op: z.literal("migrations") }),
  z.object({ op: z.literal("bc_health"), windowHours: windowHoursSchema }),
  z.object({ op: z.literal("agent_health"), windowHours: windowHoursSchema }),
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

function safeIdentifier(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`supabase.read: unsafe identifier "${name.slice(0, 60)}"`);
  }
  return name;
}

function windowHoursOf(input: SupabaseReadInput): number {
  return "windowHours" in input ? input.windowHours : 24;
}

function jsonSafeRows(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (/(token|key|secret|password|authorization|credential)/i.test(key)) {
        out[key] = "[redacted]";
      } else if (typeof value === "bigint") {
        out[key] = Number(value);
      } else {
        out[key] = value;
      }
    }
    return out;
  });
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
        "Read-only PostgreSQL/Supabase diagnostics. Ops: tables, columns, rows(agent tables only), migrations, bc_health {windowHours}, agent_health {windowHours}. bc_health returns aggregate BC users/schools/subscriptions/Main Bersama/TKA/AI activity without user PII.",
      risk: "READ",
      reversible: true,
      requiresApproval: false,
      autonomyLevel: "L0",
      inputSchema: "bc.supabase.read.input@2",
      outputSchema: "bc.supabase.read.output@2",
      timeoutMs: SUPABASE_READ_LIMITS.timeoutMs,
      productionImpact: "NONE",
      category: "OBSERVE",
      idempotent: false,
    }),
    input: supabaseReadInputSchema,
    output: supabaseReadOutputSchema,
    async run(input, _ctx): Promise<ToolOutputEnvelope<SupabaseReadOutput>> {
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

            case "migrations":
              return tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
                `SELECT migration_name AS "migration", finished_at AS "appliedAt"
                 FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 50`
              );

            case "bc_health": {
              const hours = windowHoursOf(input);
              return tx.$queryRawUnsafe<Array<Record<string, unknown>>>(`
                WITH
                user_stats AS (
                  SELECT
                    count(*)::bigint AS total,
                    count(*) FILTER (WHERE role::text = 'GURU')::bigint AS teachers,
                    count(*) FILTER (WHERE role::text = 'MURID')::bigint AS students,
                    count(*) FILTER (WHERE "createdAt" >= now() - make_interval(hours => ${hours}))::bigint AS new_in_window,
                    count(*) FILTER (WHERE "lastActiveAt" >= now() - make_interval(hours => ${hours}))::bigint AS active_in_window
                  FROM "User"
                ),
                school_stats AS (
                  SELECT
                    count(*)::bigint AS total,
                    count(*) FILTER (WHERE "isActive" = true)::bigint AS active,
                    count(*) FILTER (WHERE "createdAt" >= now() - make_interval(hours => ${hours}))::bigint AS new_in_window
                  FROM "School"
                ),
                subscription_status AS (
                  SELECT status::text AS status, count(*)::bigint AS count
                  FROM "Subscription"
                  GROUP BY status
                ),
                main_phase AS (
                  SELECT phase::text AS phase, count(*)::bigint AS count
                  FROM "MainSession"
                  WHERE "createdAt" >= now() - make_interval(hours => ${hours})
                  GROUP BY phase
                ),
                test_status AS (
                  SELECT status::text AS status, count(*)::bigint AS count
                  FROM "TestSession"
                  WHERE "createdAt" >= now() - make_interval(hours => ${hours})
                  GROUP BY status
                ),
                ai_stats AS (
                  SELECT
                    count(*)::bigint AS total,
                    count(*) FILTER (WHERE status = 'success')::bigint AS success,
                    count(*) FILTER (WHERE status = 'error')::bigint AS errors,
                    round(avg("latencyMs"))::bigint AS avg_latency_ms,
                    round(coalesce(sum("costUSD"), 0)::numeric, 6) AS cost_usd
                  FROM "AIUsage"
                  WHERE "createdAt" >= now() - make_interval(hours => ${hours})
                ),
                product_stats AS (
                  SELECT count(*)::bigint AS total
                  FROM "ProductEvent"
                  WHERE "createdAt" >= now() - make_interval(hours => ${hours})
                )
                SELECT 'window' AS metric, jsonb_build_object('hours', ${hours}) AS value
                UNION ALL
                SELECT 'users', jsonb_build_object(
                  'total', total,
                  'teachers', teachers,
                  'students', students,
                  'new', new_in_window,
                  'active', active_in_window
                ) FROM user_stats
                UNION ALL
                SELECT 'schools', jsonb_build_object(
                  'total', total,
                  'active', active,
                  'new', new_in_window
                ) FROM school_stats
                UNION ALL
                SELECT 'subscriptions', jsonb_build_object(
                  'total', coalesce((SELECT sum(count) FROM subscription_status), 0),
                  'byStatus', coalesce((SELECT jsonb_object_agg(status, count) FROM subscription_status), '{}'::jsonb)
                )
                UNION ALL
                SELECT 'mainBersama', jsonb_build_object(
                  'total', coalesce((SELECT sum(count) FROM main_phase), 0),
                  'byPhase', coalesce((SELECT jsonb_object_agg(phase, count) FROM main_phase), '{}'::jsonb)
                )
                UNION ALL
                SELECT 'testSessions', jsonb_build_object(
                  'total', coalesce((SELECT sum(count) FROM test_status), 0),
                  'byStatus', coalesce((SELECT jsonb_object_agg(status, count) FROM test_status), '{}'::jsonb)
                )
                UNION ALL
                SELECT 'aiUsage', jsonb_build_object(
                  'total', total,
                  'success', success,
                  'errors', errors,
                  'avgLatencyMs', avg_latency_ms,
                  'costUSD', cost_usd
                ) FROM ai_stats
                UNION ALL
                SELECT 'productEvents', jsonb_build_object('total', total) FROM product_stats
              `);
            }

            case "agent_health": {
              const hours = windowHoursOf(input);
              return tx.$queryRawUnsafe<Array<Record<string, unknown>>>(`
                WITH
                task_status AS (
                  SELECT status, count(*)::bigint AS count
                  FROM "AgentTask"
                  GROUP BY status
                ),
                task_window AS (
                  SELECT
                    count(*)::bigint AS created,
                    count(*) FILTER (WHERE status = 'COMPLETED')::bigint AS completed,
                    count(*) FILTER (WHERE status = 'FAILED')::bigint AS failed
                  FROM "AgentTask"
                  WHERE "createdAt" >= now() - make_interval(hours => ${hours})
                ),
                execution_window AS (
                  SELECT
                    count(*)::bigint AS total,
                    count(*) FILTER (WHERE status = 'SUCCEEDED')::bigint AS succeeded,
                    count(*) FILTER (WHERE status = 'FAILED')::bigint AS failed
                  FROM "ToolExecution"
                  WHERE "startedAt" >= now() - make_interval(hours => ${hours})
                ),
                worker_stats AS (
                  SELECT
                    count(*)::bigint AS registered,
                    count(*) FILTER (
                      WHERE status IN ('RUNNING','DEGRADED')
                        AND "lastHeartbeatAt" >= now() - interval '5 minutes'
                    )::bigint AS online,
                    count(*) FILTER (
                      WHERE status IN ('RUNNING','DEGRADED')
                        AND "lastHeartbeatAt" < now() - interval '5 minutes'
                    )::bigint AS stale
                  FROM "AgentWorker"
                ),
                telegram_stats AS (
                  SELECT
                    count(*)::bigint AS commands,
                    count(*) FILTER (
                      WHERE "resultCode" IS NOT NULL
                        AND "resultCode" NOT IN ('OK','CREATED','ALREADY_EXISTS')
                    )::bigint AS failed
                  FROM "AgentCommandDedupe"
                  WHERE "createdAt" >= now() - make_interval(hours => ${hours})
                )
                SELECT 'window' AS metric, jsonb_build_object('hours', ${hours}) AS value
                UNION ALL
                SELECT 'tasks', jsonb_build_object(
                  'byStatus', coalesce((SELECT jsonb_object_agg(status, count) FROM task_status), '{}'::jsonb),
                  'created', created,
                  'completed', completed,
                  'failed', failed
                ) FROM task_window
                UNION ALL
                SELECT 'executions', jsonb_build_object(
                  'total', total,
                  'succeeded', succeeded,
                  'failed', failed
                ) FROM execution_window
                UNION ALL
                SELECT 'workers', jsonb_build_object(
                  'registered', registered,
                  'online', online,
                  'stale', stale
                ) FROM worker_stats
                UNION ALL
                SELECT 'telegram', jsonb_build_object(
                  'commands', commands,
                  'failed', failed
                ) FROM telegram_stats
              `);
            }
          }
        },
        { timeout: SUPABASE_READ_LIMITS.timeoutMs + 5_000 }
      );

      const safe = jsonSafeRows((rows ?? []) as Array<Record<string, unknown>>);
      return boundedOutput(
        { op: input.op, readOnlyTransaction: true as const, items: safe, count: safe.length },
        { maxBytes: 256 * 1024, items: safe.length, source: `supabase:${input.op}` }
      );
    },
  };
}
