#!/usr/bin/env bash
# One-shot setup. Run this once you have Supabase CLI (or `npx supabase`) available.
# Reads secrets from supabase/.env — that file is gitignored, never committed.

set -euo pipefail
cd "$(dirname "$0")"

if ! [ -f supabase/.env ]; then
  echo "supabase/.env missing — populate it before running setup.sh"
  exit 1
fi

# Pick the supabase command — global install OR npx (no install needed).
if command -v supabase >/dev/null 2>&1; then
  SB="supabase"
else
  echo "↪ Using 'npx supabase' (no global install needed)."
  SB="npx --yes supabase"
fi

# Load secrets from supabase/.env
set -a
. supabase/.env
set +a

echo "=== 1/4  Linking project ==="
$SB link --project-ref "$SUPABASE_PROJECT_REF"

echo ""
echo "=== 2/4  Pushing schema ==="
$SB db push

echo ""
echo "=== 3/4  Setting function secrets ==="
$SB secrets set \
  FINNHUB_KEY="$FINNHUB_KEY" \
  MARKETAUX_KEY="$MARKETAUX_KEY" \
  GEMINI_KEY="$GEMINI_KEY" \
  RESEND_KEY="$RESEND_KEY" \
  RESEND_FROM="$RESEND_FROM" \
  APP_DEEP_LINK_BASE="$APP_DEEP_LINK_BASE"

echo ""
echo "=== 4/4  Deploying edge functions ==="
$SB functions deploy fetch-news build-daily-digest push-digest breaking-news-watcher

echo ""
echo "✓ Done."
echo ""
echo "Next:"
echo "  1) Open Supabase Dashboard → SQL Editor → paste supabase/cron_ready.sql → Run."
echo "  2) Same SQL Editor → paste supabase/init_user.sql → Run."
echo "  3) Trigger a test: curl -X POST -H \"Authorization: Bearer \$SUPABASE_SERVICE_ROLE_KEY\" \\"
echo "        https://\$SUPABASE_PROJECT_REF.functions.supabase.co/fetch-news"
