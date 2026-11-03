-- Rekaman JUMPA: metadata privat saja. Tidak mengaktifkan perekaman.
CREATE TABLE "JumpaRecording" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "startedById" TEXT NOT NULL,
  "stoppedById" TEXT,
  "egressId" TEXT,
  "objectKey" TEXT,
  "status" TEXT NOT NULL DEFAULT 'STARTING',
  "errorCode" TEXT,
  "sizeBytes" BIGINT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "stoppedAt" TIMESTAMP(3),
  "readyAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JumpaRecording_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JumpaRecording_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "JumpaRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "JumpaRecording_status_check" CHECK ("status" IN ('STARTING', 'RECORDING', 'STOPPING', 'READY', 'FAILED'))
);
CREATE UNIQUE INDEX "JumpaRecording_egressId_key" ON "JumpaRecording"("egressId");
CREATE UNIQUE INDEX "JumpaRecording_objectKey_key" ON "JumpaRecording"("objectKey");
CREATE INDEX "JumpaRecording_roomId_createdAt_idx" ON "JumpaRecording"("roomId", "createdAt");
CREATE INDEX "JumpaRecording_status_createdAt_idx" ON "JumpaRecording"("status", "createdAt");
-- Hanya satu operasi rekaman aktif per ruang, termasuk saat transisi.
CREATE UNIQUE INDEX "JumpaRecording_one_active_per_room" ON "JumpaRecording"("roomId") WHERE "status" IN ('STARTING', 'RECORDING', 'STOPPING');
ALTER TABLE "JumpaRecording" ENABLE ROW LEVEL SECURITY;
-- Tidak ada kebijakan SELECT/INSERT/UPDATE/DELETE untuk klien anon/authenticated.
-- Akses hanya melalui server tepercaya setelah pemeriksaan peran Premium host.
