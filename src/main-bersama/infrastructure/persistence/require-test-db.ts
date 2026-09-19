/**
 * Side-effect module: WAJIB di-import PERTAMA oleh script QA yang
 * bermutasi database (sebelum import apa pun yang menyentuh lib/db).
 *
 * Alasan: ESM mengevaluasi semua import (termasuk lib/db yang membuat
 * PrismaClient saat module evaluation) SEBELUM body script jalan.
 * Menimpa process.env.DATABASE_URL di body script terlambat. Module ini
 * menimpanya saat module evaluation-nya sendiri, yang berjalan lebih
 * awal dari lib/db asalkan di-import paling atas.
 *
 * Guard (spec review Tahap 4 §3):
 * - Wajib TEST_DATABASE_URL eksplisit — TIDAK ADA fallback ke DATABASE_URL.
 * - assertTestDatabaseUrl() hanya menerima postgresql:// di host lokal
 *   dengan DB khusus "mbtest"; selain itu ABORT sebelum satu pun
 *   query mutation dijalankan.
 */

import { assertTestDatabaseUrl } from './test-db-guard';

const validated = assertTestDatabaseUrl(process.env.TEST_DATABASE_URL);
process.env.DATABASE_URL = validated;
