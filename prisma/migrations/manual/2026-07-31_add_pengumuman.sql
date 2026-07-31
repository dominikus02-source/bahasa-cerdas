-- Papan Pengumuman (one-way notice board, Google Classroom style).
-- Guru memposting pengumuman/tugas ke kelas (judul, deskripsi, tenggat,
-- lampiran PDF/DOCX), murid mengumpulkan tautan karya sebagai hasil.
-- Run this in the Supabase SQL Editor.

-- CreateTable
CREATE TABLE "Pengumuman" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT,
    "tenggat" TIMESTAMP(3),
    "lampiran" TEXT,
    "lampiranNama" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pengumuman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PengumumanSubmission" (
    "id" TEXT NOT NULL,
    "pengumumanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "karyaUrl" TEXT NOT NULL,
    "catatan" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PengumumanSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PengumumanSubmission_pengumumanId_userId_key" ON "PengumumanSubmission"("pengumumanId", "userId");

-- CreateIndex
CREATE INDEX "PengumumanSubmission_userId_idx" ON "PengumumanSubmission"("userId");

-- CreateIndex
CREATE INDEX "PengumumanSubmission_pengumumanId_idx" ON "PengumumanSubmission"("pengumumanId");

-- CreateIndex
CREATE INDEX "Pengumuman_groupId_idx" ON "Pengumuman"("groupId");

-- CreateIndex
CREATE INDEX "Pengumuman_teacherId_idx" ON "Pengumuman"("teacherId");

-- AddForeignKey
ALTER TABLE "Pengumuman" ADD CONSTRAINT "Pengumuman_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengumuman" ADD CONSTRAINT "Pengumuman_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengumumanSubmission" ADD CONSTRAINT "PengumumanSubmission_pengumumanId_fkey" FOREIGN KEY ("pengumumanId") REFERENCES "Pengumuman"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengumumanSubmission" ADD CONSTRAINT "PengumumanSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS to match the rest of the public schema (app access goes through
-- Prisma with the service role, which bypasses RLS — see rls-public-tables memory).
ALTER TABLE "Pengumuman" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PengumumanSubmission" ENABLE ROW LEVEL SECURITY;
