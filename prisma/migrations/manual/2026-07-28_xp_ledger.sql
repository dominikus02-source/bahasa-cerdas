-- Jejak setiap pemberian XP.
--
-- Tanpa ini, kuota harian hanya bisa dihitung dari GameResult — sehingga
-- KataStra (yang tidak menulis jejak apa pun) lolos dari kuota, dan tidak ada
-- cara menelusuri dari mana lonjakan XP berasal kalau ada kecurangan lagi.
CREATE TABLE IF NOT EXISTS "XpLedger" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "amount"    INTEGER NOT NULL,
  "source"    TEXT NOT NULL,
  "reference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "XpLedger_pkey" PRIMARY KEY ("id")
);

-- Kuota harian menanyakan "berapa XP user X hari ini", jadi indeksnya gabungan.
CREATE INDEX IF NOT EXISTS "XpLedger_userId_createdAt_idx"
  ON "XpLedger" ("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "XpLedger_createdAt_idx"
  ON "XpLedger" ("createdAt");

-- Foreign key ditegakkan di sini (tidak seperti GameResult yang FK-nya tidak
-- pernah terbentuk di produksi) supaya baris yatim tidak mungkin muncul.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'XpLedger_userId_fkey'
  ) THEN
    ALTER TABLE "XpLedger"
      ADD CONSTRAINT "XpLedger_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- RLS: tabel public wajib mengaktifkannya (lihat catatan RLS 2026-07). Aplikasi
-- memakai Prisma dengan service role sehingga tetap bisa membaca/menulis.
ALTER TABLE "XpLedger" ENABLE ROW LEVEL SECURITY;
