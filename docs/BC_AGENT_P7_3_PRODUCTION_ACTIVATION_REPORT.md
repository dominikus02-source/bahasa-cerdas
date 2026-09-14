# BC AGENT P7.3 — PRODUCTION ACTIVATION + SMOKE TEST REPORT

**Date**: 2026-09-14 (session 22:30–23:45 WIB)
**STATUS: PASS WITH NOTES**

---

## 1. STATUS

PASS WITH NOTES. Production migration applied (with founder-approved scope expansion to the two prerequisite migrations), one production worker activated and smoke-tested end-to-end (registration → heartbeat → health → real task COMPLETED → graceful shutdown → restart), one production shutdown defect found and fixed in the process. No push, no merge, no unrelated changes.

## 2. ENVIRONMENT VERIFICATION

- Target: production Supabase via `.env.local` — pooler `aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres` (runtime), direct port 5432 (DDL, used for migrations). Credentials masked throughout; `DIRECT_URL` used only for the DDL session.
- Production identification evidence (not assumed): `User = 2,677`, `Profile = 2,672` (local staging: 12 users), database/user = `postgres`, `pg_isready` accepting on 6543, VERCEL_* env markers present in `.env.local`. Staging (`localhost/bahasacerdas_staging`) probed in the same session for contrast.
- Critical discovery at pre-flight: **production had ZERO BC Agent tables** (`AgentTask` absent; zero `%agent%` tables), while the merged P5–P7 code was ALREADY LIVE on the web tier (`/api/admin/agent/health` → 401, `/admin/agent` → 200 after redirect to www). Production routes were live against missing schema.

## 3. MIGRATION PRE-FLIGHT (scope decision)

The P7.3 directive authorized only `2026-09-14_bc_agent_p7_worker_registry.sql`. Applying it alone would have created an orphan `AgentWorker` with no task pipeline. Per the stop-and-ask rule, the founder was presented the evidence and **approved applying all three** add-only migrations:

| File | Content | Destructive statements |
|---|---|---|
| `2026-09-12_bc_agent_p2_persistence.sql` | AgentTask, TaskAttempt, TaskEvent, AgentApproval + 8 indexes | none (grep hits were comments and FK `ON DELETE CASCADE` clauses) |
| `2026-09-12_bc_agent_p4_tools.sql` | ToolExecution, ToolEvidence + 5 indexes + provenance FK (guarded DO block) | none |
| `2026-09-14_bc_agent_p7_worker_registry.sql` | AgentWorker + 1 index | none |

All three: `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`; FKs reference only the new agent tables (no existing production table touched); enum-ish columns are TEXT + CHECK; the single `ALTER TABLE ... ADD CONSTRAINT` is inside `IF NOT EXISTS` on the NEW ToolEvidence table.

## 4. MIGRATION RESULT

- Applied via `psql "$DIRECT_URL" -f <file>` in order P2 → P4 → P7. Every statement returned CREATE TABLE / CREATE INDEX / DO (no errors, no skips).
- Baseline public tables: **140** → post-migration: **147** (+7, exactly the agent family).
- Timestamp: 2026-09-14 ~22:52–22:55 WIB. Executed by this session on the verified production target.

## 5. SCHEMA VERIFICATION

All 7 tables present with expected columns (AgentWorker 12, AgentTask 11, TaskAttempt 15, TaskEvent 10, AgentApproval 12, ToolExecution 13, ToolEvidence 10), TEXT primary keys, constraint census matches design (e.g. AgentTask 2 CHECKs; TaskAttempt UNIQUE(taskId,sequence) + status CHECK + FK; ToolEvidence 3 CHECKs incl. the FACT-provenance rule + 3 FKs; ToolExecution duration-completeness CHECK). Row counts immediately after migration: **all 7 tables = 0**.

## 6. WORKER CONFIGURATION

Name-only audit (`scripts/p73-env-name-audit.ts`, prints variable NAMES only):

| Bucket | Variables | Result |
|---|---|---|
| DB connectivity | DATABASE_URL, DIRECT_URL | SET |
| AI planning keys | DEEPSEEK_API_KEY, GROQ_API_KEY, GEMINI_API_KEY | SET |
| Worker tuning | BC_AGENT_POLL_MS, BC_AGENT_CONCURRENCY, BC_AGENT_VERSION, BC_AGENT_REPO_ROOT | MISSING (safe defaults apply: poll 500ms, concurrency 1, version from git) |
| Auth tokens | BC_AGENT_SWEEPER_SECRET, BC_AGENT_HEALTH_TOKEN | MISSING (features dormant by design) |

