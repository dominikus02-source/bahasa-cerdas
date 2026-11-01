# Staging Auth acceptance checklist

## Infrastructure
- [ ] staging DNS A/AAAA for auth-staging points to staging ingress
- [ ] HTTPS certificate valid on a dedicated staging ingress; production Caddy and proxy config untouched
- [ ] GoTrue and dedicated PostgreSQL healthy
- [ ] dedicated Auth PostgreSQL volume exists; no production DB host in Auth container env
- [ ] dedicated Storage PostgreSQL volume exists, separate from Auth and application DB
- [ ] `audio` bucket is private; recording endpoint validates audio type/size and returns signed URLs
- [ ] existing bucket visibility is reviewed and no bucket is made public automatically
- [ ] internal PostgREST healthy; Storage migrations applied; file volume persistent
- [ ] staging ingress routes `/auth/v1/*` and `/storage/v1/*` only to staging containers
- [ ] app and Auth communicate only on staging network
- [ ] actual staging web container has staging Auth/Storage URLs and staging anon key at build/runtime
- [ ] Storage private-bucket E2E passes upload, anonymous-deny, signed download and delete

## Identity E2E
- [ ] User A sign-up/login
- [ ] User B sign-up/login
- [ ] A and B receive different user IDs
- [ ] A cannot access B identity/data
- [ ] refresh token works
- [ ] logout invalidates session
- [ ] password recovery request accepted
- [ ] recovery emails received in both test inboxes
- [ ] password reset link completes and new password works
- [ ] protected routes enforce role/session

## Regression and safety
- [ ] JUMPA camera/session flow still works
- [ ] Google OAuth (if enabled) callback works
- [ ] production web health remains HTTP 200
- [ ] production Auth URL/JWT/DB config unchanged
- [ ] staging Auth and Storage E2E runs attached to exact commit SHA
- [ ] backup and staging rollback tested
- [ ] no production deployment triggered by staging workflow
