# Agentic Coding Workflow — BahasaCerdas

This document supplements `AGENTS.md`. Follow `AGENTS.md` and repository conventions first.

## Scope and safety
- Start each coding task from the latest `main` in a dedicated `agent/<task>` branch.
- Never push directly to `main`, merge a PR, or trigger production deployment without explicit human approval.
- Never commit secrets, .env files, production credentials, or personal data.
- Do not run destructive database operations, `prisma db push`, production migrations, seed/restore/cleanup scripts, or scripts with `--execute` against production.
- Read the affected routes, authorization checks, and tests before editing. Respect Supabase/Prisma access controls and founder-role rules.
- Prefer narrow, reversible changes with focused tests and descriptive commits.

## Coding loop
1. Read `README.md`, `AGENTS.md`, and the files relevant to the task.
2. Write a short implementation plan and identify test commands.
3. Make the smallest useful code change and add/update regression coverage.
4. Run checks in an isolated coding environment with non-production placeholder credentials:
   ```bash
   npm ci
   npx prisma generate
   npm run typecheck
   npm run lint
   # Run the task-relevant npm run test:* commands
   npm run build
   ```
   Some checks require configured environment variables; record any unavailable prerequisites rather than reporting a pass.
5. Review the diff for credentials, authorization regressions, unrelated changes, and migration risks.
6. Commit with `feat:`, `fix:`, `refactor:`, `chore:`, or `docs:`; push only the task branch.
7. Open a PR against `main`. Include summary, commands actually run, outcomes, risks, and rollback guidance.
8. Wait for GitHub Actions CI to finish. If it fails, inspect logs, fix, and push again.
9. Human reviews and merges the PR. Production deploy is linked to successful CI on `main`.

## Existing automation
- `.github/workflows/ci.yml` already runs on pushes and PRs. It covers install, Prisma generation, typecheck, regression tests, lint, Next build, game-server build, Docker builds, and compose validation.
- `.github/workflows/deploy-production.yml` deploys after a successful `main` CI run or manual dispatch. Treat this as a protected production boundary.
- GitHub connector permissions and the ability to edit/push Git objects do not by themselves provide a shell for executing tests. Use Codex or another isolated runner for the actual coding/test loop.

## Suggested PR template
**Summary:** What changed and why

**Verification:** Exact commands and pass/fail/skipped results

**Risks:** Auth, data, payment, deployment, and compatibility considerations

**Rollback:** Revert this PR or disable the affected feature

**Deployment:** No automatic merge; production deployment only after approved merge to main.
