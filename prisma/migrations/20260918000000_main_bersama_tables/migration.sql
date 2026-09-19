-- =============================================================================
-- Main Bersama — persistence tables (Tahap 4) — MIGRATION AUTHORITATIVE
-- ADD-ONLY: membuat tabel & enum baru. Tidak ada DROP/ALTER pada tabel existing.
-- Tervalidasi: paritas SQL identik dengan `prisma migrate diff --from-empty`
-- terhadap schema.prisma; dikenali Prisma (`migrate resolve --applied` →
-- `_prisma_migrations`); 9 tabel Main* terverifikasi di DB test lokal.
--
-- WORKFLOW DEPLOYMENT STAGING/PRODUCTION (KEPUTUSAN TERKUNCI):
-- JANGAN gunakan `npm run db:migrate` / `prisma migrate deploy` untuk
-- migration ini. Alasan: folder legacy `prisma/migrations/manual/`
-- terdeteksi Prisma sebagai migration pending (technical-debt repo
-- terpisah, di luar scope Main Bersama) sehingga `migrate deploy`
-- belum aman untuk repo ini sampai migration hygiene dibereskan.
--
-- Prosedur aman (workflow existing BahasaCerdas):
--   1. migration.sql ini  → review
--   2. apply via Supabase SQL Editor / mekanisme SQL deployment repo
--   3. verifikasi tabel & constraint (9 tabel Main*, enum, unique, index)
--   4. `npx prisma migrate resolve --applied 20260918000000_main_bersama_tables`
--      (mencatat di _prisma_migrations tanpa mengeksekusi SQL)
--
-- CATATAN BASELINE: skema dasar repo (90+ tabel) dibuat out-of-band
-- (psql / db push, AGENTS.md Phase 8C) dan tidak ada di migration
-- history — selalu apply ke DB yang sudah ber-baseline.
-- =============================================================================

-- ── Enums ────────────────────────────────────────────────────────────────────
CREATE TYPE "MainGameMode" AS ENUM ('JELAJAH_KATA', 'KOTA_CAHAYA');
CREATE TYPE "MainSessionPhase" AS ENUM ('PREPARING', 'LOBBY', 'QUESTION', 'CLOSED', 'DISCUSSION', 'PAUSED', 'SUMMARY', 'ENDED');
CREATE TYPE "MainGameStateStatus" AS ENUM ('ACTIVE', 'FINAL');
CREATE TYPE "MainRoundStatus" AS ENUM ('PENDING', 'OPEN', 'REVIEW', 'CLOSED');

-- ── MainSession ──────────────────────────────────────────────────────────────
CREATE TABLE "MainSession" (
    "id" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT,
    "className" TEXT,
    "gameMode" "MainGameMode" NOT NULL,
    "phase" "MainSessionPhase" NOT NULL DEFAULT 'PREPARING',
    "currentRoundIndex" INTEGER,
    "totalRounds" INTEGER NOT NULL,
    "kotaTargetCorrect" INTEGER,
    "pausedFromPhase" "MainSessionPhase",
    "pausedRemainingMs" INTEGER,
    "pausedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MainSession_pkey" PRIMARY KEY ("id")
);

-- ── MainPlayer ───────────────────────────────────────────────────────────────
CREATE TABLE "MainPlayer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT NOT NULL,
    "teamId" TEXT,
    "eligibleFromRoundIndex" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connected" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MainPlayer_pkey" PRIMARY KEY ("id")
);

-- ── MainQuestionSnapshot ─────────────────────────────────────────────────────
CREATE TABLE "MainQuestionSnapshot" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "sourceQuestionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctOptionId" TEXT NOT NULL,
    "explanation" TEXT,
    "passageTitle" TEXT,
    "passageContent" TEXT,

    CONSTRAINT "MainQuestionSnapshot_pkey" PRIMARY KEY ("id")
);

-- ── MainRound ────────────────────────────────────────────────────────────────
CREATE TABLE "MainRound" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionSnapshotId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "status" "MainRoundStatus" NOT NULL DEFAULT 'PENDING',
    "openedAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "MainRound_pkey" PRIMARY KEY ("id")
);

-- ── MainRoundEligiblePlayer ──────────────────────────────────────────────────
CREATE TABLE "MainRoundEligiblePlayer" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT,

    CONSTRAINT "MainRoundEligiblePlayer_pkey" PRIMARY KEY ("id")
);

-- ── MainAnswer ───────────────────────────────────────────────────────────────
CREATE TABLE "MainAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "selectedOptionId" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MainAnswer_pkey" PRIMARY KEY ("id")
);

-- ── MainAnswerSubmission (request idempotency ledger) ────────────────────────
CREATE TABLE "MainAnswerSubmission" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "selectedOptionId" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MainAnswerSubmission_pkey" PRIMARY KEY ("id")
);

