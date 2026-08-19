#!/usr/bin/env bash
# Print a proposal page to PDF via headless Chrome for print-layout review.
# Orientation and page size come from the @page CSS under test — Chrome has no
# --landscape CLI switch (it silently ignores unknown flags).
#
# Usage: scripts/print-proposal-pdf.sh [--short] [--sheet] <proposal-id> [out.pdf] [base-url]
#   scripts/print-proposal-pdf.sh abc123 /tmp/proposal.pdf http://localhost:3000
#   --short prints the condensed variant (?print=short)
#   --sheet also runs scripts/print-fill-report.py: per-page content coverage
#           (background-independent) + a contact sheet next to the PDF
set -euo pipefail

QUERY=""
SUFFIX=""
SHEET=0
while [ "${1:-}" = "--short" ] || [ "${1:-}" = "--sheet" ]; do
  if [ "$1" = "--short" ]; then QUERY="?print=short"; SUFFIX="-short"; fi
  if [ "$1" = "--sheet" ]; then SHEET=1; fi
  shift
done

ID="${1:?usage: print-proposal-pdf.sh [--short] <proposal-id> [out.pdf] [base-url]}"
OUT="${2:-/tmp/proposal-$ID$SUFFIX.pdf}"
BASE="${3:-http://localhost:3000}"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || CHROME="$(command -v google-chrome || command -v chromium || true)"
[ -n "$CHROME" ] || { echo "Chrome not found" >&2; exit 1; }

"$CHROME" --headless --disable-gpu --no-pdf-header-footer \
  --virtual-time-budget=10000 \
  --print-to-pdf="$OUT" \
  "$BASE/proposal/$ID$QUERY"

echo "wrote $OUT"

if [ "$SHEET" = 1 ]; then
  python3 "$(dirname "$0")/print-fill-report.py" "$OUT" --sheet "${OUT%.pdf}-sheet.png" || true
fi
