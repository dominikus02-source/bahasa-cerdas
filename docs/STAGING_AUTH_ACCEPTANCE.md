# Staging Auth acceptance checklist

## Infrastructure
- [ ] staging DNS A/AAAA for auth-staging points to staging ingress
- [ ] HTTPS certificate valid; no production proxy config changed
- [ ] GoTrue and dedicated PostgreSQL healthy
- [ ] dedicated auth DB volume exists; no production DB host in auth container env
- [ ] app and Auth communicate only on staging network
- [ ] actual staging web container has staging URL and anon key at build/runtime

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
- [ ] staging E2E run attached to exact commit SHA
- [ ] backup and staging rollback tested
- [ ] no production deployment triggered by staging workflow
