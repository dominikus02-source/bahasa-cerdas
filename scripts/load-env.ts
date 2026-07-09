/**
 * Side-effect module: load .env / .env.local into process.env for standalone
 * `tsx script` runs. Next.js loads these automatically at runtime, but a plain
 * Node/tsx process does not. Import this FIRST — before any module that reads
 * process.env.DATABASE_URL (e.g. lib/db) — so the vars are present in time.
 *
 * No-op on Vercel / CI where DATABASE_URL is already set in the environment.
 * Only sets keys the file defines, so an existing value is never cleared.
 */
import { existsSync } from "fs"
import { resolve } from "path"

if (!process.env.DATABASE_URL) {
  for (const f of [".env", ".env.local"]) {
    const p = resolve(process.cwd(), f)
    if (existsSync(p)) {
      try {
        process.loadEnvFile(p)
      } catch {
        /* ignore malformed/partial env file */
      }
    }
  }
}
