-- ============================================================
-- Migration: Add attendanceNumber to GroupMember
-- Date: 2026-08-27
-- Purpose: Per-class attendance number (nomor absen per kelas)
--
-- BEFORE: Profile.noAbsen is global — one number for all classes
-- AFTER:  GroupMember.attendanceNumber is per-enrollment
--
-- Safety: nullable, no data loss, no destructive changes
-- ============================================================

ALTER TABLE "GroupMember"
  ADD COLUMN IF NOT EXISTS "attendanceNumber" TEXT;

-- No backfill: existing GroupMember records get NULL (shown as "—")
-- Profile.noAbsen is preserved for backward compatibility
