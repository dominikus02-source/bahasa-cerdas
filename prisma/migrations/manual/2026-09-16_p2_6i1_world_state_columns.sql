-- P2.6I.1: Add world-state columns to PendekarPlayer.
-- These mirror client-side map-side state (flags, openedChests, deadBossIds,
-- equipment, quest state, pickedGe) for server-authoritative persistence.
-- All columns are nullable — existing rows default to NULL (clean slate).

ALTER TABLE "PendekarPlayer" ADD COLUMN "flags" JSONB;
ALTER TABLE "PendekarPlayer" ADD COLUMN "openedChests" JSONB;
ALTER TABLE "PendekarPlayer" ADD COLUMN "deadBossIds" JSONB;
ALTER TABLE "PendekarPlayer" ADD COLUMN "equipment" JSONB;
ALTER TABLE "PendekarPlayer" ADD COLUMN "questState" JSONB;
ALTER TABLE "PendekarPlayer" ADD COLUMN "pickedGe" JSONB;
