-- BC Agent P2 — Persistence + Task Engine
-- Source of truth: docs/BC_AGENT_V0_1_BLUEPRINT.md, docs/BC_AGENT_P1_CORE_REPORT.md
-- Prisma models: AgentTask, TaskAttempt, TaskEvent, AgentApproval (prisma/schema.prisma)
--
-- Apply: psql "$DIRECT_URL" -f prisma/migrations/manual/2026-09-12_bc_agent_p2_persistence.sql
-- (repo convention: schema.prisma is canonical, manual SQL applied via psql because
--  `prisma db push` times out on the Supabase pooler — see AGENTS.md Phase 8C)
--
-- Design notes:
-- - Enum-ish columns are TEXT with CHECK constraints (add-only evolution;
--   matches the pure P1 core which never imports Prisma types).
-- - ids are application-generated cuids (Prisma @default(cuid())) -> TEXT PK.
-- - TaskEvent is append-only: @@unique(taskId, seq) gives idempotent,
--   gap-free audit numbering; no UPDATE/DELETE grants are ever issued.
-- - AgentApproval single-use is enforced by a partial unique index:
--   only one row per approval can be in a consumed state, and consumption
--   is a single conditional UPDATE inside the consuming transaction
--   (see src/agent/persistence/service.ts) — two concurrent consumers
--   cannot both succeed.

-- ── AgentTask ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AgentTask" (
  "id"               TEXT PRIMARY KEY,
  "instruction"      TEXT        NOT NULL,
  "intentType"       TEXT        NOT NULL,
  "channel"          TEXT        NOT NULL,
  "createdBy"        TEXT        NOT NULL,
  "status"           TEXT        NOT NULL DEFAULT 'PENDING',
  "attemptCount"     INTEGER     NOT NULL DEFAULT 0,
  "currentAttemptId" TEXT,
  "resolvedBy"       TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentTask_status_check" CHECK ("status" IN
    ('PENDING','RUNNING','WAITING_APPROVAL','WAITING_INTELLIGENCE','VERIFYING','COMPLETED','FAILED','CANCELLED')),
  CONSTRAINT "AgentTask_channel_check" CHECK ("channel" IN ('WEB','TELEGRAM'))
);

CREATE INDEX IF NOT EXISTS "AgentTask_status_createdAt_idx"  ON "AgentTask"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "AgentTask_createdBy_createdAt_idx" ON "AgentTask"("createdBy", "createdAt");

-- ── TaskAttempt ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "TaskAttempt" (
  "id"              TEXT PRIMARY KEY,
  "taskId"          TEXT        NOT NULL REFERENCES "AgentTask"("id") ON DELETE CASCADE,
  "sequence"        INTEGER     NOT NULL,
  "status"          TEXT        NOT NULL DEFAULT 'ACTIVE',
  "startedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt"      TIMESTAMP(3),
  "error"           TEXT,
  "plan"            JSONB       NOT NULL DEFAULT '[]',
  "decisions"       JSONB       NOT NULL DEFAULT '[]',
  "verification"    JSONB       NOT NULL DEFAULT '{"status":"NOT_REQUIRED"}',
  "evidenceIds"     JSONB       NOT NULL DEFAULT '[]',
  "toolExecutionIds" JSONB      NOT NULL DEFAULT '[]',
  "metadata"        JSONB       NOT NULL DEFAULT '{}',
  -- Crash-recovery primitive for P5: worker refreshes this while it works.
  "heartbeatAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskAttempt_taskId_sequence_key" UNIQUE ("taskId", "sequence"),
  CONSTRAINT "TaskAttempt_status_check" CHECK ("status" IN ('ACTIVE','COMPLETED','FAILED','CANCELLED'))
);

CREATE INDEX IF NOT EXISTS "TaskAttempt_status_heartbeatAt_idx" ON "TaskAttempt"("status", "heartbeatAt");
CREATE INDEX IF NOT EXISTS "TaskAttempt_taskId_status_idx"      ON "TaskAttempt"("taskId", "status");

-- ── TaskEvent (append-only audit log) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS "TaskEvent" (
  "id"             TEXT PRIMARY KEY,
  "taskId"         TEXT        NOT NULL REFERENCES "AgentTask"("id") ON DELETE CASCADE,
  "attemptId"      TEXT,
  "seq"            INTEGER     NOT NULL,
  "eventType"      TEXT        NOT NULL,
  "previousStatus" TEXT        NOT NULL,
  "newStatus"      TEXT        NOT NULL,
  "actor"          TEXT        NOT NULL DEFAULT 'SYSTEM',
  "metadata"       JSONB,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskEvent_taskId_seq_key" UNIQUE ("taskId", "seq")
);

CREATE INDEX IF NOT EXISTS "TaskEvent_taskId_createdAt_idx" ON "TaskEvent"("taskId", "createdAt");

-- ── AgentApproval (single-use, expiring, 4-way bound) ────────────────────
CREATE TABLE IF NOT EXISTS "AgentApproval" (
  "id"         TEXT PRIMARY KEY,
  "taskId"     TEXT        NOT NULL REFERENCES "AgentTask"("id") ON DELETE CASCADE,
  "attemptId"  TEXT        NOT NULL,
  "toolName"   TEXT        NOT NULL,
  "inputHash"  TEXT        NOT NULL,
  "status"     TEXT        NOT NULL DEFAULT 'PENDING',
  "issuedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"  TIMESTAMP(3) NOT NULL,
  "approvedBy" TEXT        NOT NULL,
  "usedAt"     TIMESTAMP(3),
  "consumedBy" TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentApproval_status_check" CHECK ("status" IN ('PENDING','CONSUMED','EXPIRED','REVOKED','REJECTED'))
);

CREATE INDEX IF NOT EXISTS "AgentApproval_taskId_status_idx"    ON "AgentApproval"("taskId", "status");
CREATE INDEX IF NOT EXISTS "AgentApproval_attemptId_idx"        ON "AgentApproval"("attemptId");
CREATE INDEX IF NOT EXISTS "AgentApproval_status_expiresAt_idx" ON "AgentApproval"("status", "expiresAt");
