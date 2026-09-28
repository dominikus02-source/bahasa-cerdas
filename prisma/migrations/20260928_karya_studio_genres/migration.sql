-- Karya Studio: perluasan jenis karya untuk pengalaman menulis terpandu.
ALTER TYPE "StudentKaryaType" ADD VALUE IF NOT EXISTS 'SYAIR';
ALTER TYPE "StudentKaryaType" ADD VALUE IF NOT EXISTS 'GURINDAM';
ALTER TYPE "StudentKaryaType" ADD VALUE IF NOT EXISTS 'SLOGAN';
ALTER TYPE "StudentKaryaType" ADD VALUE IF NOT EXISTS 'KARYA_BEBAS';
