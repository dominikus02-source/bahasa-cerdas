/**
 * PrismaClient untuk script CLI (seed / validator / audit).
 *
 * Dua hal yang tidak ditangani `new PrismaClient()` polos:
 *
 * 1. Kredensial ada di `.env.local`, dan berkas itu tidak dibaca otomatis oleh
 *    Prisma maupun tsx.
 * 2. DATABASE_URL menunjuk ke Supabase transaction pooler (port 6543). Tanpa
 *    `pgbouncer=true`, Prisma memakai prepared statement dan langsung kena
 *    'prepared statement "s0" already exists' (PostgresError 42P05) karena
 *    pooler memakai ulang koneksi server.
 *
 * Aturannya sama dengan yang dipakai runtime di `lib/db.ts`.
 */

import fs from "node:fs"
import path from "node:path"
import { PrismaClient } from "@prisma/client"

/**
 * Muat `.env.local` ke process.env untuk key yang belum terisi.
 *
 * Dipanggil sebagai EFEK SAMPING saat modul ini diimpor, bukan hanya di dalam
 * createScriptPrisma(). Alasannya: script yang mengimpor kode runtime (mis.
 * lib/arena-junior/kurikulum.ts) ikut menarik `lib/db`, dan modul itu membuat
 * PrismaClient pada saat evaluasi impor. Kalau DATABASE_URL belum ada saat itu,
 * client tersebut dibuat tanpa `pgbouncer=true` dan langsung gagal dengan
 * 'prepared statement "sN" does not exist' di pooler.
 *
 * Karena impor dievaluasi berurutan, cukup impor modul ini LEBIH DULU daripada
 * modul yang menyentuh `lib/db`.
 */
export function loadEnvLocal() {
  const envFile = path.join(process.cwd(), ".env.local")
  if (!fs.existsSync(envFile)) return
  for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!m) continue
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}

// Dijalankan saat modul diimpor — lihat penjelasan di atas.
loadEnvLocal()

/**
 * Script biasanya berjalan sekuensial dan hanya sebentar, jadi satu koneksi
 * sudah cukup — sekaligus paling ramah terhadap pooler.
 */
export function createScriptPrisma() {
  loadEnvLocal()

  const baseUrl = process.env.DATABASE_URL
  if (!baseUrl) {
    console.error("❌ DATABASE_URL tidak ditemukan (cek apps/web/.env.local)")
    process.exit(1)
  }

  const u = new URL(baseUrl)
  const usingPooler =
    baseUrl.includes(":6543") ||
    baseUrl.includes("pooler.supabase") ||
    u.searchParams.get("pgbouncer") === "true"

  if (usingPooler) {
    u.searchParams.set("pgbouncer", "true")
    u.searchParams.set("connection_limit", "1")
    if (!u.searchParams.has("pool_timeout")) u.searchParams.set("pool_timeout", "20")
  }

  return new PrismaClient({
    datasources: { db: { url: u.toString() } },
    log: ["error"],
  })
}
