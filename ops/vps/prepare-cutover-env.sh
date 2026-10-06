#!/usr/bin/env bash
set -euo pipefail

CONFIG_DIR="${BC_CONFIG_DIR:-/opt/bahasacerdas/config}"
WEB_ENV="$CONFIG_DIR/web.env"
STACK_ENV="$CONFIG_DIR/stack.env"

if [[ ! -f "$WEB_ENV" || ! -f "$STACK_ENV" ]]; then
  echo "Missing web.env or stack.env in $CONFIG_DIR" >&2
  exit 1
fi

python3 - "$WEB_ENV" "$STACK_ENV" <<'PY'
from pathlib import Path
import json
import sys
import time

web_path, stack_path = map(Path, sys.argv[1:3])

def update(path: Path, values: dict[str, str], quote: bool) -> None:
    lines = path.read_text().splitlines()
    out = []
    seen = set()
    for line in lines:
        key = line.split("=", 1)[0].strip() if "=" in line and not line.lstrip().startswith("#") else ""
        if key in values:
            value = json.dumps(values[key]) if quote else values[key]
            out.append(f"{key}={value}")
            seen.add(key)
        else:
            out.append(line)
    for key, raw in values.items():
        if key not in seen:
            value = json.dumps(raw) if quote else raw
            out.append(f"{key}={value}")
    path.write_text("\n".join(out) + "\n")

update(web_path, {
    "NEXT_PUBLIC_SITE_URL": "https://www.bahasacerdas.com",
    "NEXT_PUBLIC_GAME_SERVER_URL": "https://game.bahasacerdas.com",
    # Realtime remains gated until authenticated client handoff is deployed and tested.
    "NEXT_PUBLIC_MULTIPLAYER_ENABLED": "false",
}, quote=True)

update(stack_path, {
    "APEX_DOMAIN": "bahasacerdas.com",
    "WEB_DOMAIN": "www.bahasacerdas.com",
    "GAME_DOMAIN": "game.bahasacerdas.com",
    "TEST_WEB_DOMAIN": "vps.bahasacerdas.com",
    "TEST_GAME_DOMAIN": "game-vps.bahasacerdas.com",
    "CADDYFILE_PATH": "./Caddyfile.cutover",
    "GAME_ALLOWED_ORIGINS": "https://www.bahasacerdas.com,https://bahasacerdas.com,https://vps.bahasacerdas.com",
    "WEB_BUILD_FINGERPRINT": str(int(time.time())),
}, quote=False)
PY

chmod 600 "$WEB_ENV" "$STACK_ENV"

echo "Cutover configuration prepared."
echo "Production web: https://www.bahasacerdas.com"
echo "Production game: https://game.bahasacerdas.com"
echo "Test web retained: https://vps.bahasacerdas.com"
echo "Realtime multiplayer: disabled until authenticated-client test passes"
