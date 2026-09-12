-- BC Agent P4 — Tool System + Read-Only Tools
-- Source of truth: docs/BC_AGENT_P4_TOOLS_REPORT.md, P0 blueprint §8/§10
-- Prisma models: ToolExecution, ToolEvidence (prisma/schema.prisma)
--
-- Apply: psql "$DIRECT_URL" -f prisma/migrations/manual/2026-09-12_bc_agent_p4_tools.sql
-- (repo convention: schema.prisma is canonical, manual SQL applied via psql because
--  `prisma db push` times out on the Supabase pooler — see AGENTS.md Phase 8C)
--
-- Design notes (mirrors the P2 migration's conventions):
-- - Add-only: creates two NEW tables; touches no existing table.
-- - Enum-ish columns are TEXT with CHECK constraints (the pure core never
--   imports Prisma types).
-- - ToolExecution rows are audit records INCLUDING rejections: the executor
--   records a FAILED row (with ToolErrorCode) for policy denials, approval
--   failures, and invalid input — nothing is silently dropped.
-- - outputMeta is bounded metadata only (byte counts, names, truncated
--   messages ≤200 chars) — never raw tool output, never secrets.
-- - ToolEvidence enforces the evidence boundary at the schema level: a FACT
--   row MUST carry executionId provenance (partial CHECK); the other kinds
--   MUST NOT claim tool provenance. Provenance is REAL, not just present:
--   executionId is a FOREIGN KEY to ToolExecution(id) — a FACT claiming a
--   nonexistent execution is rejected by the database (P4 audit closure).
--   ON DELETE CASCADE: deleting an execution deletes its supporting facts
--   (the ledger never outlives its provenance).

-- ── ToolExecution ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ToolExecution" (
  "id"          TEXT PRIMARY KEY,
  "taskId"      TEXT        NOT NULL REFERENCES "AgentTask"("id") ON DELETE CASCADE,
  "attemptId"   TEXT        NOT NULL REFERENCES "TaskAttempt"("id") ON DELETE CASCADE,
  "toolName"    TEXT        NOT NULL,
  "inputHash"   TEXT        NOT NULL,
  "status"      TEXT        NOT NULL DEFAULT 'RUNNING',
  "startedAt"   TIMESTAMP(3) NOT NULL,
  "finishedAt"  TIMESTAMP(3),
  "durationMs"  INTEGER,
  "errorCode"   TEXT,
  "outputMeta"  JSONB,
  "approvalId"  TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ToolExecution_status_check" CHECK ("status" IN ('RUNNING','SUCCEEDED','FAILED','CANCELLED')),
  -- A finished execution always carries its duration.
  CONSTRAINT "ToolExecution_duration_check" CHECK (
    ("status" = 'RUNNING' AND "finishedAt" IS NULL AND "durationMs" IS NULL)
    OR ("status" <> 'RUNNING' AND "finishedAt" IS NOT NULL AND "durationMs" IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS "ToolExecution_taskId_startedAt_idx" ON "ToolExecution"("taskId", "startedAt");
CREATE INDEX IF NOT EXISTS "ToolExecution_attemptId_idx"        ON "ToolExecution"("attemptId");
CREATE INDEX IF NOT EXISTS "ToolExecution_toolName_status_idx" ON "ToolExecution"("toolName", "status");

-- ── ToolEvidence (provenance ledger) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ToolEvidence" (
  "id"          TEXT PRIMARY KEY,
  "taskId"      TEXT        NOT NULL REFERENCES "AgentTask"("id") ON DELETE CASCADE,
  "attemptId"   TEXT        NOT NULL REFERENCES "TaskAttempt"("id") ON DELETE CASCADE,
  "executionId" TEXT,
  "kind"        TEXT        NOT NULL,
  "claim"       TEXT        NOT NULL,
  "source"      TEXT        NOT NULL,
  "confidence"  TEXT        NOT NULL DEFAULT 'HIGH',
  "metadata"    JSONB,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ToolEvidence_kind_check" CHECK ("kind" IN
    ('FACT','OBSERVATION','INFERENCE','RECOMMENDATION','UNKNOWN')),
  CONSTRAINT "ToolEvidence_confidence_check" CHECK ("confidence" IN ('HIGH','MEDIUM','LOW')),
  -- Evidence boundary (§9): FACT is only ever tool-supported; the other
  -- kinds never borrow tool provenance.
  CONSTRAINT "ToolEvidence_fact_provenance_check" CHECK (
    ("kind" = 'FACT' AND "executionId" IS NOT NULL AND "source" NOT IN ('agent','founder'))
    OR ("kind" <> 'FACT' AND "executionId" IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS "ToolEvidence_taskId_kind_idx" ON "ToolEvidence"("taskId", "kind");
CREATE INDEX IF NOT EXISTS "ToolEvidence_executionId_idx" ON "ToolEvidence"("executionId");

-- Provenance integrity (P4 audit closure): executionId must reference a real
-- ToolExecution row. Forged facts (fabricated executionId) are rejected at rest.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ToolEvidence_executionId_fkey'
  ) THEN
    ALTER TABLE "ToolEvidence"
      ADD CONSTRAINT "ToolEvidence_executionId_fkey"
      FOREIGN KEY ("executionId") REFERENCES "ToolExecution"("id") ON DELETE CASCADE;
  END IF;
END $$;
