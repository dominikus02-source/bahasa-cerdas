import type { Prisma } from "@prisma/client";

/**
 * Kunci advisory Postgres selama transaksi berjalan (dilepas otomatis saat
 * commit/rollback). Dipakai untuk menyerialkan cek-lalu-tulis yang harus
 * atomik, mis. pagar pembuatan ruang JUMPA UMUM.
 */
export async function advisoryXactLock(tx: Prisma.TransactionClient, key: number): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${key}::bigint)`;
}
