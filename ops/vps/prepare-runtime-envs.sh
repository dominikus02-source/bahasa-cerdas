#!/usr/bin/env bash
set -euo pipefail

CONFIG_DIR="${BC_CONFIG_DIR:-/opt/bahasacerdas/config}"
WEB_ENV="$CONFIG_DIR/web.env"
GAME_ENV="$CONFIG_DIR/game.env"
WORKER_ENV="$CONFIG_DIR/worker.env"

if [[ ! -f "$WEB_ENV" ]]; then
  echo "Missing $WEB_ENV" >&2
  exit 1
fi

python3 - "$WEB_ENV" "$GAME_ENV" "$WORKER_ENV" <<'PY'
from pathlib import Path
import sys

web_path, game_path, worker_path = map(Path, sys.argv[1:4])
lines = web_path.read_text().splitlines()

def key_of(line: str) -> str:
    if "=" not in line or line.lstrip().startswith("#"):
        return ""
    return line.split("=", 1)[0].strip()

game_keys = {
    "DATABASE_URL",
    "DIRECT_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
}
game = [line for line in lines if key_of(line) in game_keys]

present = {key_of(line) for line in game}
missing_db = {"DATABASE_URL", "DIRECT_URL"} - present
if missing_db:
    raise SystemExit("Missing game database env: " + ", ".join(sorted(missing_db)))
if "NEXT_PUBLIC_SUPABASE_URL" not in present:
    raise SystemExit("Missing NEXT_PUBLIC_SUPABASE_URL for game auth")
if not ({"NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"} & present):
    raise SystemExit("Missing Supabase publishable/anon key for game auth")

game_path.write_text("\n".join(game) + "\n")

# The worker uses the same DB and BC AI provider configuration as the web tier.
# Keep a separate file so it can be narrowed later without changing web runtime.
worker_path.write_text("\n".join(lines) + "\n")
PY

chmod 600 "$GAME_ENV" "$WORKER_ENV"

echo "Prepared:"
echo "  $GAME_ENV"
echo "  $WORKER_ENV"
