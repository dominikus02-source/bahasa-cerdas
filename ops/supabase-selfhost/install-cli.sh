#!/usr/bin/env bash
set -euo pipefail

VERSION="${SUPABASE_CLI_VERSION:-2.119.0}"
DEST_DIR="${DEST_DIR:-/opt/bahasacerdas/bin}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

case "$(uname -m)" in
  x86_64|amd64)
    asset="supabase_${VERSION}_linux_amd64.tar.gz"
    expected="bf1c3ae93be98533eb8a3105dbf4564bd0b2d9dc24690d8a920f980ef975c1b4"
    ;;
  aarch64|arm64)
    asset="supabase_${VERSION}_linux_arm64.tar.gz"
    expected="3f552f0a3af30fe577c2820df09506a0e1233256441246b0850ed60806ff319d"
    ;;
  *)
    echo "Unsupported architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

url="https://github.com/supabase/cli/releases/download/v${VERSION}/${asset}"
curl -fsSL "$url" -o "$TMP_DIR/supabase.tar.gz"
actual="$(sha256sum "$TMP_DIR/supabase.tar.gz" | awk '{print $1}')"
if [[ "$actual" != "$expected" ]]; then
  echo "Supabase CLI checksum mismatch" >&2
  exit 1
fi

mkdir -p "$DEST_DIR"
tar -xzf "$TMP_DIR/supabase.tar.gz" -C "$TMP_DIR"
install -m 0755 "$TMP_DIR/supabase" "$DEST_DIR/supabase"
"$DEST_DIR/supabase" --version
