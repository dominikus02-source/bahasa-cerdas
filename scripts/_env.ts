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
        ? "\nNilainya masih '[SENSITIVE]'. Itu BUKAN kesalahanmu: `vercel env pull` memang\n" +
          "selalu menulis placeholder untuk variabel bertanda Sensitive (write-only),\n" +
          "jadi menempel nilai asli ke .env.local akan tertimpa pull berikutnya.\n"
        : "\nNilainya tidak diawali postgresql://.\n") +
      "\nPerbaikan sekali jalan — simpan di berkas yang tidak disentuh vercel:\n" +
      "\n  1. Supabase → Project Settings → Database → Connection string (URI)\n" +
      "     Pakai yang port 6543 (pooler). Ganti [YOUR-PASSWORD] dengan password DB.\n" +
      "     Lupa password? Settings → Database → Reset database password.\n" +
      "\n  2. Buat berkas .env.db.local di root proyek, isi satu baris:\n" +
      "     DATABASE_URL=postgresql://postgres:PASSWORD@db.xxx.supabase.co:6543/postgres\n" +
      "\n  3. Jalankan ulang perintahnya.\n" +
      "\n.env.db.local sudah tercakup .gitignore dan tidak akan ditimpa vercel env pull.\n"
  );
  process.exit(1);
}
