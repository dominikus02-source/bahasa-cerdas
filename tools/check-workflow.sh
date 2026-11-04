#!/usr/bin/env bash
set -euo pipefail
# Check GitHub Actions expressions as well as YAML syntax.
# Pin the official release and verify its SHA-256 before execution.
[[ "$(uname -s)" == Linux && "$(uname -m)" == x86_64 ]] || {
  echo "This workflow validator requires Linux x86_64" >&2
  exit 1
}
tool_dir="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/bc-actionlint-1.7.12"
mkdir -p "$tool_dir"
curl --fail --location --silent --show-error \
  https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_linux_amd64.tar.gz \
  --output "$tool_dir/actionlint.tar.gz"
printf '%s  %s\n' 8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8 "$tool_dir/actionlint.tar.gz" | sha256sum --check --status
tar -xzf "$tool_dir/actionlint.tar.gz" -C "$tool_dir" actionlint
"$tool_dir/actionlint" -shellcheck= -pyflakes= .github/workflows/ci.yml
