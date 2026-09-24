#!/usr/bin/env bash
set -euo pipefail

URL="${1:-https://daily-report-api-tan.vercel.app/api/reports/daily}"
DRY_RUN="${2:-false}"

if [ "$DRY_RUN" = "true" ]; then
  TARGET="${URL}?dryRun=true"
else
  TARGET="$URL"
fi

echo "POST $TARGET"
curl -X POST "$TARGET"
