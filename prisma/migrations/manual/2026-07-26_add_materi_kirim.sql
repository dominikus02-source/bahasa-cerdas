-- Kirim Materi (file) ke kelas — riwayat kirim guru + sumber daftar
-- "Materi dari Guru" di sisi murid. Run this in the Supabase SQL Editor.

-- CreateTable
CREATE TABLE "MateriKirim" (
    "id" TEXT NOT NULL,
    "materiId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MateriKirim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MateriKirim_materiId_groupId_key" ON "MateriKirim"("materiId", "groupId");

-- CreateIndex
CREATE INDEX "MateriKirim_groupId_idx" ON "MateriKirim"("groupId");

-- CreateIndex
CREATE INDEX "MateriKirim_materiId_idx" ON "MateriKirim"("materiId");

-- CreateIndex
CREATE INDEX "MateriKirim_teacherId_idx" ON "MateriKirim"("teacherId");

-- AddForeignKey
ALTER TABLE "MateriKirim" ADD CONSTRAINT "MateriKirim_materiId_fkey" FOREIGN KEY ("materiId") REFERENCES "Materi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MateriKirim" ADD CONSTRAINT "MateriKirim_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MateriKirim" ADD CONSTRAINT "MateriKirim_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS to match the rest of the public schema (app access goes through
-- Prisma with the service role, which bypasses RLS — see rls-public-tables memory).
ALTER TABLE "MateriKirim" ENABLE ROW LEVEL SECURITY;
