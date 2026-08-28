#!/bin/bash
# Vercel Ignored Build Step
# Return 0 = SKIP build, Return 1 = PROCEED with build
#
# Setup: Vercel Dashboard → Project → Settings → Build & Development Settings
#   → Ignored Build Step: bash scripts/vercel-ignore-build.sh
#
# This skips builds for commits that only change docs, tests, audit scripts,
# or other non-production code — saving ~$5/month in Build CPU costs.
#
# Commits that DO trigger a build:
#   feat:, fix:, refactor:, perf:, hotfix:, or any message without a prefix
#
# Commits that SKIP the build:
#   docs:, test:, audit:, chore: (when touching only scripts/docs)

MSG="${VERCEL_GIT_COMMIT_MESSAGE:-}"

# Skip build for documentation-only commits
if echo "$MSG" | grep -qiE '^docs:'; then
  echo "⏭️  Skipping build — docs-only commit: $MSG"
  exit 0
fi

# Skip build for test-only commits (test scripts, not test fixes)
if echo "$MSG" | grep -qiE '^test:'; then
  echo "⏭️  Skipping build — test-only commit: $MSG"
  exit 0
fi

# Skip build for audit-only commits
if echo "$MSG" | grep -qiE '^audit:'; then
  echo "⏭️  Skipping build — audit-only commit: $MSG"
  exit 0
fi

# Proceed with build for everything else
echo "✅  Build proceeding — production-relevant commit: $MSG"
exit 1
