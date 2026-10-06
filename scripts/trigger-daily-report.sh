#!/usr/bin/env bash
# Trigger Daily 2-Report Flow (Traffic Analysis + Leads Summary)
BASE_URL="${REPORT_API_URL:-https://daily-report-api-tan.vercel.app/reports/daily}"

TARGET="$BASE_URL"
if [ "$1" == "--dry-run" ]; then
  TARGET="${BASE_URL}?dryRun=true"
elif [ "$1" == "--force" ]; then
  TARGET="${BASE_URL}?force=true"
fi

echo "Triggering Daily Reports: $TARGET"
curl -X POST "$TARGET" -H "Content-Type: application/json"
