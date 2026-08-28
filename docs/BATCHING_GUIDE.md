# Deployment Batching Strategy

## Problem

Every `git push` to `main` triggers a Vercel production build.
With ~14 pushes/day, this generates ~$25/month in Build CPU costs.

## Solution

**Batch related commits before pushing to production.**

### Rule

Before running `git push origin main`, check:

> "Can these 2-3 small changes be ONE push?"

If yes, batch them.

### Example

**Before (3 builds, ~$0.17):**
```
commit "fix: back button color"
git push  → build #1

commit "fix: back button hover"
git push  → build #2

commit "docs: update audit report"
git push  → build #3
```

**After (1 build, ~$0.05):**
```
commit "fix: back button visibility"
commit "docs: update audit report"
git push  → build #1 (single build for 2 commits)
```

### What to batch

- Small fixes in the same feature area
- Follow-up fixes to a recent change
- Documentation alongside the code it documents
- Multiple related `chore:` or `refactor:` commits

### What NOT to batch

- Unrelated changes (different features, different files)
- Urgent hotfixes (push immediately)
- Changes that need immediate production verification

### Vercel Ignored Build Step

A build-skip script is installed at `scripts/vercel-ignore-build.sh`.
It automatically skips builds for `docs:`, `test:`, and `audit:` commits.

**Setup required in Vercel Dashboard:**
1. Go to Project → Settings → Build & Development Settings
2. Find "Ignored Build Step"
3. Enter: `bash scripts/vercel-ignore-build.sh`
4. Save

### Expected savings

| Strategy | Builds/day | Monthly cost | Savings |
|----------|-----------|-------------|---------|
| Current (no batching) | 14 | $24.95 | — |
| Moderate batching | 8 | $14.26 | $10.69/mo |
| Aggressive batching | 5 | $8.91 | $16.04/mo |
| + Ignore docs/test commits | 3-4 | $5.35-7.13 | $17.82-19.60/mo |

### Cost per build

```
Enhanced machine: $0.028/min
Average build:    1.73 min
Cost per build:   ~$0.048
```
