-- =============================================================================
-- Performance indexes for high-concurrency read paths.
--
-- STATUS: NOT APPLIED. Review, then run against STAGING first, then production.
-- These are ADD-ONLY (CREATE INDEX ... IF NOT EXISTS). They do NOT alter any
-- table, column, or data. `CONCURRENTLY` builds without locking writes.
--
-- IMPORTANT: `CREATE INDEX CONCURRENTLY` cannot run inside a transaction block.
-- Run each statement individually (Supabase SQL editor runs them one-by-one),
-- NOT wrapped in BEGIN/COMMIT and NOT via `prisma migrate` (which wraps in a tx).
--
-- After applying, mirror these in prisma/schema.prisma so the schema stays in
-- sync (see the @@index notes at the bottom), then `prisma generate` — WITHOUT
-- running migrate/db push against prod.
-- =============================================================================

-- 1. All-time / weekly league: User WHERE role='MURID' AND xp>0 ORDER BY xp DESC
--    Existing @@index([xp]) forces a filter-after-scan on role. A composite lets
--    Postgres seek role then read xp in order.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_user_role_xp"
  ON "User" ("role", "xp" DESC);

-- 2. Daily league: GameResult grouped by userId for createdAt >= today,
--    SUM(xpEarned) ORDER BY sum DESC. A createdAt-leading composite that also
--    carries userId + xpEarned lets the aggregation stay close to index-only.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_gameresult_created_user_xp"
  ON "GameResult" ("createdAt", "userId", "xpEarned");

-- 3. Monitoring dashboard: AIUsage counts/aggregations windowed purely by time
--    (last 1/5/15 min). All existing AIUsage indexes lead with feature/provider/
--    status, so a time-only window can't use them efficiently.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_aiusage_createdat"
  ON "AIUsage" ("createdAt");

-- 4. Monitoring "active users": User COUNT WHERE lastActiveAt >= now()-N.
--    @@index([role, lastActiveAt]) can't serve a range on lastActiveAt alone.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_user_lastactiveat"
  ON "User" ("lastActiveAt");

-- =============================================================================
-- Corresponding prisma/schema.prisma @@index lines to add AFTER applying
-- (keeps Prisma's model in sync; adding @@index in schema is metadata only):
--
--   model User {
--     @@index([role, xp])
--     @@index([lastActiveAt])
--   }
--   model GameResult {
--     @@index([createdAt, userId, xpEarned])
--   }
--   model AIUsage {
--     @@index([createdAt])
--   }
--
-- Already well-covered, NO change needed:
--   - AiSavedResult (AI history): @@index([userId, agentId, createdAt]) + [userId, createdAt]
--   - ProgresKompetensi (simulation results): @@unique([userId, paketId, attemptNumber])
--   - GameResult game leaderboard: @@index([rank, createdAt]), [userId, createdAt]
--   - AIJob queue: @@index([status, createdAt])
-- =============================================================================
