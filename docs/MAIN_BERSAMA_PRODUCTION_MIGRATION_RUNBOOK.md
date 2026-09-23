# Runbook Migrasi Main Bersama — Staging/Production

Status: **belum pernah dijalankan di production**. Dokumen ini adalah prosedur
yang disetujui; eksekusi menunggu approval owner.

Terakhir diperbarui: 20 September 2026 (Tahap 8A.4 final hardening).

---

## 1. Kondisi saat ini (terverifikasi)

Database produksi (Supabase, pooler `aws-1-ap-southeast-1…:6543`) **BELUM**
memiliki objek Main Bersama:

| Objek | Status di production |
|---|---|
| Tabel `MainSession`, `MainPlayer`, `MainQuestionSnapshot`, `MainRound`, `MainRoundEligiblePlayer`, `MainAnswer`, `MainAnswerSubmission`, `MainGameState`, `MainGameRoundResult` | **TIDAK ADA** (9 tabel) |
| Enum `MainSessionPhase`, `MainGameMode`, `MainRoundStatus`, `MainGameStateStatus` | **TIDAK ADA** (0) |
| Index `Main*` | **TIDAK ADA** (0) |
| Kolom `MainSession.contentTitle` | **TIDAK ADA** |

Akibatnya `POST /api/main-bersama/teacher/commands` (`create-session`) gagal:
Prisma melempar `P2021` → diterjemahkan menjadi `SESSION_STORE_UNAVAILABLE`
(HTTP 503, pesan `Main Bersama belum tersedia saat ini. Coba lagi sebentar.`).

Deteksi cepat (sebelum debugging panjang):

```bash
# Butuh sesi login guru (cookie). Ringkas & tanpa detail internal.
curl -s -H "Cookie: <cookie guru>" https://<host>/api/main-bersama/health
# → { "ok": true, "storage": "ready" | "unavailable" | "unknown", ... }
```

`ready` hanya keluar bila **9 tabel + 4 enum + `contentTitle NOT NULL`**
benar-benar ada; detail objek yang kurang (nama tabel/enum) hanya ditulis
ke **log server**, tidak pernah ke respons.

### 1a. Mutation safety (WAJIB untuk menjalankan Main Bersama)

Mulai Tahap 8A.4 final, mutasi Main Bersama (buka ruang, join, kirim
jawaban) **diblokir** di luar production kecuali diizinkan eksplisit:

| Lingkungan | Mutasi | Ketentuan |
|---|---|---|
| Vercel **Production** (`VERCEL_ENV=production`) | boleh | schema harus sudah diterapkan |
| Automated test (`NODE_ENV=test`) | boleh | memakai test DB existing |
| Vercel **Preview** / **Development** | **diblokir** | butuh `MAIN_BERSAMA_ALLOW_MUTATIONS=true` |
| Dev lokal (`npm run dev`) | **diblokir** | butuh flag + target database review |
| Local production build (`next start`) | **diblokir** | butuh flag |

Saat diblokir: HTTP **503**, kode `MUTATIONS_DISABLED`, pesan
`Main Bersama belum diaktifkan pada lingkungan ini.` — tanpa detail env/DB.

Yang **tidak** diblokir (read-only): `GET` state guru/siswa, `GET` proyektor,
`GET` health, dan evaluasi kompatibilitas paket.

---

## 2. Pemetaan environment (audit 20 Sep 2026)

| Konteks | Sumber env | Database |
|---|---|---|
| Dev lokal **tanpa** shim (`npm run dev`) | `.env.local`, `.env.development.local` | **Supabase production** |
| Dev lokal **dengan** shim (`/tmp/bc-mb-dev.sh`, dsb.) | + `.env.db.local` | Postgres review lokal (`localhost:54329/mbtest`) |
| Vercel project `bahasa-cerdas` (domain produksi) — Production | Vercel env `production` | `DATABASE_URL` (production) |
| Vercel project `bahasa-cerdas` — Preview | Vercel env `preview` | `DATABASE_URL` **entri terpisah** (nilai terenkripsi, tidak dapat diverifikasi dari CLI) |
| Vercel project `bahasa-cerdas-staging` (ter-link di checkout ini) — Production | Vercel env `production` | `DATABASE_URL` (staging) |
| Vercel project `bahasa-cerdas-staging` — Preview/Development | Vercel env preview/dev | **TIDAK ADA `DATABASE_URL`** (hanya `NEXT_PUBLIC_SITE_URL`) |

Catatan penting:

