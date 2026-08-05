-- Tabel langganan Web Push. Jalankan MANUAL di SQL Editor Supabase (pola yang
-- sama seperti perubahan schema sebelumnya di proyek ini).
--
-- Aman diulang: semuanya IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS "PushSubscription" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL,
  "endpoint"  TEXT NOT NULL,
  "p256dh"    TEXT NOT NULL,
  "auth"      TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastOkAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushSubscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Endpoint adalah identitas perangkat: browser mengembalikan endpoint yang sama
-- untuk perangkat yang sama, jadi ini yang mencegah baris ganda saat murid
-- membuka ulang aplikasi.
CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key"
  ON "PushSubscription"("endpoint");

CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx"
  ON "PushSubscription"("userId");

-- RLS diaktifkan di semua tabel public (lihat catatan RLS proyek ini). Aplikasi
-- memakai Prisma dengan koneksi langsung sehingga mem-bypass RLS; kebijakan ini
-- yang menutup akses lewat PostgREST/anon key.
ALTER TABLE "PushSubscription" ENABLE ROW LEVEL SECURITY;
