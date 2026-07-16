# Production Migration — Performance Indexes

## Safety Check

| Check | Status |
|-------|--------|
| `CREATE INDEX IF NOT EXISTS` | ✅ All 6 statements use `IF NOT EXISTS` |
| No `DROP` statements | ✅ None |
| No destructive `ALTER` | ✅ None |
| No `DELETE` or `TRUNCATE` | ✅ None |
| Only adds indexes | ✅ Confirmed |

**Verdict: Safe to run multiple times.** Zero destructive operations.

## Indexes Being Added

| # | Index | Table | Columns | Why |
|---|-------|-------|---------|-----|
| 1 | `ProgresKompetensi_userId_status_idx` | `ProgresKompetensi` | `userId`, `status` | Filters user's progress history by status (e.g. active vs completed). Used by student dashboard and gradebook queries. |
| 2 | `TestSession_userId_status_idx` | `TestSession` | `userId`, `status` | Lists active/past test sessions per user. Core to UKBI/TKA test resume flow. |
| 3 | `TestSession_paketId_status_idx` | `TestSession` | `paketId`, `status` | Counts active sessions per package. Used by teacher monitoring and package management. |
| 4 | `StudentKarya_type_createdAt_idx` | `StudentKarya` | `type`, `createdAt` | Browses karya by type sorted by newest. Powers the social feed and portfolio pages. |
| 5 | `StudentKaryaComment_karyaId_createdAt_idx` | `StudentKaryaComment` | `karyaId`, `createdAt` | Retrieves comments for a karya in chronological order. Used by student karya detail page. |
| 6 | `PenugasanSubmission_status_idx` | `PenugasanSubmission` | `status` | Filters assignments by completion status. Used by teacher gradebook and student task list. |

## Estimated Impact

- **Table sizes**: The indexed tables are among the highest-query-volume tables.
- **Write overhead**: Indexes are on columns that change infrequently (status changes, createdAt inserts). Minimal write penalty.
- **Read speedup**: Expected 10-100x improvement on the filtered queries above.

## Deploy Command

```bash
psql "$DIRECT_URL" -f prisma/migrations/20260715_add_performance_indexes/migration.sql
```

Where `DIRECT_URL` is the Supabase direct connection string (port 5432) stored in environment variables.

## Verification

Run this query to confirm indexes exist:

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('TestSession', 'ProgresKompetensi', 'StudentKarya', 'StudentKaryaComment', 'PenugasanSubmission')
ORDER BY tablename, indexname;
```

Expected output: 6 rows, one per index.

## Rollback

If rollback is needed, run:

```sql
DROP INDEX IF EXISTS "ProgresKompetensi_userId_status_idx";
DROP INDEX IF EXISTS "TestSession_userId_status_idx";
DROP INDEX IF EXISTS "TestSession_paketId_status_idx";
DROP INDEX IF EXISTS "StudentKarya_type_createdAt_idx";
DROP INDEX IF EXISTS "StudentKaryaComment_karyaId_createdAt_idx";
DROP INDEX IF EXISTS "PenugasanSubmission_status_idx";
```

> ⚠️ **Warning**: Rollback will impact query performance on large tables. Only rollback if the indexes cause measurable write degradation (>5% slower writes on indexed tables). Test on staging first.