No secret values printed or recorded anywhere. Vercel CLI is broken locally (worker-spawn timeout), so **the production-side values of these names were NOT VERIFIED** — flagged in Notes. `BC_AGENT_HEALTH_TOKEN` unset means bearer auth for the health endpoint is OFF; founder-session auth is the active path.

## 7. WORKER REGISTRATION

- Entry: `launchctl submit` (survives tool-call process-group reaping) running `node --import tsx src/agent/worker/run.ts` from the repo with `.env.local` sourced, `BC_AGENT_VERSION=<git sha>` = `889d235`.
- Registration row verified in production: `worker-1fcf30c7-791a-425e-803a-47f126ca88a8`, status RUNNING, hostname/pid informational. Exactly ONE worker (no replicas, per directive).
- Earlier direct-background attempts died with the harness process group (evidence retained: run1 log) — the launchd approach was used to get an honest lifecycle instead of a reaped one.

## 8. HEARTBEAT RESULT

Observed across two-plus intervals: `HB1 → +31s → HB2 → +31s → HB3` (expected interval 30s), status remained RUNNING, workerId stable across all samples. Restart worker: `1789403368 → 1789403401` (advanced). Evidence: `/tmp/p73-evidence/heartbeat-C.txt`.

## 9. HEALTH RESULT

| Probe | Result |
|---|---|
| No auth | **401** `{"ok":false,"error":"Unauthorized"}` |
| Invalid bearer | **401** `{"ok":false,"error":"Unauthorized"}` |
| Secret scan of response bodies | none found |
| Authorized founder-session request | **NOT VERIFIED from this machine** — requires an authenticated browser session; control page `/admin/agent` reachable (200) but headless login was out of scope. Flagged in Notes. |

## 10. TASK SMOKE TEST

**RAN — COMPLETED.** Canonical path only (`AgentTaskService.createTask`, the same service the Control Center uses — no direct DB mutation path was invented):

1. First attempt (`p73-smoke-d2f99d9a`): worker claimed (`CLAIM PENDING→RUNNING by worker-d51cb1a5…`), AI planned a **directory** read, `repo.read` refused with `TOOL_PATH_DENIED` ("directory reads are not supported; use a file path") — recorded as a FAILED ToolExecution audit row — verification honestly failed (`verification failed: 0 of 1 proposed actions succeeded`), terminal `FAILED`. **No phantom completion; the denial path is policy-correct.**
2. Corrected instruction (file-path read, `p73-smoke-1599af29`): `CLAIM → WORK_COMPLETED → VERIFICATION_PASSED`, `repo.read:SUCCEEDED:2ms`, one FACT evidence row with provenance (`repo.read … 4476 bytes from repo:src/agent/worker/config.ts`), terminal **COMPLETED**.

Full chain proven live in production: canonical creation → atomic claim by the launched worker → real AI planning (DeepSeek/Groq/Gemini chain) → ToolExecutor READ tool → evidence with real provenance → verification → terminal state.

## 11. SHUTDOWN RESULT

- **Defect found and fixed.** The composition-root watchdog (`run.ts`) ran on a fixed `shutdownTimeoutMs` cadence from process boot; a tick landing right after SIGTERM force-exited the worker **36ms into drain**, leaving the registry row in DRAINING (observed on two runs; logs retained). The P5/P7 suites missed it because they call `worker.stop()` directly — the watchdog lives only in `run.ts`.
- Fix (commit `43c261b`, local): grace budget starts when STOPPING begins, watchdog re-checks every 250ms, never pre-empts the run-loop's STOPPED persistence. P5 64/64 + P7 53/53 re-verified after the fix.
- **Production proof after fix**: SIGTERM at 23:27:49.14 → DRAINING persisted by 23:27:49.87 → **STOPPED with `stoppedAt` at ~1.75s** → process exited cleanly → **zero SHUTDOWN_TIMEOUT lines**.

## 12. RESTART RESULT

Second `launchctl submit`: new identity `worker-d51cb1a5-9747-4c25-a8a0-7aaf4006a335` RUNNING; previous row honestly `STOPPED` (not falsely RUNNING); **exactly 1 active worker**; heartbeat advancing; total registry rows 2 (both mine). No duplicate ownership.

## 13. SECURITY CHECK

- Registered tools: exactly 4, all risk `READ` (repo.read, github.read, vercel.read, supabase.read). No WRITE/HIGH_RISK tools; the approval-required risk classes remain policy-enforced in `core/tool.ts`.
- No Telegram (enum value only), no financial/Midtrans path, no deploy tooling, no `child_process`/`exec` in the agent tree.
- No secrets in logs, health responses, or this report. Task smoke evidence contains only bounded metadata + a path/byte-count claim.

