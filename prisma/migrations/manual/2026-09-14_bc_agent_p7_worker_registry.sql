-- BC Agent P7 — durable worker registry (2026-09-14)
-- Durable worker identity + liveness (principles 12/13): worker rows are
-- written only by the owning worker process (registration idempotent upsert,
-- single-row heartbeat UPDATE). No FK to AgentTask: currentTaskId is an
-- informational pointer, and a worker row must never block task deletion.
-- Stale detection is a query; recovery never mutates foreign worker rows.

CREATE TABLE IF NOT EXISTS "AgentWorker" (
    "id"               TEXT NOT NULL,
    "status"           TEXT NOT NULL DEFAULT 'STARTING',
    "version"          TEXT,
    "hostname"         TEXT,
    "pid"              INTEGER,
    "currentTaskId"    TEXT,
    "currentAttemptId" TEXT,
    "startedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastHeartbeatAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stoppedAt"        TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentWorker_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AgentWorker_status_lastHeartbeatAt_idx"
    ON "AgentWorker"("status", "lastHeartbeatAt");
