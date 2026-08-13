#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

required_files=(
  "AGENTS.md"
  "README.md"
  "agent/state/progress.md"
  "agent/state/feature_list.json"
  "agent/state/session-handoff.md"
  "agent/quality-document.md"
  "agent/clean-state-checklist.md"
  "evaluator-rubric.md"
  "project.config.js"
  "docs/ARCHITECTURE.md"
  "docs/PRODUCT.md"
  "docs/RELIABILITY.md"
)

for file in "${required_files[@]}"; do
  [ -f "$file" ] || {
    echo "Missing required file: $file" >&2
    exit 1
  }
done

python3 - <<'PY'
import json
from pathlib import Path

data = json.loads(Path("feature_list.json").read_text())
assert data["project"], "feature_list.json must define project"
assert any(f["id"] == "foundation-000" for f in data["features"]), "foundation-000 missing"
assert any(f["status"] == "passing" for f in data["features"]), "at least one passing feature expected in baseline"
print("feature_list.json OK")
PY

grep -q "window.PROJECT_CONFIG" "app.js"
grep -q "window.PROJECT_CONFIG" "project.config.js" || true

echo "Architecture check passed."
