/**
 * Pemuat env untuk skrip CLI (bukan untuk runtime Next.js).
 *
 * Kenapa ada dua berkas:
 *   `vercel env pull` SELALU menulis `[SENSITIVE]` untuk variabel yang ditandai
 *   Sensitive/write-only di Vercel — termasuk DATABASE_URL. Artinya nilai asli
 *   yang ditempel manual ke `.env.local` akan tertimpa setiap kali pull.
 *
 *   Maka nilai asli disimpan di `.env.db.local` yang tidak pernah disentuh
 *   `vercel env pull`. Berkas itu dimuat LEBIH DULU; dotenv tidak menimpa
 *   variabel yang sudah ada, jadi nilainya menang atas `[SENSITIVE]`.
 *
 * `.env*` sudah ada di .gitignore, jadi berkas ini tidak akan ikut ter-commit.
 */
import { config as loadEnv } from "dotenv";

function cleanUrl(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const t = v.trim().replace(/^["']|["']$/g, "");
  return t.length ? t : undefined;
}

/** Muat env skrip. Panggil SEBELUM membuat PrismaClient. */
export function loadScriptEnv(): void {
  loadEnv({ path: ".env.db.local" }); // nilai asli — menang karena dimuat dulu
  loadEnv({ path: ".env.local" }); // sisanya dari vercel env pull
}

/**
 * Ambil DATABASE_URL yang valid, atau hentikan proses dengan pesan yang
 * menjelaskan cara memperbaikinya.
 */
export function requireDatabaseUrl(): string {
  const url = cleanUrl(process.env.DATABASE_URL) ?? cleanUrl(process.env.DIRECT_URL);

  if (url && /^postgres(ql)?:\/\//.test(url)) return url;

  const placeholder = url === "[SENSITIVE]";
  console.error(
    "\nDATABASE_URL tidak bisa dipakai.\n" +
      (placeholder
        ? "\nNilainya tulisan '[SENSITIVE]', bukan URL.\n" +
          "\nJANGAN buang waktu dengan `vercel env pull` — dari environment MANA PUN\n" +
          "(development/preview/production) hasilnya tetap '[SENSITIVE]'. Variabel yang\n" +
          "ditandai Sensitive di Vercel bersifat write-only: nilainya dipakai saat build\n" +
          "dan runtime, tapi tidak pernah dikirim balik ke mesin lokal. Itu memang tujuan\n" +
          "penandaannya, dan tidak perlu dilepas.\n"
        : "\nNilainya tidak diawali postgresql://.\n") +
      "\nSatu-satunya jalan — ambil dari Supabase, sekali saja:\n" +
      "\n  1. Supabase → Project Settings → Database → Connection string → URI\n" +
      "     Pakai yang port 6543 (pooler). Ganti [YOUR-PASSWORD] dengan password DB.\n" +
      "     Lupa password? Settings → Database → Reset database password.\n" +
      "\n  2. Buka .env.db.local, ganti baris DATABASE_URL menjadi URI tadi.\n" +
      "\n  3. Ulangi perintahnya.\n" +
      "\nBerkas .env.db.local hanya dibaca skrip CLI (bukan Next.js), dimuat lebih dulu\n" +
      "sehingga menang atas .env.local, dan tercakup pola .env* di .gitignore.\n"
  );
  process.exit(1);
}
