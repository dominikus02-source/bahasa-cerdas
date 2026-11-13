# Supabase password recovery — production checklist

The branded template already exists at `supabase/templates/recovery.html`; repository changes do not automatically publish it to hosted Supabase.

1. In Supabase Dashboard → Authentication → SMTP Settings, enable Custom SMTP with an authorized provider and verified sender `noreply@bahasacerdas.com`. Never commit SMTP credentials.
2. Configure provider-required SPF, DKIM and DMARC records for `bahasacerdas.com` and verify domain status.
3. In Authentication → Email Templates → Reset Password, paste the HTML template from this repository. Preserve `{{ .ConfirmationURL }}`. Suggested subject: `Atur ulang kata sandi BahasaCerdas`.
4. In Authentication → URL Configuration, set Site URL to `https://bahasacerdas.com` and allow the callback `https://bahasacerdas.com/api/auth/callback*`. Include www variant if used. Ensure `SUPABASE_SITE_URL` is an allowed origin.
5. With a test account you control, request a recovery email once. Inspect Supabase Auth logs for SMTP errors, check inbox/spam and sender authentication, follow link, change password and log in. Also test expired links and throttling. Never expose recovery tokens.
6. If the API returns HTTP 503, inspect Supabase Auth logs, provider quotas, verified sender, and SMTP credentials. Success means Supabase accepted the request, not guaranteed inbox placement.

Before merge: run `npm run test:password-reset`, typecheck, lint, build and verify CI. Do not merge or deploy before SMTP end-to-end testing succeeds.
