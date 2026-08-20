// Shared staging DB helpers for load-test tooling (read-only by default).
import { PrismaClient } from "@prisma/client"

export type StagingEnv = Record<string, string | undefined>

// Direct DB URL: pakai STAGING_DIRECT_URL apa adanya (port 5432, format
// pooler `postgres.<ref>@aws-*-pooler.supabase.com:5432`). Catatan AKTIF dari
// AGENTS.md (Phase PRO PLAN): host `db.<ref>.supabase.co` TIDAK resolve DNS —
// direct connection yang benar adalah pooler di port 5432. JANGAN rebuild ke
// `db.<ref>.supabase.co`.
export function buildDirectUrl(poolerUrl: string): string {
  return poolerUrl || ""
}

export function stagingDb(env: StagingEnv): PrismaClient {
  const directUrl = (env.STAGING_DIRECT_URL || env.STAGING_DATABASE_URL || "").trim()
  return new PrismaClient({ datasources: { db: { url: directUrl } } })
}