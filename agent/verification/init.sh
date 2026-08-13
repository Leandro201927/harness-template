#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Setup phase
INSTALL_CMD=(npm install)

echo "==> Working directory: $PWD"
echo "==> Syncing dependencies"
"${INSTALL_CMD[@]}"

# Verification phase
echo "==> Running end-to-end verification"
bash scripts/e2e-check.sh

echo "==> Running architecture verification"
bash scripts/check-architecture.sh

# Startup phase
# RUN_START_COMMAND=1
START_CMD=(npm run dev)

echo "==> Startup command"
printf '    %q' "${START_CMD[@]}"
printf '\n'

if [ "${RUN_START_COMMAND:-0}" = "1" ]; then
  echo "==> Starting the app"
  exec "${START_CMD[@]}"
fi

echo "Set RUN_START_COMMAND=1 if you want init.sh to launch the app directly."
