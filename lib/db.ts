import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const baseUrl = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
  if (!baseUrl) return new PrismaClient();

  // Connection pool tuned for 200 concurrent users
  // connection_limit=25 allows 25 concurrent queries
  // pool_timeout=15s waits up to 15s for a connection before error
  const url = baseUrl.includes("?")
    ? `${baseUrl}&connection_limit=25&pool_timeout=15&statement_cache_size=100`
    : `${baseUrl}?connection_limit=25&pool_timeout=15&statement_cache_size=100`;

  return new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Retry wrapper for DB operations under load
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      const isConn = err?.message?.includes("connect") || err?.message?.includes("timeout") || err?.code === "P2024"
      if (attempt < maxRetries && isConn) {
        await new Promise(r => setTimeout(r, 200 * (attempt + 1)))
        continue
      }
      throw err
    }
  }
  throw new Error("Max retries exceeded")
}
