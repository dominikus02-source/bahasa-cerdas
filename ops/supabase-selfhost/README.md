# BahasaCerdas self-hosted Supabase production

This directory contains the reproducible wrapper around the official Supabase Docker stack used for the BahasaCerdas production migration.

## Safety model

- The managed Supabase project remains the production authority until cutover.
- The self-hosted instance starts as a **shadow** stack bound only to localhost.
- No production DNS or application environment variables are changed during shadow preparation.
- Supabase upstream is pinned to commit `d2ffd76395c0b1b9cf9feb25ac9843010bd0ccf5`.
- PostgreSQL 17 is used to match the current hosted BahasaCerdas database.
- Staging and Sepedamania remain on Supabase Cloud.

## Local-only shadow ports

- API gateway: `127.0.0.1:54380`
- Session pooler: `127.0.0.1:54382`
- Transaction pooler: `127.0.0.1:54383`

These ports are intentionally not public.

## Prepare

```bash
bash ops/supabase-selfhost/prepare-shadow.sh
```

Then start the official stack from the pinned checkout:

```bash
cd /opt/bahasacerdas/apps/supabase-bc-prod/docker
docker compose -f docker-compose.yml \
  -f /opt/bahasacerdas/apps/bahasa-cerdas/ops/supabase-selfhost/docker-compose.shadow.yml \
  up -d
```

Verify:

```bash
bash /opt/bahasacerdas/apps/bahasa-cerdas/ops/supabase-selfhost/verify-shadow.sh
```

Database dump/restore, Auth provider configuration, Storage object transfer, and production cutover are deliberately separate phases.
