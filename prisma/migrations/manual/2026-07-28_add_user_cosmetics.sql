-- Kosmetik yang sedang dipakai murid. Nilainya = kolom `icon` pada StoreItem
-- yang bersangkutan (mis. 'frame-gold', 'color-purple'), NULL = tidak memakai.
-- Aditif dan nullable, jadi aman dijalankan pada tabel yang sudah berisi data.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "equippedFrame" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "equippedNameColor" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "equippedBadge" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "equippedEffect" TEXT;

-- Heart Refill dihapus dari toko: tidak ada sistem nyawa persisten di aplikasi,
-- jadi barang ini tidak pernah bisa memberi apa pun. Dinonaktifkan, bukan
-- dihapus, supaya riwayat pembelian murid yang terlanjur beli tetap utuh.
UPDATE "StoreItem" SET "isActive" = false WHERE "type" = 'HEART_REFILL';
