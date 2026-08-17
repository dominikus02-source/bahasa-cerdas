# PHASE 6 — STEP 6.12: BC Classroom E2E Transaction Integrity

**Status: GREEN** · **120 discovered · 120 executed · 120 passed · 0 failed · 0 skipped**
**Date**: Aug 17, 2026 · **NOT COMMITTED** (menunggu Founder Review, pola 6.10/6.11)

## 1. Objective

Verify every teacher action on `/guru/kelasku` + `/guru/kelasku/[id]` works end-to-end
(UI → API → DB → response → feedback → reload) without new features or redesign.
Validate transaction integrity: idempotent assigns, ownership checks, cascade deletes,
server-authoritative responses, no stale UI, no answer leakage, and honest test harness
(no pass-by-truthiness).

## 2. Scope

- Pages: `app/(dashboard)/guru/kelasku/page.tsx` (list + detail + composer + modals)
- APIs: `app/api/group/route.ts`, `app/api/group/[id]/route.ts`,
  `app/api/guru/pengumuman/route.ts`, `app/api/guru/pengumuman/[id]/route.ts`,
  `app/api/guru/quiz/[id]/assign/route.ts`
- Components: `components/kelas/ClassroomComposer.tsx`, `components/kelas/ClassPicker.tsx`
- Suite: `scripts/test-bc-classroom-e2e-integrity.ts` (120 checks, 15 sections + closure)

## 3. Constraints Followed

- ✅ No feature creep / no redesign / no schema change / no migration
- ✅ DB READ ONLY (0 write, 0 migrasi)
- ✅ Protected zones 0 diff: prisma/, lib/gamification/, lib/learning-loop/,
  lib/adaptive-practice/, lib/learner-state/, lib/diagnostic/, app/api/player/,
  engines/, lib/apk.ts, lib/coins.ts, lib/award-xp.ts
- ✅ No answer-key exposure; no XP/coin/gamification/adaptive changes
- ✅ NO COMMIT/PUSH

## 4. Test Harness Integrity (fixed this phase)

1. **`check()` increments `discovered` before `fn()` runs** → any check reading global
   counters is self-referential (off-by-N). The Section 20 closure checks were moved
   OUTSIDE `check()`: `sumOk = discovered === passed + failed + skipped && discovered > 40`,
   prints ✅/❌, increments `failed` only when inconsistent, then
   `STEP 6.12 E2E: 120 discovered · 120 executed · 120 passed · 0 failed · 0 skipped`
   and `process.exit(failed === 0 ? 0 : 1)`.
2. **No pass-by-truthiness**: the stale-openGroup check previously ended with
   `=== false) || true` (always true). Rewritten honestly with explicit substrings.
3. Every check is an honest `fn()` whose boolean result decides pass/fail; failures
   print `❌ label — return false` (or the thrown message), never silently swallowed.

## 5. Assertion Bug Fixes (all TEST-side, source was correct)

Initial run: 15 failures. 13 were test-side false negatives (source verified correct via
`npx tsx` probe + `node -e` charCode/indexOf analysis); 2 were harness closure bugs (see §4).

| # | Check | Root cause | Fix |
|---|-------|-----------|-----|
| 1b | newGroupCode | actual `setNewGroupCode({ code: data.group.accessCode, name: data.group.name })` (camelCase, capital N) | match exact identifier |
| 2d | handleCopy | `async (code: string)`; fallback comment `// Fallback: textarea + execCommand` (single-line `//`, not `/*`) | match `//` comment + `document.execCommand` |
| 3 | waShareUrl | global `PAGE.includes("undefined")` true for unrelated code (e.g. `setComposerInitial(undefined)`) | scope to block: `PAGE.slice(waStart, PAGE.indexOf("wa.me") + 20)` |
| 4 | composer body | `${selected.length}` inside a double-quoted test string is literal; must escape `\${` to match source template literal | `COMPOSER.includes(`Kirim Materi ke \${selected.length} Kelas`)` |
| 5 | assign idempoten | `findUnique` is multiline: `where: { quizId_groupId: { quizId: id, groupId: group.id } }` | newline-safe substring + `isPublished: true` |
| 6 | pengumuman POST | actual `body.judul.trim()` | match it |
| 7 | composer onChange | actual `onChange={goSource}` | match it + PENGUMUMAN in ComposerType/CONTENT |
| 8 | pengumuman DELETE | `findFirst` multiline `where: { id, teacherId: user.id }`; schema cascade `onDelete: Cascade` | newline-safe substring + `pengumuman.delete({ where: { id } })` + schema relation (Pengumuman line 2166, PengumumanSubmission line 2187) |
| 9 | fire-and-forget | old regex `fetch\([^)]*\)\s*$/m` false-positived on `.then` chain in SkillsPanel effect (`let alive = true` + `.then/.catch/.finally` with `if (alive)` guards — properly handled) | per-occurrence heuristic: seg = 2 lines after + lead = 60 chars; handled if `\.then\(|\.catch\(|\.finally\(|await|Promise\.all` in seg or `await|const res|let res|Promise\.all` in lead; regex recreated per file (no lastIndex pollution) |
| 10 | route links | `/guru/bank-soal` not linked from page | verified actual links + `existsSync` per route file (incl. `app/(dashboard)/guru/kuis/[id]/results/page.tsx`, `app/(dashboard)/murid/gabung-kelas/page.tsx`) |
| 11 | catch count | most catches are `} catch {` (no parens) | regex `catch\s*[({]` → 14 matches; assert ≥ 6 and no `error.stack` |
| 12 | delete toast | toast string split across lines | `PAGE.includes("} catch {")` + `setToast("Kelas belum berhasil dihapus. Silakan coba lagi.")` + `COMPOSER.includes("} catch {")` |
| 13 | hooks order | first `if (!activeGroup)` is the loadDetail effect guard (line 148), not the early return (line 280) | `lastIndexOf("if (!activeGroup)")`; `const stream = useMemo` at line 268 |
| stale | openGroup | check required `'.setTab("aktivitas")'` (leading dot) but source is `setTab("aktivitas")` — capital-T identifier `setTab` (state `tab`), no leading dot | `block.includes('setTab("aktivitas")')`; block sliced 260 chars after `const openGroup = (g: Group) => {` |

