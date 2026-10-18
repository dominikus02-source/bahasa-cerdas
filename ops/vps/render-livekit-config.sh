#!/usr/bin/env bash
# JUMPA — render konfigurasi LiveKit ke ${BC_CONFIG_DIR}/livekit.yaml dari
# template ops/vps/livekit.yaml. Idempoten; tidak menulis rahasia apa pun
# (hanya NAMA kunci API untuk webhook). Dipanggil oleh prepare-runtime-envs.sh
# dan jumpa-turn-cert-sync.sh.
#
# Masukan (semua opsional):
#   web.env   : LIVEKIT_API_KEY             → blok webhook
#   stack.env : JUMPA_WEBHOOK_URL           (default http://web:3000/api/jumpa/webhook)
#               JUMPA_TURN_ENABLED=1        → blok TURN/TLS (butuh sertifikat)
#               JUMPA_TURN_DOMAIN           (default turn.bahasacerdas.com)
#               JUMPA_TURN_TLS_PORT         (default 5349)
#               JUMPA_TURN_UDP_PORT         (default 3478)
#               JUMPA_TURN_RELAY_START/END  (default 30000/30100)
#   ${BC_CONFIG_DIR}/livekit-turn/tls.crt + tls.key (dari jumpa-turn-cert-sync.sh)
#
# Keluaran stdout: "livekit.yaml: updated" / "livekit.yaml: unchanged".
set -euo pipefail

CONFIG_DIR="${BC_CONFIG_DIR:-/opt/bahasacerdas/config}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="${LIVEKIT_TEMPLATE:-$SCRIPT_DIR/livekit.yaml}"
OUT="$CONFIG_DIR/livekit.yaml"

[[ -f "$TEMPLATE" ]] || { echo "Template tidak ada: $TEMPLATE" >&2; exit 1; }
install -d -m 755 "$CONFIG_DIR"

python3 - "$TEMPLATE" "$OUT" "$CONFIG_DIR/web.env" "$CONFIG_DIR/stack.env" "$CONFIG_DIR/livekit-turn" <<'PY'
import os, re, sys
from pathlib import Path

template, out, web_env, stack_env, turn_dir = sys.argv[1:6]

def env_file(path):
    vals = {}
    try:
        for line in Path(path).read_text().splitlines():
            s = line.strip()
            if not s or s.startswith("#") or "=" not in s:
                continue
            k, v = s.split("=", 1)
            v = v.strip()
            if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
                v = v[1:-1]
            vals[k.strip()] = v
    except FileNotFoundError:
        pass
    return vals

web, stack = env_file(web_env), env_file(stack_env)
text = Path(template).read_text()
# Nama kunci aman ditulis; tetap tolak karakter aneh agar YAML tidak rusak.
api_key = web.get("LIVEKIT_API_KEY", "")
if api_key and not re.fullmatch(r"[A-Za-z0-9_-]{3,128}", api_key):
    raise SystemExit("LIVEKIT_API_KEY berisi karakter tak terduga — tidak dirender.")

def safe_url(u):
    return bool(re.fullmatch(r"https?://[A-Za-z0-9.:_/-]+", u))

def safe_host(h):
    return bool(re.fullmatch(r"[a-z0-9.-]{3,253}", h))

def port(name, default):
    v = stack.get(name, str(default)) or str(default)
    if not v.isdigit() or not (1 <= int(v) <= 65535):
        raise SystemExit(f"{name} tidak valid: {v}")
    return int(v)

extra = []
if api_key:
    url = stack.get("JUMPA_WEBHOOK_URL") or "http://web:3000/api/jumpa/webhook"
    if not safe_url(url):
        raise SystemExit("JUMPA_WEBHOOK_URL tidak valid")
    extra.append(
        "\n# Fase 2 — webhook kehadiran (ditandatangani dengan LIVEKIT_API_KEY ini).\n"
        "webhook:\n"
        f"  api_key: {api_key}\n"
        "  urls:\n"
        f"    - {url}\n"
    )

turn_on = stack.get("JUMPA_TURN_ENABLED", "0").lower() in ("1", "true", "yes")
crt, key = os.path.join(turn_dir, "tls.crt"), os.path.join(turn_dir, "tls.key")
if turn_on:
    domain = stack.get("JUMPA_TURN_DOMAIN") or "turn.bahasacerdas.com"
    if not safe_host(domain):
        raise SystemExit("JUMPA_TURN_DOMAIN tidak valid")
    if os.path.isfile(crt) and os.path.isfile(key):
        tls_port, udp_port = port("JUMPA_TURN_TLS_PORT", 5349), port("JUMPA_TURN_UDP_PORT", 3478)
        r0, r1 = port("JUMPA_TURN_RELAY_START", 30000), port("JUMPA_TURN_RELAY_END", 30100)
        if r1 < r0:
            raise SystemExit("JUMPA_TURN_RELAY_END < JUMPA_TURN_RELAY_START")
        block = (
            "# Fase 2 — TURN bawaan LiveKit (dirender; JUMPA_TURN_ENABLED=1).\n"
            "turn:\n"
            "  enabled: true\n"
            f"  domain: {domain}\n"
            f"  tls_port: {tls_port}\n"
            f"  udp_port: {udp_port}\n"
            "  cert_file: /etc/livekit-turn/tls.crt\n"
            "  key_file: /etc/livekit-turn/tls.key\n"
            f"  relay_range_start: {r0}\n"
            f"  relay_range_end: {r1}"
        )
        new, n = re.subn(r"(?m)^turn:\n  enabled: false$", block, text)
        if n != 1:
            raise SystemExit("Blok 'turn: enabled: false' tidak ditemukan di template")
        text = new
    else:
        print(f"PERINGATAN: JUMPA_TURN_ENABLED=1 tapi sertifikat belum ada di {turn_dir} — TURN belum dinyalakan.", file=sys.stderr)

rendered = (
    "# DIRENDER OTOMATIS oleh ops/vps/render-livekit-config.sh — jangan diedit.\n"
    "# Ubah template ops/vps/livekit.yaml atau variabel JUMPA_* di stack.env.\n"
    + text.rstrip("\n") + "\n" + "".join(extra)
)
old = Path(out).read_text() if os.path.isfile(out) else None
if old == rendered:
    print("livekit.yaml: unchanged")
else:
    tmp = out + ".tmp"
    Path(tmp).write_text(rendered)
    os.chmod(tmp, 0o644)
    os.replace(tmp, out)
    print("livekit.yaml: updated")
PY
