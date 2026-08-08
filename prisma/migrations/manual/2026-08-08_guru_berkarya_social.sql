-- Guru Berkarya 2.1: sosial interaksi (like + komentar) untuk Artikel & Puisi guru.
-- Additive-only: hanya membuat tabel baru, TIDAK mengubah tabel existing.
-- Idempoten — aman dijalankan berulang. Jalankan di Supabase SQL Editor (PRODUCTION + PREVIEW) secara manual.

CREATE TABLE IF NOT EXISTS "ArtikelLike" (
    "id" TEXT NOT NULL,
    "artikelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArtikelLike_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ArtikelComment" (
    "id" TEXT NOT NULL,
    "artikelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArtikelComment_pkey" PRIMARY KEY ("id")
);

-- Unik: satu guru hanya bisa like satu artikel sekali (toggle).
CREATE UNIQUE INDEX IF NOT EXISTS "ArtikelLike_artikelId_userId_key" ON "ArtikelLike"("artikelId", "userId");
CREATE INDEX IF NOT EXISTS "ArtikelLike_artikelId_idx" ON "ArtikelLike"("artikelId");
CREATE INDEX IF NOT EXISTS "ArtikelLike_userId_idx" ON "ArtikelLike"("userId");

CREATE INDEX IF NOT EXISTS "ArtikelComment_artikelId_idx" ON "ArtikelComment"("artikelId");
CREATE INDEX IF NOT EXISTS "ArtikelComment_artikelId_createdAt_idx" ON "ArtikelComment"("artikelId", "createdAt");
CREATE INDEX IF NOT EXISTS "ArtikelComment_userId_idx" ON "ArtikelComment"("userId");

-- FK: dicek keberadaan kolom/constraint agar idempoten. Nama constraint diikuti konvensi Prisma.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArtikelLike_artikelId_fkey') THEN
        ALTER TABLE "ArtikelLike" ADD CONSTRAINT "ArtikelLike_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "Artikel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArtikelLike_userId_fkey') THEN
        ALTER TABLE "ArtikelLike" ADD CONSTRAINT "ArtikelLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArtikelComment_artikelId_fkey') THEN
        ALTER TABLE "ArtikelComment" ADD CONSTRAINT "ArtikelComment_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "Artikel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArtikelComment_userId_fkey') THEN
        ALTER TABLE "ArtikelComment" ADD CONSTRAINT "ArtikelComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Verifikasi (harus mengembalikan 0 kolom untuk kedua tabel baru).
-- SELECT column_name FROM information_schema.columns WHERE table_name IN ('ArtikelLike','ArtikelComment');