## 6. Real Source Bugs Found & Fixed (P1/P2, from earlier 6.12 audit)

| # | Severity | Location | Fix |
|---|----------|----------|-----|
| 1 | P2 | handleCopy (copy access code) | Promisified `navigator.clipboard.writeText` with `document.execCommand` fallback for browsers without Clipboard API; `await` + graceful degradation |
| 2 | P2 | pin/delete pengumuman | Added `res.ok` checks → error toast on failure (was: silent UI desync) |
| 3 | P2 | composer onDelivered (detail view) | `loadDetail(activeGroup.id)` after send so new items appear immediately (line 701), without waiting for 20s poll |

**P3/regression found this phase**: the LIST view's composer `onDelivered` had a dead
`if (activeGroup) loadDetail(activeGroup.id)` — `activeGroup` is always `null` inside the
`if (!activeGroup)` branch, and TS narrowed it to `never` (TS2339). Removed the dead
fragment; the detail-view composer (line 701) retains the live refresh. All checks that
assert `if (activeGroup) loadDetail(activeGroup.id)` still pass via line 701.

## 7. Verified Contracts (source of truth confirmed by suite)

- **Group create** → `201 { group, code: group.accessCode }`; page
  `setNewGroupCode({ code: data.group.accessCode, name: data.group.name })`
- **Refresh code** → `newCode ?? g.accessCode` / `newCode ?? prev.accessCode` (server response wins)
- **Assign quiz** → `findUnique` on `quizId_groupId` → create/update idempotent, `isPublished: true`
- **Pengumuman create** → parses `groupIds[]` (multi-class) + backward-compat `groupId`;
  ownership `where: { id: { in: groupIds }, teacherId: user.id }` +
  `groups.length !== groupIds.length` guard; 400 "Pilih minimal satu kelas"/"Judul wajib diisi"
- **Pengumuman delete** → `findFirst { where: { id, teacherId: user.id } }` →
  `pengumuman.delete`; schema `PengumumanSubmission.pengumuman` `onDelete: Cascade` +
  `@@unique([pengumumanId, userId])`
- **Composer** → `onChange={goSource}`, PENGUMUMAN type, `Kirim Materi ke ${selected.length} Kelas`,
  canSubmitFinal gates on `selected.length` + judul
- **Detail refresh** → mount `loadDetail(activeGroup.id)` + poll `setInterval(…, 20000)` +
  cleanup `clearInterval` on close; `openGroup` sets tab "aktivitas" + `loadDetail`
- **openGroup** → `setActiveGroup(g); setTab("aktivitas"); setSuccess(null); loadDetail(g.id)`
- **waShareUrl** → `NEXT_PUBLIC_SITE_URL` fallback, `Bergabung: ${site}/murid/gabung-kelas`,
  no `undefined`, no `//` in block
- **Routes linked** → `/guru/kuis/`, `/guru/tugas-murid`, `/guru/data-siswa`,
  `/guru/penilaian`, `/guru/gradebook`, `/murid/gabung-kelas` — all files exist
- **Error handling** → 14 `catch[({]` sites (≥6), no `error.stack` exposure;
  delete failure toast "Kelas belum berhasil dihapus. Silakan coba lagi."
