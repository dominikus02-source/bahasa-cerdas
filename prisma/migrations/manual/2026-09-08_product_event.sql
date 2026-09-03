-- ProductEvent persistence — Operational Teacher Experiment P0 #7 (additive-only).
--
-- Jalankan di: Supabase SQL Editor (ad hoc, saat P0 #7 disetujui SHELL) dengan urutan:
--   PRODUCTION dulu, lalu STAGING. JANGAN diterapkan sebelum keputusan ini.
-- Idempoten: aman dijalankan ulang (IF NOT EXISTS / EXCEPTION guard).
--
-- Tidak menyentuh tabel lama (Group, GroupMember, User, PlayerActivity, dsb.).
-- Menambah SATU tabel baru ProductEvent + index idempotensi.
--
-- Keamanan: kolom `props` (JSONB) hanya menyimpan ID/kategori aman — tidak pernah
-- password/token/payment secret/payload sensitif mentah/PII tak perlu.

-- CreateTable: ProductEvent
CREATE TABLE IF NOT EXISTS "ProductEvent" (
    "id"         TEXT NOT NULL,
    "actorId"    TEXT NOT NULL,
    "event"      TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId"   TEXT NOT NULL,
    "logicalKey" TEXT NOT NULL,
    "props"      JSONB,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id")
);

-- Idempotency: actor+event+entity+logical key unik.
CREATE UNIQUE INDEX IF NOT EXISTS "ProductEvent_actorId_event_entityType_entityId_logicalKey_key"
    ON "ProductEvent"("actorId", "event", "entityType", "entityId", "logicalKey");

-- Index pendukung.
CREATE INDEX IF NOT EXISTS "ProductEvent_actorId_event_idx" ON "ProductEvent"("actorId", "event");
CREATE INDEX IF NOT EXISTS "ProductEvent_event_createdAt_idx" ON "ProductEvent"("event", "createdAt");
CREATE INDEX IF NOT EXISTS "ProductEvent_entityType_entityId_idx" ON "ProductEvent"("entityType", "entityId");

-- AddForeignKey: ProductEvent.actorId -> User.id
DO $$ BEGIN
  ALTER TABLE "ProductEvent"
    ADD CONSTRAINT "ProductEvent_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
