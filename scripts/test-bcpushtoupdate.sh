#!/usr/bin/env bash
# Offline, zero-production regression tests for bcpushtoupdate.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT/ops/vps/bcpushtoupdate.sh"
bash -n "$SCRIPT"
python3 - "$SCRIPT" <<'PY'
from pathlib import Path
import sys
s=Path(sys.argv[1]).read_text()
checks={
 "dry-run default": 'MODE="${1:---check}"',
 "explicit apply": '"--apply"',
 "approved exact SHA": 'BC_APPROVED_SHA',
 "green CI": 'workflow_runs',
 "stable image": '/rollback/stable',
 "backup before migration": ('pg_dump', 'prisma","migrate","deploy'),
 "restore listing": 'pg_restore',
 "forward-only checkout": 'pull --ff-only',
 "no automatic DB rollback": 'database migrations may be incompatible',
 "JUMPA health": '/api/jumpa/health',
}
for name,needle in checks.items():
    if isinstance(needle,tuple):
        assert s.index(needle[0])<s.index(needle[1]),name
    else: assert needle in s,name
    print("PASS",name)
assert "bcrollback || true" not in s, "Automatic rollback forbidden after migration"
print("PASS no automatic rollback after migration")
PY
