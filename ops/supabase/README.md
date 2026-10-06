# BahasaCerdas self-hosted Supabase

Production Supabase is prepared for migration to the BahasaCerdas VPS. The managed
`bahasa-cerdas-staging` and `sepedamania` projects remain on Supabase Cloud.

## Pinned runtime

- Self-hosted config: `self-hosted/v0.8.2`
- Postgres: 17.6
- Public API hostname after cutover: `supabase.bahasacerdas.com`
- API gateway and database pooler are bound to loopback on the VPS.
- The API gateway also joins the existing Caddy edge network as `supabase-api`.

The self-host vendor files live outside the application checkout at:

`/opt/bahasacerdas/supabase/prod`

Secrets are generated locally on the VPS and are never committed.

## Migration flow

1. Prepare and start the isolated self-hosted stack.
2. Export managed production with `export-platform.sh`.
3. Restore the copy with `restore-selfhost.sh`.
4. Transfer Storage objects separately.
5. Configure Google OAuth and production SMTP.
6. Run shadow verification and application smoke tests.
7. Only after verification, point the app and DNS to the self-hosted service.
8. Keep the managed production project intact as rollback until the observation
   window is complete.

Do not use `supabase start` for this production deployment; it is the local
development stack. The VPS uses the official self-hosted Docker Compose config.