1. **Dev lokal polos menunjuk database produksi.** Semua pekerjaan review Main
   Bersama wajib memakai shim/env review (`TEST_DATABASE_URL` lokal), bukan
   `npm run dev` polos. Sejak Tahap 8A.4 final, dev lokal juga **tidak dapat
   memutasi** Main Bersama tanpa `MAIN_BERSAMA_ALLOW_MUTATIONS=true` — jadi
   `npm run dev` polos menolak sebelum menyentuh database produksi.
2. **Preview harus diverifikasi owner di dashboard Vercel**: entri `DATABASE_URL`
   untuk target `preview` pada project `bahasa-cerdas` ada, tetapi nilainya tidak
   dapat dibaca lewat CLI/API (terenkripsi). Jika entri itu hasil salin dari
   production, review di Preview akan membuat sesi di database produksi —
   persis risiko yang ingin dihindari. Rekomendasi: arahkan `preview` ke
   database staging/review, atau review Main Bersama di project staging.
3. Project `bahasa-cerdas-staging` tidak punya DB untuk Preview/Development —
   deployment Preview di project itu tidak dapat mengakses database sama sekali.

---

## 3. Migration authoritative

Jalankan **berurutan**:

| # | Migration | Isi |
|---|---|---|
| 1 | `prisma/migrations/20260918000000_main_bersama_tables/migration.sql` | 9 tabel + 4 enum + index + FK Main Bersama. Additive murni (tanpa `DROP`, tanpa `ALTER` tabel modul lain). |
| 2 | `prisma/migrations/20260920120000_main_bersama_content_title/migration.sql` | Kolom `MainSession."contentTitle"` (snapshot identitas konten) + backfill baris lama ke `'Paket Soal'` + `SET NOT NULL`. |

Keduanya hanya menyentuh objek Main Bersama.

---

## 4. Prosedur (JANGAN pakai `prisma migrate deploy`)

Repo masih memiliki `prisma/migrations/manual/` (50+ SQL legacy) yang terdeteksi
Prisma sebagai migration pending. Karena itu `prisma migrate deploy` **bukan**
prosedur production Main Bersama sampai kebersihan migration repo dibereskan
secara terpisah.

Langkah yang disetujui:

1. **Review SQL** — baca kedua file migration di §3, pastikan hanya additive.
2. **Backup** — ambil backup database target dulu
   (`npm run backup:current` atau mekanisme backup existing).
3. **Apply SQL eksplisit** ke database target, salah satu:
   - Supabase SQL Editor (tempel isi file, jalankan), atau
   - psql memakai `DIRECT_URL` (port 5432, bukan pooler):
     ```bash
     psql "$DIRECT_URL" -v ON_ERROR_STOP=1 \
       -f prisma/migrations/20260918000000_main_bersama_tables/migration.sql
     psql "$DIRECT_URL" -v ON_ERROR_STOP=1 \
       -f prisma/migrations/20260920120000_main_bersama_content_title/migration.sql
     ```
4. **Verifikasi objek**. Kriteria `ready` = **9 tabel + 4 enum +
   `contentTitle` NOT NULL**.

   ```sql
   -- 4a. Sembilan tabel Main Bersama — semua harus true.
   SELECT to_regclass('public."MainSession"')               IS NOT NULL AS main_session,
          to_regclass('public."MainPlayer"')                IS NOT NULL AS main_player,
          to_regclass('public."MainQuestionSnapshot"')      IS NOT NULL AS main_question_snapshot,
          to_regclass('public."MainRound"')                 IS NOT NULL AS main_round,
          to_regclass('public."MainRoundEligiblePlayer"')   IS NOT NULL AS main_round_eligible_player,
          to_regclass('public."MainAnswer"')                IS NOT NULL AS main_answer,
          to_regclass('public."MainAnswerSubmission"')      IS NOT NULL AS main_answer_submission,
          to_regclass('public."MainGameState"')             IS NOT NULL AS main_game_state,
          to_regclass('public."MainGameRoundResult"')       IS NOT NULL AS main_game_round_result;

   -- 4b. Empat enum — HARUS enum-specific (`typtype = 'e'`).
   --     JANGAN pakai `typname LIKE 'Main%'` pada pg_type: itu juga
   --     menghitung composite type milik tiap tabel (9 baris),
   --     sehingga jumlahnya membingungkan (13, bukan 4).
   SELECT count(*) AS enum_main
     FROM pg_type
    WHERE typtype = 'e'
      AND typname IN ('MainSessionPhase', 'MainGameMode',
                      'MainRoundStatus', 'MainGameStateStatus');   -- harus 4

   -- Bila perlu audit satu per satu:
   SELECT typname FROM pg_type
    WHERE typtype = 'e' AND typname LIKE 'Main%'
    ORDER BY typname;

   -- 4c. Index Main Bersama.
   SELECT count(*) AS index_main FROM pg_indexes WHERE indexname LIKE 'Main%';

   -- 4d. Kolom contentTitle: harus ada, bertipe text, dan NOT NULL.
   SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'MainSession'
      AND column_name = 'contentTitle';   -- text | NO
   ```
