-- Pengumuman pin: kolom pinned untuk menyematkan pengumuman di papan kelas.
-- Idempoten — aman dijalankan berulang.
ALTER TABLE "Pengumuman" ADD COLUMN IF NOT EXISTS "pinned" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Pengumuman_groupId_pinned_idx" ON "Pengumuman"("groupId", "pinned");
