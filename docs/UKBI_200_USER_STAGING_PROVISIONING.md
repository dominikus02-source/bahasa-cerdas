# STAGING PROVISIONING — MIGRATION AUDIT & APPLY PLAN (Phase 3, Phase A→B)

Tanggal: 2026-08-20 · Status: **AUDIT SELESAI — APPLY MENUNGGU KREDENSIAL STAGING**
Production ref (DILARANG muncul di konfigurasi staging): `ibtlhoocaoopgtcsnvzr`

## 1. Hasil Audit Migrasi (read-only, semua lulus)

| Check | Hasil |
|-------|-------|
| Referensi production ref `ibtlhoocaoopgtcsnvzr` di seluruh `prisma/migrations/` | ✅ 0 |
| Referensi host production (`*.pooler.supabase.com`, `db.*.supabase.co`) | ✅ 0 |
| DROP DATABASE / DROP SCHEMA | ✅ 0 |
| DROP TABLE berbahaya | ✅ 0 — semua `-- DROP ...` (komentar rollback) atau `DROP TABLE IF EXISTS "arena_junior_*"` (legacy staging-only) |
| External DB (dblink / postgres_fdw / CREATE SERVER / IMPORT FOREIGN SCHEMA) | ✅ 0 |
| COPY / INSERT massal "User" (copy user production) | ✅ 0 (file data hanya badge/soal/metadata, semua upsert) |
| GRANT / CREATE POLICY / CREATE TRIGGER / CREATE EXTENSION / search_path | ✅ 0 |
| Guard `IF NOT EXISTS` | ✅ 33/33 file manual punya guard |
| Diff schema `--from-empty --to-schema-datamodel` | ✅ 111 `CREATE TABLE`, 0 ref `auth.users` |
| Migrasi prisma terdaftar (`prisma/migrations/2026*`) | 2 (sd_tingkat, performance_indexes) + `manual/` 33 SQL |

Catalan: tabel `User` TIDAK punya FK ke `auth.users` di diff (ids UUID plain) → apply aman tanpa auth schema khusus.

## 2. Urutan Apply ke Staging (DB kosong)

```bash
# 1. Schema penuh dari Prisma (source of truth — merangkum semua kolom manual)
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
#    → apply via psql ke staging DIRECT_URL (port 5432), bukan pooler
psql "$STAGING_DIRECT_URL" -f staging-schema-full.sql

# 2. Replay file manual ber-urutan nama (semua idempotent via IF NOT EXISTS;
#    di DB baru, ALTER yang sudah ada = no-op; file data = upsert)
for f in $(ls prisma/migrations/manual/*.sql | sort); do psql "$STAGING_DIRECT_URL" -f "$f"; done

# 3. Verifikasi
npx prisma validate && npx prisma generate
psql "$STAGING_DIRECT_URL" -c 'select count(*) from "PaketKompetensi";'
psql "$STAGING_DIRECT_URL" -c 'select count(*) from "UKBIQuestion";'
```

Catatan: `2026-08-15_question_metadata_sample.sql` & `2026-08-06_ukbi_guru_menulis_berbicara.sql` berisi DATA (sampel metadata; soal UKBI guru) — sengaja di-replay agar staging punya bank riil untuk smoke test UKBI. `2026-07-28_audit_reset_xp_curang.sql`, `penalti_*`, `deactivate_inert_store_items.sql` memakai UUID user riil → di staging = no-op natural (0 baris), aman.

## 3. Tabel yang DIVERIFIKASI setelah apply (Phase B requirement)

UKBI/assessment: `PaketKompetensi`, `UKBIQuestion`, `TKAQuestion`, `ProgresKompetensi`, `TestSession`, `TestAnswer`, `QuestionMetadata`
Gamification pendukung UKBI: `PlayerProfile`, `XPTransaction`, `CoinTransaction`, `AwardXp`, `XpLedger`, `UserItem`, `StoreItem`
Learning-loop: `LearningSkill`, `PlayerActivity`, `LearningJourney`, `LearningRecommendation`, `PlayerCTA`, `LearningInsight`, `LearningEvidence`, `AdaptivePracticeSession`
Auth/pembayaran pendukung: `User`, `Profile`, `Group`, `GroupMember`, `Transaksi`
(111 tabel total — daftar `CREATE TABLE` ada di artifact `staging-schema-full.sql`)

## 4. Blokir

- Supabase CLI belum login (`~/.supabase/access-token` belum ada). Founder: `supabase login` (browser flow) → saya lanjut otomatis.
- Upstash staging DB belum dibuat (founder, via dashboard Upstash). Kirim `STAGING_REDIS_URL` + `STAGING_REDIS_TOKEN` ✉️ (jangan di-commit).
- Vercel CLI ✅ sudah login (`dominikus02-source`) — deploy staging menyusul setelah resource staging ada.

## 5. Format Laporan Akhir Phase 3

Template `UKBI 200 USER — STAGING PROVISIONING REPORT` (Supabase/Redis/Vercel/Gate/One-User/Seed/Paket/Warm-up/Rate-Limit/Safety/Verdict) — diisi saat provisioning selesai, menunggu Founder Review.