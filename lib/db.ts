import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Builds a Prisma connection string tuned for the connection topology.
//
// Serverless (Vercel) MUST go through the Supabase transaction pooler
// (Supavisor/PgBouncer, port 6543). Two rules matter there:
//   1. `pgbouncer=true` — tells Prisma to disable prepared statements. Without
//      it, transaction pooling reuses server connections and Prisma hits
//      'prepared statement "s0" already exists' errors under concurrency.
//   2. Low `connection_limit` PER INSTANCE — each Fluid/serverless instance keeps
//      its own pool; with many instances a high limit exhausts the pooler. 1–5 is
//      the recommended range behind a transaction pooler.
// Note: `statement_cache_size` is a node-postgres option ignored by Prisma — it
// was dead config, so it is dropped here.
function buildConnectionUrl(baseUrl: string): string {
  const usingPooler =
    !!process.env.DATABASE_URL_POOLED ||
    baseUrl.includes(":6543") ||
    baseUrl.includes("pooler.supabase") ||
    baseUrl.includes("pgbouncer=true");

  const u = new URL(baseUrl);
  if (usingPooler) {
    if (!u.searchParams.has("pgbouncer")) u.searchParams.set("pgbouncer", "true");
    if (!u.searchParams.has("connection_limit"))
      u.searchParams.set("connection_limit", process.env.DB_CONNECTION_LIMIT || "5");
    if (!u.searchParams.has("pool_timeout"))
      u.searchParams.set("pool_timeout", process.env.DB_POOL_TIMEOUT || "20");
  } else {
    // Direct connection (local dev / migrations) — a small pool is plenty.
    if (!u.searchParams.has("connection_limit"))
      u.searchParams.set("connection_limit", process.env.DB_CONNECTION_LIMIT || "10");
    if (!u.searchParams.has("pool_timeout"))
      u.searchParams.set("pool_timeout", process.env.DB_POOL_TIMEOUT || "15");
  }
  return u.toString();
}

function createPrismaClient() {
  const baseUrl = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
  if (!baseUrl) return new PrismaClient();

  return new PrismaClient({
    datasources: { db: { url: buildConnectionUrl(baseUrl) } },
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
