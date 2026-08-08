-- P1-C Phase 1 — Canonical School Identity foundation (additive-only).
--
-- Jalankan di: Supabase SQL Editor (PRODUCTION dulu, lalu PREVIEW).
-- Idempoten: aman dijalankan ulang (IF NOT EXISTS / DO $$ EXCEPTION guard).
--
-- Prinsip:
--   * ADDITIVE ONLY — tidak menghapus/mengubah kolom `Profile.school`.
--   * Semua baris Profile yang ada tetap schoolId = NULL (TANPA backfill).
--   * Tidak ada auto-merge, auto-create dari DISTINCT Profile.school, atau
--     koreksi data massal. School dibuat hanya lewat proses eksplisit.
--   * schoolId TIDAK dipakai untuk authorization.

-- CreateTable: School
CREATE TABLE IF NOT EXISTS "School" (
    "id" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "province" TEXT,
    "city" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: School
CREATE INDEX IF NOT EXISTS "School_normalizedName_idx" ON "School"("normalizedName");
CREATE INDEX IF NOT EXISTS "School_city_idx" ON "School"("city");
CREATE INDEX IF NOT EXISTS "School_province_idx" ON "School"("province");

-- CreateTable: SchoolAlias
CREATE TABLE IF NOT EXISTS "SchoolAlias" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: SchoolAlias — satu alias normalisasi TIDAK boleh menunjuk ke
-- >1 sekolah (aturan §6.2). UNIQUE index menegakkannya di level DB.
CREATE UNIQUE INDEX IF NOT EXISTS "SchoolAlias_normalizedAlias_key" ON "SchoolAlias"("normalizedAlias");
CREATE INDEX IF NOT EXISTS "SchoolAlias_schoolId_idx" ON "SchoolAlias"("schoolId");

-- AddForeignKey: SchoolAlias.schoolId -> School.id
DO $$ BEGIN
  ALTER TABLE "SchoolAlias"
    ADD CONSTRAINT "SchoolAlias_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddColumn: Profile.schoolId (nullable — TANPA backfill)
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;

-- AddForeignKey: Profile.schoolId -> School.id (SetNull — hapus School tidak
-- pernah menghancurkan Profile; nilai legacy `school` tetap utuh)
DO $$ BEGIN
  ALTER TABLE "Profile"
    ADD CONSTRAINT "Profile_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateIndex: Profile.schoolId (agregasi masa depan GROUP BY schoolId)
CREATE INDEX IF NOT EXISTS "Profile_schoolId_idx" ON "Profile"("schoolId");

-- Verifikasi (opsional, aman diulang):
--   SELECT COUNT(*) FROM "Profile" WHERE "schoolId" IS NOT NULL;  -- harus 0
--   SELECT COUNT(*) FROM "School";                                 -- 0 (belum ada data)
--   SELECT COUNT(*) FROM "SchoolAlias";                            -- 0
