# Operational Teacher Telemetry — Implementation (September 2026)

**Phase:** 9 / P0 #7 (measurement foundation) · **Status:** implemented (NOT committed/pushed — awaiting Founder review, no prod DB writes, no migration applied)

## 1. Goal

Foundation for measuring the **Operational Teacher Experiment**: a persistence layer for product events + canonical query services for **O1 (Activation)**, **O3 (Operational Classrooms)**, and the **F1–F10 funnel** — all in Asia/Jakarta (WIB), all additive-only, aligned with the three approved specs:
- `docs/OPERATIONAL_CLASSROOM_METRIC_SPEC_SEPTEMBER_2026.md`
- `docs/OPERATIONAL_TEACHER_EXPERIMENT_SPEC_SEPTEMBER_2026.md`
- `docs/TEACHER_ACTIVATION_ANALYTICS_SPEC_SEPTEMBER_2026.md`

## 2. Delivery Layer — `ProductEvent` table

New additive table replacing console-logging-only persistence. **NOT applied to production**; migration is idempotent and lives at `prisma/migrations/manual/2026-09-08_product_event.sql` (must be run in Supabase SQL Editor only after Founder approval).

| Aspect | Design |
|--------|--------|
| Model | `ProductEvent` appended to `prisma/schema.prisma` (no existing table touched) |
| Idempotency | `@@unique([actorId, event, entityType, entityId, logicalKey])` |
| logicalKey | deterministic caller token — once-per-group `group-<id>-code-shared`, once-per-day `teacher-<user>-<dateWIB>` |
| Writer | `recordProductEvent()` in `lib/analytics/product-event-store.ts` — P2002 → `{recorded:false}`, best-effort, never throws |
| Security | Only safe IDs/categorical props; `String(v).length <= 120`; never passwords/tokens/payment secrets |

Event constants: `PRODUCT_EVENT_F4_CODE_SHARED = "class_code_shared"`, `PRODUCT_EVENT_F8_TEACHER_SESSION = "teacher_session"`.

## 3. Canonical Query Services — `lib/analytics/operational-classrooms.ts`

Single source of truth (WIB via `lib/admin/analytics-timezone.ts`):

- **`getOperationalClassrooms(opts)`** → O3. Per group computes `X` (artifact legs), `Y` (≥3 distinct active students), `Z` (naturalistic student evidence), `operational = X && Y && Z` trailing-30d WIB, `operationalSince` = max(earliestX/Y/Z), `operationalInLast90d`, with/exFounders split.
- **`getTeacherActivation(opts)`** → O1. % of cohort `role=GURU && onboarded` with ≥1 class; founder split; target 25%, baseline 11.2%.
- **`getTeacherFunnel(opts)`** → F1–F10 stages (withFounders/exFounders). F4/F8 are **PROXY** (schema-backed) by design: F4 = first `GroupMember.joinedAt`, F8 = first artifact after class create (`hydrateFirstArtifactAfterClass`). ProductEvent read only best-effort (never fabricated). F10 delegates to `getOperationalClassrooms` (trailing-30d).

**Canonical Z** — NEVER legacy `User.xp`. Only `XPTransaction`, `QuizSubmission`, `UserUnitProgress`, `ProgresKompetensi`, `StudentKarya`.

**Canonical X** — `Penugasan`, `MateriKirim`, `Pengumuman` (teacher-owned for group), `QuizAssignment` (`Quiz.creatorId = group.teacherId`), OR ≥1 `StudentKarya` into the group by a member.

## 4. Capture Hooks (server-side, best-effort fire-and-forget)

| Event | Hook | logicalKey |
|-------|------|-----------|
| F4 `class_code_shared` | `app/api/group/route.ts` POST (after `db.group.create`) | `group-<id>-code-shared` |
| F8 `teacher_session` | `app/api/guru/dashboard/route.ts` GET | `teacher-<user>-<dateWIB>` |

Both use `void recordProductEvent(...)` — never block the main action; missing product table is safe (best-effort catch). The existing additive `/api/analytics/product-event` route now persists via `recordProductEvent` alongside console-logging (behavior of `lib/analytics/product-track.ts` unchanged).

## 5. T-0 Baseline (frozen, immutable)

- `data/operational-teacher-baseline-t0-september-2026.json`
- `docs/OPERATIONAL_TEACHER_BASELINE_T0_SEPTEMBER_2026.md`

Confirmed at T-0: **Activation 11.2% (54/484)** · **Operational Classrooms 0** · **Class→Artifact wall 14.8% (8/54)**. F2/F5/F6/F7/F8/F9 left `null` pending live production recomputation (local DB masked). Operational and Activation kept SEPARATE (`scorecardItem16Baseline = 3`).

## 6. Validation

`npm run test:operational-baseline` (`scripts/test-operational-baseline.ts`) — **27/27 PASS**, covering:
- A. Baseline JSON structure + immutability + frozen figures.
- B. Canonical service never reads legacy `User.xp` for Z (doc-mention-only guard).
- C. F4/F8 capture hooks wired with fire-and-forget `void recordProductEvent`.
- D. ProductEvent idempotency (P2002 → recorded:false) + WIB dayKey.
- E. Funnel consistency invariants (operational ≤ classes ≤ eligible).
- F. Migration idempotency (IF NOT EXISTS / duplicate_object / no DROP).

## 7. Verification Summary

| Check | Result |
|-------|--------|
| `npx prisma validate` (dummy env) | ✅ Valid |
| `npx prisma generate` | ✅ ProductEvent client generated |
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (5 changed/new files) | ✅ 0 violations |
| `npm run test:operational-baseline` | ✅ 27/27 |
| Production DB writes | **0** |
| Migration applied | **NO** (pending approval) |
| Protected zones | ✅ 0 diff |
| Commit/push | ⛔ **NO** — awaiting Founder review |

## 8. Files

- **New:** `lib/analytics/operational-classrooms.ts`, `lib/analytics/product-event-store.ts`, `prisma/migrations/manual/2026-09-08_product_event.sql`, `scripts/test-operational-baseline.ts`, `data/operational-teacher-baseline-t0-september-2026.json`, `docs/OPERATIONAL_TEACHER_BASELINE_T0_SEPTEMBER_2026.md`, `docs/OPERATIONAL_TEACHER_TELEMETRY_IMPLEMENTATION_SEPTEMBER_2026.md`
- **Changed:** `prisma/schema.prisma` (+ProductEvent model), `app/api/analytics/product-event/route.ts` (additive persist), `app/api/group/route.ts` (F4 hook), `app/api/guru/dashboard/route.ts` (F8 hook), `package.json` (+`test:operational-baseline`)

## 9. Remaining (unchanged)

1. Founder reviews this phase + approves ProductEvent migration → apply SQL in Supabase SQL Editor.
2. Live canonical recomputation of F2/F5/F6/F7/F8/F9 against production → NEW versioned baseline snapshot.
3. TKA UTBK/Guru enrichment 30 → 150.
4. Game server revival (VPS mati).
5. GameRoom migration SQL via Supabase dashboard.
6. UI game solo: badge-score client vs server masih beda (kosmetik).
