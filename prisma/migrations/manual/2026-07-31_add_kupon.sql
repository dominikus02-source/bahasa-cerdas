-- Kupon untuk "Program Guru Cerdas": guru bayar Rp 1.000 untuk menjadi Guru Pro
-- selama 30 hari (kredit AI 500/bulan seperti Pro biasa).
-- Run this in the Supabase SQL Editor.

-- CreateTable
CREATE TABLE "Kupon" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT,
    "deskripsi" TEXT,
    "hargaFixed" INTEGER,
    "diskonPersen" INTEGER,
    "hargaMinimal" INTEGER,
    "planId" TEXT,
    "untukRole" TEXT NOT NULL DEFAULT 'GURU',
    "mulaiBerlaku" TIMESTAMP(3),
    "berakhirPada" TIMESTAMP(3),
    "batasPemakaian" INTEGER,
    "jumlahTerpakai" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "dibuatOleh" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KuponPemakaian" (
    "id" TEXT NOT NULL,
    "kuponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transaksiId" TEXT,
    "hargaAsli" INTEGER NOT NULL,
    "hargaDiskon" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KuponPemakaian_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Kupon_kode_key" ON "Kupon"("kode");

-- CreateIndex
CREATE INDEX "Kupon_kode_idx" ON "Kupon"("kode");

-- CreateIndex
CREATE INDEX "KuponPemakaian_kuponId_idx" ON "KuponPemakaian"("kuponId");

-- CreateIndex
CREATE INDEX "KuponPemakaian_userId_idx" ON "KuponPemakaian"("userId");

-- AddForeignKey
ALTER TABLE "KuponPemakaian" ADD CONSTRAINT "KuponPemakaian_kuponId_fkey" FOREIGN KEY ("kuponId") REFERENCES "Kupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KuponPemakaian" ADD CONSTRAINT "KuponPemakaian_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS to match the rest of the public schema (app access goes through
-- Prisma with the service role, which bypasses RLS — see rls-public-tables memory).
ALTER TABLE "Kupon" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KuponPemakaian" ENABLE ROW LEVEL SECURITY;

-- Seed: Program Guru Cerdas — Rp 1.000/bulan untuk semua guru.
INSERT INTO "Kupon" ("id", "kode", "nama", "deskripsi", "hargaFixed", "planId", "untukRole", "aktif", "createdAt", "updatedAt")
VALUES (
    'kupon-gurucerdas1000',
    'BCGURUCERDAS',
    'Program Guru Cerdas',
    'Bayar Rp 1.000 untuk menjadi Guru Pro selama 30 hari (kredit AI 500/bulan).',
    1000,
    'GURU_PRO_MONTHLY',
    'GURU',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("kode") DO NOTHING;
