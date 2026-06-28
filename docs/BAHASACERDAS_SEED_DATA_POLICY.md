# BahasaCerdas Seed Data Policy

> **Version:** 1.0.0  
> **Last Updated:** June 28, 2026  
> **Applies to:** All seed scripts in `prisma/seed-data/`, `scripts/seed-*.ts`, and `prisma/seed-*.ts`

## 1. Purpose

Seed data provides deterministic, repeatable baseline content for BahasaCerdas.com. It serves two purposes:

- **Development / local**: Populate a fresh database with enough content to render all pages meaningfully.
- **Production recovery**: If the database is wiped or migrated, seed data provides a minimum viable content set so the homepage and public pages never show "Belum ada data" empty states.

Seed data is **not** a substitute for real user-generated content. It is a scaffold.

## 2. Scope

| Domain | Seeded? | Notes |
|--------|---------|-------|
| Homepage Artikel | ✅ Yes | Editorial articles by Tim Redaksi BahasaCerdas |
| Homepage Video | ✅ Yes | Curated educational video entries |
| Marketplace Karya | ✅ Yes | Sample marketplace items from editorial team |
| Learning content (Jalur Cerdas) | ✅ Yes | 72+ units via `scripts/seed-panduan.ts` |
| UKBI/TKA questions | ✅ Yes | 25 UKBI + 25 TKA via `prisma/seed-kompetensi.ts` |
| Game questions | ❌ No | Has fallback defaults in game server code |
| User accounts | ❌ No | Not seeded beyond demo accounts |
| Quizzes, Soal, BankSoal | ❌ No | Must be created by authenticated users |
| Social features | ❌ No | Must be user-generated |
| AI Usage logs | ❌ No | Auto-generated as users interact |
| Payments / Purchases | ❌ No | Must be real transactions |

## 3. Seed Data Rules

### 3.1 Authorship

All homepage/public seed content is authored by one of the following editorial personas:

| Persona | Usage |
|---------|-------|
| Tim Redaksi BahasaCerdas | General articles and tips |
| Tim Kurikulum BahasaCerdas | Curriculum-focused content |
| Tim Pengembang Konten BahasaCerdas | Learning material descriptions |

These are **not** real people. They are editorial team labels for the BahasaCerdas platform.

The underlying database record uses the `guru@demo.com` demo account as the author/seller FK. The display name shown on the homepage is set to "Tim Redaksi BahasaCerdas" for professionalism.

### 3.2 Content Requirements

Every seed item MUST include:

| Field | Required | Validation |
|-------|----------|-----------|
| `title` | Yes | Non-empty string |
| `slug` (Artikel) | Yes | Unique, non-empty |
| `excerpt` / `description` | Yes | Non-empty string |
| `publishedAt` | Yes | Valid ISO 8601 date |
| `category` / `type` | Yes | Must match Prisma enum |
| Content body | Yes | Non-empty string |

### 3.3 Determinism

- Seed data is stored in JSON files under `prisma/seed-data/`.
- All content is hand-written, not random.
- Scripts MUST produce the same output on every run.
- Slugs (for Artikel) and titles (for Video/Karya) are stable identifiers.

### 3.4 Repeatability

- Scripts use **upsert**: find by slug/title, update if exists, create if not.
- Running the same seed twice produces the same result (idempotent).
- No destructive operations (no delete, no drop).

### 3.5 Safety

| Action | Allowed? |
|--------|----------|
| Insert new records | ✅ Yes |
| Update existing seed records | ✅ Yes (by slug/title) |
| Delete records | ❌ Never |
| Overwrite user-generated data | ❌ Never |
| Modify user accounts | ❌ Never |
| Modify schema | ❌ Never |

## 4. Seed Script Conventions

### 4.1 Naming

- Seed data files: `prisma/seed-data/<domain>.json`
- Seed scripts: `scripts/seed-<domain>.ts`
- Prisma seeds: `prisma/seed-<domain>.ts`

### 4.2 Structure

Every seed script MUST implement:

```
main()
├── Load seed data from JSON file
├── Validate all items (slug, title, date, category, etc.)
├── Fail fast on validation errors
├── Dry-run mode (--dry-run flag)
│   └── Print what would be done, write nothing
├── Live mode
│   └── Upsert items to database
└── Print summary
```

### 4.3 Dry-Run Mode

- `--dry-run` flag: validate input and simulate seeding without writing.
- Must print clear "DRY-RUN" banner at the top.
- Must print exact same summary format as live mode.

### 4.4 Validation

Scripts MUST validate before writing:

- **Slug uniqueness** — no duplicate slugs in seed data
- **Field completeness** — no empty required fields
- **Date validity** — `publishedAt` must be parseable
- **Category/type validity** — must match Prisma enums
- **Numeric ranges** — prices, counts, downloads must be non-negative
- **File type** — Karya `fileType` must match `FileType` enum

### 4.5 Error Handling

- Validation errors: print all errors, exit with code 1.
- Database errors: catch, print, exit with code 1.
- Missing editor user: print clear message, exit with code 1.

## 5. Available NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `seed:homepage` | `npx tsx scripts/seed-homepage-v2.ts` | Seed homepage content (Artikel, Video, Karya) |
| `seed:homepage:dry-run` | `npx tsx scripts/seed-homepage-v2.ts --dry-run` | Validate homepage seed without writing |
| `seed:panduan` | `npx tsx scripts/seed-panduan.ts` | Seed Buku Panduan content (72 units) |
| `seed:kompetensi` | `npx tsx prisma/seed-kompetensi.ts` | Seed UKBI/TKA questions |
| `seed:store` | `npx tsx scripts/seed-store.ts` | Seed store items |

## 6. Adding New Seed Data

1. Create or edit the JSON data file in `prisma/seed-data/`.
2. Ensure all items pass validation rules (Section 3.2).
3. Use existing editorial personas (Section 3.1).
4. Run dry-run: `npm run seed:homepage:dry-run`.
5. Run live: `npm run seed:homepage`.
6. Verify by checking the homepage or relevant page.

## 7. Production Policy

- **Never run seed scripts directly on the Supabase production instance** without explicit confirmation.
- Seeds are designed for local/dev databases.
- If production seeding is absolutely necessary, it must be done through a Vercel Postgres or Supabase UI import after manual review.
- Dry-run first, always.

## 8. Risks

1. **Stale seed data** — If the Prisma schema changes (new required fields, renamed enums), seed scripts may break.
2. **Single editorial author** — All homepage content shows "Tim Redaksi BahasaCerdas" as author. This is acceptable for a platform, but not identical to user-generated variety.
3. **Missing file resources** — Karya items reference `fileUrl` paths that point to Supabase Storage. These files do not actually exist as of June 2026. Links will 404 until files are uploaded.
4. **Video URLs** — All video URLs point to real YouTube videos. These may become unavailable over time.
