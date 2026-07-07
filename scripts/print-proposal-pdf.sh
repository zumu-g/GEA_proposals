#!/usr/bin/env bash
# Print a proposal page to PDF via headless Chrome for print-layout review.
# Orientation and page size come from the @page CSS under test — Chrome has no
# --landscape CLI switch (it silently ignores unknown flags).
#
# Usage: scripts/print-proposal-pdf.sh <proposal-id> [out.pdf] [base-url]
#   scripts/print-proposal-pdf.sh abc123 /tmp/proposal.pdf http://localhost:3000
set -euo pipefail

ID="${1:?usage: print-proposal-pdf.sh <proposal-id> [out.pdf] [base-url]}"
OUT="${2:-/tmp/proposal-$ID.pdf}"
BASE="${3:-http://localhost:3000}"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || CHROME="$(command -v google-chrome || command -v chromium || true)"
[ -n "$CHROME" ] || { echo "Chrome not found" >&2; exit 1; }

"$CHROME" --headless --disable-gpu --no-pdf-header-footer \
  --virtual-time-budget=10000 \
  --print-to-pdf="$OUT" \
  "$BASE/proposal/$ID"

echo "wrote $OUT"
