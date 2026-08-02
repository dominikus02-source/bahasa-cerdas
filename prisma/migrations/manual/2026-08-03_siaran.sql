-- Siaran platform — pengumuman dari founder/admin ke SELURUH murid.
--
-- Jalankan di: Supabase SQL Editor. Idempoten, aman dijalankan ulang.
--
-- Berbeda dari tabel `Pengumuman` yang sudah ada: itu papan TUGAS per kelas
-- (butuh groupId, murid mengumpulkan karyaUrl). Siaran tidak terikat kelas dan
-- tidak dikumpulkan — dipakai untuk kabar sistem, mis. "XP mingguan direset
-- tiap Senin" atau banner acara.

DO $$ BEGIN
  CREATE TYPE "SiaranKategori" AS ENUM ('INFO', 'PEMBARUAN', 'ACARA', 'PENTING');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Siaran" (
    "id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "kategori" "SiaranKategori" NOT NULL DEFAULT 'INFO',
    "gambar" TEXT,
    "tautan" TEXT,
    "tautanLabel" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "mulai" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sampai" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Siaran_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Siaran_aktif_mulai_idx" ON "Siaran"("aktif", "mulai");
CREATE INDEX IF NOT EXISTS "Siaran_authorId_idx" ON "Siaran"("authorId");

DO $$ BEGIN
  ALTER TABLE "Siaran"
    ADD CONSTRAINT "Siaran_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- RLS mengikuti konvensi seluruh schema public (lihat
-- 2026-07-17_enable_rls_public.sql). Aplikasi lewat Prisma role postgres
-- (BYPASSRLS), jadi tidak terpengaruh.
ALTER TABLE "Siaran" ENABLE ROW LEVEL SECURITY;

-- Verifikasi (opsional):
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND tablename = 'Siaran';
