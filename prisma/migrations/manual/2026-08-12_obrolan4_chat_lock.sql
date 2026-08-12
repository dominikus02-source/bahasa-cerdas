-- OBROLAN 4.0 — Class Chat Workspace (idempotent, add-only)
-- WAJIB dijalankan di Supabase SQL Editor (PRODUCTION + PREVIEW) sebelum
-- fitur moderasi guru + chat lock dipakai. Aman dijalankan berulang.
--
-- 1. Group.chatLocked — kunci obrolan oleh guru (server-enforced).
-- 2. ChatMessage.deletedAt / deletedBy — soft-delete pesan (audit tetap utuh).

ALTER TABLE "Group"
  ADD COLUMN IF NOT EXISTS "chatLocked" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ChatMessage"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;

CREATE INDEX IF NOT EXISTS "ChatMessage_groupId_deletedAt_idx" ON "ChatMessage"("groupId", "deletedAt");

-- Verifikasi:
-- SELECT "chatLocked" FROM "Group" LIMIT 1;
-- SELECT "deletedAt", "deletedBy" FROM "ChatMessage" LIMIT 1;
