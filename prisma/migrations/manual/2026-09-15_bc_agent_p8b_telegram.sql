-- BC AGENT P8B — Telegram remote control (additive only; staging-safe).
-- Design: docs/BC_AGENT_P8A_TELEGRAM_ARCHITECTURE_THREAT_MODEL.md §27.
-- Applied ONLY to local staging in P8B. Production migration is a founder
-- decision, NOT part of this phase.
--
-- Contains zero destructive statements: CREATE TABLE IF NOT EXISTS +
-- CREATE INDEX IF NOT EXISTS. No ALTER on existing tables, no DROP, no
-- DELETE. Existing agent tables and data are untouched.

CREATE TABLE IF NOT EXISTS "AgentTelegramBinding" (
  "id"              TEXT PRIMARY KEY,
  "telegramUserId"  TEXT NOT NULL,
  "telegramChatId"  TEXT NOT NULL,
  "userId"          TEXT NOT NULL,
  "label"           TEXT,
  "boundBy"         TEXT NOT NULL,
  "boundAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt"      TIMESTAMP(3),
  "revokedAt"       TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgentTelegramBinding_telegramUserId_key"
  ON "AgentTelegramBinding"("telegramUserId");
CREATE INDEX IF NOT EXISTS "AgentTelegramBinding_userId_idx"
  ON "AgentTelegramBinding"("userId");

CREATE TABLE IF NOT EXISTS "AgentCommandDedupe" (
  "id"               TEXT PRIMARY KEY,
  "dedupeKey"        TEXT NOT NULL,
  "command"          TEXT NOT NULL,
  "telegramUpdateId" BIGINT,
  "resultCode"       TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgentCommandDedupe_dedupeKey_key"
  ON "AgentCommandDedupe"("dedupeKey");
CREATE INDEX IF NOT EXISTS "AgentCommandDedupe_createdAt_idx"
  ON "AgentCommandDedupe"("createdAt");