5. **Tandai migration sebagai applied** (agar riwayat Prisma konsisten):
   ```bash
   prisma migrate resolve --applied 20260918000000_main_bersama_tables
   prisma migrate resolve --applied 20260920120000_main_bersama_content_title
   ```
6. **Smoke test** (bukan data uji produksi, cukup 1 ruang lalu diakhiri):
   - `GET /api/main-bersama/health` → `storage: "ready"`;
   - Guru membuka `/guru/game/main-bersama` → Buka Ruang → ruang tampil
     dengan PIN, nama konten, mode, dan jumlah soal.

---

## 5. Panduan per lingkungan (setelah migration)

### Production (Vercel)

1. Apply **2 migration berurutan** (§3) ke database production, atau
   deploy dulu lalu apply SQL-nya — tapi **jangan** membiarkan prod
   menerima trafik tulis sebelum §4 verifikasi lulus.
2. Verifikasi §4 (9 tabel, 4 enum, `contentTitle NOT NULL`).
3. `prisma migrate resolve --applied` untuk kedua migration.
4. **Tidak perlu flag apa pun** — `VERCEL_ENV=production` sudah
   mengizinkan mutasi secara implisit.
5. Smoke test §4 langkah 6 (`health` → `ready`, lalu 1 ruang).

### Preview (Vercel)

1. **Owner check (wajib, tidak bisa dari CLI):**
   Vercel Dashboard → project `bahasa-cerdas` → Settings →
   Environment Variables → `DATABASE_URL` → target **Preview**.
   Pastikan nilainya menunjuk **staging/review DB**, bukan production.
   (Entri Preview ada tetapi terenkripsi; nilainya tidak dapat dibaca
   dari CLI/API.)
2. Setelah (1) terverifikasi, set `MAIN_BERSAMA_ALLOW_MUTATIONS=true`
   **hanya untuk target Preview**.
3. Tanpa langkah (2), Preview tetap dapat membaca (read-only) tetapi
   setiap mutasi dijawab 503 `MUTATIONS_DISABLED` — sesuai desain:
   tersedianya `DATABASE_URL` saja tidak cukup untuk mengaktifkan mutasi.

Catatan: project `bahasa-cerdas-staging` **belum memiliki `DATABASE_URL`**
untuk Preview/Development — deployment Preview di project itu tidak dapat
mengakses database sama sekali. Diperlukan keputusan owner untuk
mengisinya (jangan mengarang credential). Masukkan ke deployment checklist.

### Local (developer)

1. Gunakan shim review yang sudah ada:
   `/tmp/bc-mb-dev.sh` → `.env.db.local` → `localhost:54329/mbtest`.
2. Shim mengekspor `MAIN_BERSAMA_ALLOW_MUTATIONS=true`. Alternatif setara:
   tambahkan baris itu ke `.env.db.local` (file git-ignored).
3. **JANGAN** menyalakan flag sementara `DATABASE_URL` menunjuk database
   produksi — itu persis kondisi yang dikunci oleh guard ini.

---

## 6. Rollback

Kedua migration additive. Untuk membatalkan (hanya bila benar-benar perlu):

```sql
DROP TABLE IF EXISTS "MainAnswerSubmission", "MainAnswer", "MainRoundEligiblePlayer",
  "MainRound", "MainGameRoundResult", "MainGameState", "MainQuestionSnapshot",
  "MainPlayer", "MainSession";
DROP TYPE IF EXISTS "MainSessionPhase", "MainGameMode", "MainRoundStatus", "MainGameStateStatus";
```

Tidak ada tabel modul lain yang terpengaruh. Setelah rollback, tandai migration
sebagai rolled back (`prisma migrate resolve --rolled-back <nama>`).

---

## 7. Larangan

- **JANGAN** menjalankan `prisma migrate deploy` / `npm run db:migrate` untuk
  Main Bersama selama `prisma/migrations/manual/` belum dibereskan.
- **JANGAN** memindahkan/mengubah 50+ SQL di `prisma/migrations/manual/`
  dalam pekerjaan Main Bersama (technical debt terpisah).
- **JANGAN** apply ke production tanpa approval owner.
- **JANGAN** mengarahkan Preview/deployment review ke database produksi.
- **JANGAN** menyalakan `MAIN_BERSAMA_ALLOW_MUTATIONS=true` pada deployment
  yang `DATABASE_URL`-nya menunjuk production (mutasi production hanya boleh
  terjadi sebagai Vercel Production, bukan lewat flag).