-- ── MainGameState ────────────────────────────────────────────────────────────
CREATE TABLE "MainGameState" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "gameMode" "MainGameMode" NOT NULL,
    "status" "MainGameStateStatus" NOT NULL DEFAULT 'ACTIVE',
    "state" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MainGameState_pkey" PRIMARY KEY ("id")
);

-- ── MainGameRoundResult ──────────────────────────────────────────────────────
CREATE TABLE "MainGameRoundResult" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "gameStateId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "gameMode" "MainGameMode" NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MainGameRoundResult_pkey" PRIMARY KEY ("id")
);

-- ── Unique constraints ───────────────────────────────────────────────────────
CREATE UNIQUE INDEX "MainSession_pin_key" ON "MainSession"("pin");
CREATE UNIQUE INDEX "MainPlayer_sessionId_userId_key" ON "MainPlayer"("sessionId", "userId");
CREATE UNIQUE INDEX "MainQuestionSnapshot_sessionId_position_key" ON "MainQuestionSnapshot"("sessionId", "position");
CREATE UNIQUE INDEX "MainRound_sessionId_index_key" ON "MainRound"("sessionId", "index");
CREATE UNIQUE INDEX "MainRoundEligiblePlayer_roundId_playerId_key" ON "MainRoundEligiblePlayer"("roundId", "playerId");
CREATE UNIQUE INDEX "MainAnswer_roundId_playerId_key" ON "MainAnswer"("roundId", "playerId");
CREATE UNIQUE INDEX "MainAnswerSubmission_submissionId_key" ON "MainAnswerSubmission"("submissionId");
CREATE UNIQUE INDEX "MainGameState_sessionId_key" ON "MainGameState"("sessionId");
CREATE UNIQUE INDEX "MainGameRoundResult_sessionId_gameMode_roundId_key" ON "MainGameRoundResult"("sessionId", "gameMode", "roundId");

-- ── Foreign keys (add-only, cascade ke bawah hirarki sesi) ──────────────────
ALTER TABLE "MainPlayer" ADD CONSTRAINT "MainPlayer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MainSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MainQuestionSnapshot" ADD CONSTRAINT "MainQuestionSnapshot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MainSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MainRound" ADD CONSTRAINT "MainRound_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MainSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MainRound" ADD CONSTRAINT "MainRound_questionSnapshotId_fkey" FOREIGN KEY ("questionSnapshotId") REFERENCES "MainQuestionSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MainRoundEligiblePlayer" ADD CONSTRAINT "MainRoundEligiblePlayer_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "MainRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MainAnswer" ADD CONSTRAINT "MainAnswer_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "MainRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MainGameState" ADD CONSTRAINT "MainGameState_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MainSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MainGameRoundResult" ADD CONSTRAINT "MainGameRoundResult_gameStateId_fkey" FOREIGN KEY ("gameStateId") REFERENCES "MainGameState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Query indexes (alasan di komentar) ───────────────────────────────────────
CREATE INDEX "MainSession_teacherId_idx" ON "MainSession"("teacherId");      -- daftar sesi milik guru
CREATE INDEX "MainSession_phase_idx" ON "MainSession"("phase");              -- cari sesi aktif (dashboard)
CREATE INDEX "MainPlayer_sessionId_idx" ON "MainPlayer"("sessionId");        -- load peserta per sesi
CREATE INDEX "MainQuestionSnapshot_sessionId_idx" ON "MainQuestionSnapshot"("sessionId"); -- load snapshot per sesi
CREATE INDEX "MainRound_sessionId_idx" ON "MainRound"("sessionId");          -- load round per sesi
CREATE INDEX "MainRoundEligiblePlayer_roundId_idx" ON "MainRoundEligiblePlayer"("roundId"); -- load eligible per round
CREATE INDEX "MainAnswer_sessionId_idx" ON "MainAnswer"("sessionId");        -- audit jawaban per sesi
CREATE INDEX "MainAnswer_playerId_idx" ON "MainAnswer"("playerId");          -- riwayat jawaban per peserta
CREATE INDEX "MainAnswerSubmission_roundId_playerId_idx" ON "MainAnswerSubmission"("roundId", "playerId"); -- lookup attempt per round+player
CREATE INDEX "MainAnswerSubmission_sessionId_idx" ON "MainAnswerSubmission"("sessionId");   -- audit attempt per sesi
CREATE INDEX "MainGameState_sessionId_idx" ON "MainGameState"("sessionId");  -- redundant dgn unique, eksplisit utk query
CREATE INDEX "MainGameRoundResult_sessionId_idx" ON "MainGameRoundResult"("sessionId");     -- rekap round per sesi
