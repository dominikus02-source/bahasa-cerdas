-- Nonaktifkan barang toko yang tidak punya implementasi sama sekali, supaya
-- murid tidak lagi membelanjakan koin untuk sesuatu yang tidak memberi apa pun.
--
-- Dinonaktifkan (isActive = false), BUKAN dihapus: riwayat pembelian murid yang
-- terlanjur membeli tetap utuh, dan barangnya tinggal dinyalakan lagi begitu
-- implementasinya siap.
--
--   EXTRA_TRYOUT  - `attemptLimit` ada di skema tapi tidak pernah ditegakkan di
--                   kode mana pun, dan semua paket di-seed -1 (tanpa batas).
--                   Menjual "tryout tambahan" untuk sesuatu yang sudah tak
--                   terbatas tidak berarti apa-apa. Perlu keputusan produk:
--                   membatasi tryout dulu.
--   THEME         - Mode gelap sungguhan berarti mengaudit ~789 warna hardcoded
--                   (`bg-white` dsb.); kelas `dark:` baru dipakai 3 kali di
--                   seluruh proyek.
--   STICKER       - Tidak ada sistem stiker pada komentar murid. Yang ada hanya
--                   penyisip teks di panel chat guru, tidak berhubungan.
UPDATE "StoreItem"
SET "isActive" = false
WHERE "type" IN ('EXTRA_TRYOUT', 'THEME', 'STICKER');
