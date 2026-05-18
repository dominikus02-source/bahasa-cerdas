-- Add SD to Tingkat enum
ALTER TYPE "Tingkat" ADD VALUE 'SD';

-- Add SD types to KompetensiType enum
ALTER TYPE "KompetensiType" ADD VALUE 'UKBI_SD';
ALTER TYPE "KompetensiType" ADD VALUE 'UKBI_LATIHAN_SD';
ALTER TYPE "KompetensiType" ADD VALUE 'TKA_SD';
