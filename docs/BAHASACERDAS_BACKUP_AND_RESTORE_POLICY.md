# BahasaCerdas Backup & Restore Policy

> **Phase:** Data Protection 1 — Backup Automation + Restore Policy  
> **Status:** Active  
> **Last Updated:** 2026-06-29  

---

## 1. Backup Strategy

### Frequency
| Backup Type | Frequency | Retention | Target |
|-------------|-----------|-----------|--------|
| **Daily** | Every 24h | 30 most recent | `backups/daily/` + Supabase Storage |
| **Current (on-demand)** | Manual (`npm run backup:current`) | Indefinite | `backups/current/` |
| **Pre-mutation** | Before any destructive operation | Manual cleanup | `backups/current/` |

### What Gets Backed Up
All 67 Prisma models are backed up, including:

**Content:** Artikel, Video, Karya, StudentKarya, StudentKaryaLike, StudentKaryaComment, Materi, RPP, GeneratedRPP  
**Exam/Question:** UKBIQuestion, TKAQuestion, PaketKompetensi, Soal, SoalSet, BankSoal, TestSession, TestAnswer, ProgresKompetensi  
**Learning:** LearningLevel, LearningUnit, UserUnitProgress, Penugasan, PenugasanSubmission  
**Social:** Community, CommunityMember, CommunityPost, Notifikasi, ChatMessage  
**Game:** GameRoom, GameQuestion, GameSession, GameResult  
**Finance:** Pembelian, PurchaseHistory, SellerEarning, Withdrawal, Subscription, Transaksi  
**AI:** AiSavedResult, AIUsage, AiCreditLedger, AIJob  
**User:** User, Profile (protected in restore)  
**Other:** Group, GroupMember, Quiz*, KoleksiKata, KamusEntry, Lomba*, Loker, Nilai*, Karya, CoursePlaylist  

### Backup Format
- Each table → separate JSON file
- **Manifest:** `manifest.json` with SHA256 checksum + row count per table
- Directory structure: `backups/{daily,current}/YYYY-MM-DD-HH-mm/`

---

## 2. Backup Locations

| Location | Type | Encryption | Access |
|----------|------|------------|--------|
| `backups/daily/` | Local filesystem | None (gitignored) | Server only |
| `backups/current/` | Local filesystem | None (gitignored) | Server only |
| `bahasacerdas-backups` bucket | Supabase Storage | Private bucket | Service role key |

### Supabase Storage Bucket: `bahasacerdas-backups`
- **Visibility:** Private (not public)
- **Access:** Requires `SUPABASE_SERVICE_ROLE_KEY`
- **Path:** `daily-{timestamp}/{table}.json`
- **Auto-upload:** Backup script attempts upload if `SUPABASE_SERVICE_ROLE_KEY` is set
- **Bucket creation:** Auto-created by backup script if missing

---

## 3. Restore Policy

### Restore Flow
1. Locate backup directory with `manifest.json`
2. Run `npm run validate:backup -- <path>` to verify integrity
3. Run `npm run restore:backup -- --manifest <path>/manifest.json` (dry-run by default)
4. Review the restore plan printed by dry-run
5. Run `npm run restore:backup -- --manifest <path>/manifest.json --execute`

### Restore Safety Rules
| Rule | Enforcement |
|------|-------------|
| Default dry-run | Script refuses to write without `--execute` |
| Manifest checksum verification | Restore aborts if any checksum is wrong |
| Protected tables (User, Profile) | Not restored unless explicitly added via `--tables User,Profile` |
| No accidental overwrite | Skips existing rows unless `--overwrite` is set |
| Table allowlist | `--tables Artikel,Video` to restore only specific tables |

### Restore Flags
```
--manifest <path>    Path to manifest.json (required)
--execute            Actually write data (default: dry-run)
--tables A,B,C       Restore only specific tables
--overwrite          Replace existing rows (default: skip duplicates)
```

### Protected Tables
`User` and `Profile` are protected by default. To restore them:
```
npm run restore:backup -- --manifest <path>/manifest.json --tables User,Profile --execute --overwrite
```

---

## 4. Automation

### Vercel Cron Job (Proposed)
A Vercel Cron Job can trigger the daily backup:
```json
// vercel.json (existing — add this section)
{
  "crons": [
    {
      "path": "/api/cron/backup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### API Route (Proposed)
```
POST /api/cron/backup
```
- Calls `scripts/backup-supabase-daily.ts` logic
- Authenticated via `CRON_SECRET` env var
- Logs success/failure
- Sends notification on failure

---

## 5. Recovery Scenarios

### Scenario A: Lost Artikel/Video/Karya (accidental delete)
```bash
npm run restore:backup -- --manifest backups/daily/2026-06-29-00-33/manifest.json --tables Artikel,Video,Karya --execute
```

### Scenario B: Lost UKBI/TKA questions
```bash
npm run restore:backup -- --manifest backups/daily/2026-06-29-00-33/manifest.json --tables UKBIQuestion,TKAQuestion,PaketKompetensi --execute --overwrite
npm run db:seed-kompetensi
```

### Scenario C: Full restore (disaster recovery)
```bash
# 1. Verify backup integrity
npm run validate:backup -- backups/daily/2026-06-29-00-33/

# 2. Review restore plan
npm run restore:backup -- --manifest backups/daily/2026-06-29-00-33/manifest.json

# 3. Execute (excluding protected tables)
npm run restore:backup -- --manifest backups/daily/2026-06-29-00-33/manifest.json --execute

# 4. Restore User/Profile separately if needed
npm run restore:backup -- --manifest backups/daily/2026-06-29-00-33/manifest.json --tables User,Profile --execute --overwrite
```

---

## 6. Validation

Run after every backup:
```bash
npm run validate:backup
```

This checks:
- ✅ Manifest exists and is valid JSON
- ✅ All referenced JSON files exist
- ✅ SHA256 checksums match manifest
- ✅ Row counts match manifest
- ✅ Reports tables with data

---

## 7. Security

| Concern | Mitigation |
|---------|------------|
| Backup file exposure | `backups/` in `.gitignore` — never committed |
| Storage bucket access | Private bucket, requires service role key |
| User data in terminal | Email masked in restore plan output |
| Manifest tampering | SHA256 checksums detect any modification |
| Accidental restore | Dry-run default, protected tables, require explicit flags |

---

## 8. Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run backup:daily` | Full daily backup to local + storage |
| `npm run backup:current` | On-demand backup to `backups/current/` |
| `npm run restore:backup` | Dry-run restore (add `--execute`) |
| `npm run validate:backup` | Check latest backup integrity |
| `npm run audit:content` | Content inventory audit |
| `npm run audit:question-data` | Question/exam data audit |

---

*This policy is enforced by scripts in `scripts/backup-supabase-daily.ts`, `scripts/restore-supabase-backup.ts`, and `scripts/validate-backup.ts`. Do not bypass these scripts for manual DB operations.*
