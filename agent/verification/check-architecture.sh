#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

required_files=(
  "agent/docs/architecture.md"
  "agent/docs/product.md"
  "agent/docs/reliability.md"
  "agent/state/clean-state-checklist.md"
  "agent/state/feature_list.json"
  "agent/state/progress.md"
  "agent/state/session-handoff.md"
  'agent/templates/state/logs/session-log-${id}.md'
  "agent/templates/state/clean-state-checklist.md"
  "agent/templates/state/feature_list.json"
  "agent/templates/state/progress.md"
  "agent/templates/state/session-handoff.md"
  "AGENTS.md"
  "README.md"
)

for file in "${required_files[@]}"; do
  [ -f "$file" ] || {
    echo "Missing required file: $file" >&2
    exit 1
  }
done

if command -v jq >/dev/null 2>&1; then
  while IFS= read -r fid; do
    [ -n "$fid" ] || continue
    fpath="agent/docs/features/${fid}.md"
    [ -f "$fpath" ] || {
      echo "Missing feature doc for ${fid}: ${fpath}" >&2
      exit 1
    }
  done < <(jq -r '.features[].id' agent/state/feature_list.json)
else
  echo "Warning: jq not installed; skipping feature<->doc consistency check" >&2
fi