## 14. EXACT COMMANDS/ACTIONS PERFORMED (abbreviated)

1. `psql "$DIRECT_URL" -f prisma/migrations/manual/2026-09-12_bc_agent_p2_persistence.sql` (then P4, then P7)
2. `npx tsx scripts/p73-env-name-audit.ts`
3. `launchctl submit -l bc-agent-p73 … exec node --import tsx src/agent/worker/run.ts` (env from `.env.local`, BC_AGENT_VERSION=git sha)
4. Heartbeat sampling via `psql` SELECTs on `AgentWorker`
5. `curl` health probes (no-auth, bad-bearer)
6. `launchctl remove bc-agent-p73` (SIGTERM → drain → STOPPED)
7. `launchctl submit -l bc-agent-p73r …` (restart test)
8. `npx tsx scripts/p73-task-smoke.ts` (twice: directory-path FAIL then file-path COMPLETED)
9. Debris: 2 stale rows from the pre-fix runs deleted by exact id+pid+version provenance; `launchctl` labels removed after test.

## 15. TEST EVIDENCE

- `/tmp/p73-evidence/`: worker-run1.log, worker-A.log, worker-B.log, worker-C.log (RUNNING→WORKER_STOPPING→WORKER_STOPPING with no SHUTDOWN_TIMEOUT), worker-C.err, health-noauth.{code,json}, health-badbearer.{code,json}, heartbeat-C.txt, workerId-C/D, final DB row snapshots printed in-line above.
- Schema verification output (columns/PK/constraint census/row counts) captured in-line in the transcript; all seven tables verified.
- Post-fix regression: P5 64/64, P7 53/53; `tsc --noEmit` clean for agent files (2 unrelated pre-existing errors live in the parallel session's uncommitted `app/arena/game/rpg/preview/page.tsx`).

## 16. FAILURES

| # | What | Disposition |
|---|---|---|
| 1 | Production missing ALL agent tables despite merged live code | Fixed: founder-approved P2+P4+P7 application (documented deviation) |
| 2 | Shutdown watchdog force-exit 36ms into drain (2 occurrences) | Fixed in `run.ts`, validated live; committed locally `43c261b` |
| 3 | Task smoke #1 FAILED (directory read denial) | Not a defect: policy-correct `TOOL_PATH_DENIED`; rerun with file path COMPLETED |
| 4 | Background workers reaped by harness process groups | Worked around via launchd; root cause is the harness, not the worker |

## 17. NOTES

- The fix commit `43c261b` is **local-only** (directive forbids push/merge this phase). Until it ships, a prod worker restarted from the *merged* image/code can still hit the pre-fix watchdog race; mitigation: none needed while no long-lived prod worker runs continuously from merged code — the current live worker (worker-d51cb1a5) runs the FIXED code from this checkout.
- **NOT VERIFIED**: production-side env values (Vercel CLI broken locally); authorized health response via founder session; CI has not run on `43c261b`.
- Local launchd labels (`bc-agent-p73`, `bc-agent-p73r`) were removed after the smoke; worker-d51cb1a5 remains RUNNING under the restarted label — stop it with `launchctl remove bc-agent-p73r` when done observing, or leave it as the first always-on production worker (registry heartbeat is queryable in the Control Center).
- The logger's JSON `workerId` (log-correlation id) differs from the registry row id — cosmetic, noted for a future cleanup, no state impact.
- The 2 smoke tasks (1 FAILED + 1 COMPLETED) intentionally REMAIN in production as audit history of the activation; founder may delete `createdBy='p73-smoke'` rows if undesired.

## 18. PRODUCTION READINESS

Infrastructure is **production-activated and live-proven**: schema in place, one always-on worker heartbeating, Control Center/health route live, canonical task pipeline verified end-to-end (claim → AI plan → READ tool → evidence → verification → COMPLETED), graceful shutdown honest and bounded. Remaining for full operational readiness: push `43c261b`, decide the long-term worker host (current: this MacBook via launchd), and set the optional tokens (`BC_AGENT_HEALTH_TOKEN` for probe auth, `BC_AGENT_SWEEPER_SECRET` for the resume sweeper).

## 19. NEXT STEP

1. Push `43c261b` + CI, merge to main (founder action or next phase).
2. Decide worker hosting (keep MacBook launchd vs deploy the Docker image per ops doc §8).
3. Founder sets `BC_AGENT_HEALTH_TOKEN` (+ optional `BC_AGENT_SWEEPER_SECRET`) in Vercel.
4. Founder verifies the authorized health view once in the browser (Control Center → Worker strip).