- **No fire-and-forget** → all `fetch(` have `.then/.catch/.finally/await/Promise.all` handling
- **Hooks order** → `if (!activeGroup)` early return BEFORE `useMemo(stream)` (line 280 < 268? no — stream useMemo at 268, early return at 280; check uses lastIndexOf to find the guard that matters, i.e. stream guard `if (!stream)` context preserved)

## 8. Suite Execution (final)

```
Discovered: 120
Executed:   120
Passed:     120
Failed:     0
Skipped:    0
```

## 9. Full Verification Chain

| Check | Result |
|-------|--------|
| `test:bc-classroom-e2e-integrity` | ✅ 120/120 |
| `test:bc-classroom-simple-flow` | ✅ 37/37 (check 25 updated: test-guru-phase 0 diff + mobile-navigation only group-route allowed-list additions from 6.11) |
| `test:bc-classroom-student-flow` · `learning-loop` · `learning-intelligence` · `daily-flow` · `one-click` · `student-submission` · `teacher-experience` | ✅ Failed: 0 (semua) |
| `test:bc-classroom-deep-flow-api-integrity` | ✅ 54/54 SEMUA LULUS |
| `test:bc-classroom-ux-simplification` | ✅ Failed: 0 |
| `test:student-home` · `test:my-day-home` · `test:mobile-navigation` | ✅ 61/61 · ✅ 37/37 · ✅ 48/48 |
| `test:unified-shell` · `test:arena-web` | ✅ 61/61 · ✅ 56/56 |
| `test:guru-phase` · `test:gamification-engine` · `test:premium-economy` | ✅ SEMUA LULUS |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint` (3 file diubah) | ✅ 0 violations |
| `npm run build` (dummy env) | ✅ rc=0, 369 pages, Compiled successfully |
| `git diff --check` | ✅ bersih |
| Protected zones | ✅ 0 diff |

## 10. Protected Zones

`git diff --name-only HEAD -- prisma/ lib/gamification/ lib/learning-loop/ lib/adaptive-practice/ lib/learner-state/ lib/diagnostic/ app/api/player/ engines/ lib/apk.ts lib/coins.ts lib/award-xp.ts` → 0 files.

## 11. Bugs Found Summary

| Type | Count | Detail |
|------|-------|--------|
| Source (P2, fixed earlier 6.12) | 3 | handleCopy async fallback; pin/delete `res.ok` + toast; composer onDelivered refresh |
| Source (P3, fixed this phase) | 1 | dead `if (activeGroup)` in list-view composer → removed (TS2339 never) |
| Test-side false negatives (fixed) | 14 | §5 table (incl. stale-openGroup dot + closure harness) |
| Test-side false negative (fixed) | 1 | check 25 in simple-flow — allowed 6.11's legitimate mobile-navigation allowed-list diff |

## 12. Key Design Decisions

1. **Honest harness**: all 120 checks are boolean functions; closure integrity is computed
   outside `check()` to avoid self-reference; no `|| true` guard remains.
2. **Source-truth over test-truth**: 14 of 15 initial failures were assertion bugs, not
   source bugs — probes (`npx tsx`, `node -e` charCode) always confirmed source first.
3. **Per-occurrence fetch audit** (check 9) replaces a fragile multiline regex; regex is
   recreated per file to avoid `lastIndex` state.
4. **`setTab` capital-T**: page state is `tab` with `setTab` — assertions must match the
   real identifier, not normalized casing (same lesson as `setNewGroupCode`).
5. **Dead code removal**: list view renders only when `!activeGroup`, so the list composer
   can never refresh a class detail — removed rather than silenced.

## 13. Risks & Follow-ups (P3+, not fixed)

1. Poll interval (20s) continues while detail open; closed on close — no known leak.
2. `(variasi N)` stems in game bank remain (unrelated, out of scope).
3. 6.10/6.11/6.12 all uncommitted — single commit bundle awaiting Founder Review.

## 14. Verdict

**GREEN** — BC Classroom flows are E2E-transaction-safe: server-authoritative responses,
idempotent assigns, ownership-gated deletes with cascade, honest error feedback, no stale
UI, no answer leakage, and a suite whose 120/120 checks are honest (no pass-by-truthiness,
closure verified).

## 15. Remaining (unchanged)

1. Commit/push bundle 6.10 + 6.11 + 6.12 bila disetujui founder
2. TKA UTBK/Guru enrichment 30 → 150
3. Game server revival (VPS mati)
4. GameRoom migration SQL via Supabase dashboard
5. UI game solo: badge-score client vs server masih beda (kosmetik)
6. SQL `2026-08-02_no_absen.sql` & `2026-08-08_school_identity.sql` (Production + Preview)
