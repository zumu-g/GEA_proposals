#!/usr/bin/env python3
"""Per-page content-coverage report for a printed proposal PDF.

Usage: scripts/print-fill-report.py <file.pdf> [--sheet out.png] [--min 35]

Rasterises each page (pdftoppm, 50 dpi) and reports what share of the page's
body height carries content. "Content" is measured against each page's dominant
colour so a full-page tinted background does not read as filled: a pixel row
counts when > 5% of its pixels differ from the page mode by more than ΔL 25
(greyscale). Non-cover pages under --min % are flagged. Optionally writes a
contact sheet. Requires poppler (pdftoppm) and Pillow.
"""
import argparse, glob, os, subprocess, sys, tempfile
from collections import Counter

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("Pillow missing: pip install pillow")

ap = argparse.ArgumentParser()
ap.add_argument("pdf")
ap.add_argument("--sheet", help="write a contact sheet PNG here")
ap.add_argument("--min", type=float, default=35.0, help="min content %% of body height for non-cover pages")
ap.add_argument("--body", type=float, default=0.90, help="fraction of page height treated as body (excludes margins/header)")
args = ap.parse_args()

tmp = tempfile.mkdtemp()
subprocess.run(["pdftoppm", "-png", "-r", "50", args.pdf, os.path.join(tmp, "pg")], check=True)
files = sorted(glob.glob(os.path.join(tmp, "pg-*.png")))
if not files:
    sys.exit("no pages rendered")

rows = []
warn = 0
for i, f in enumerate(files, 1):
    im = Image.open(f).convert("L")
    w, h = im.size
    px = im.load()
    # dominant colour of the page (mode of a coarse sample)
    sample = [px[x, y] for y in range(0, h, 4) for x in range(0, w, 4)]
    mode = Counter(sample).most_common(1)[0][0]
    top, bot = int(h * (1 - args.body) / 2), int(h * (1 + args.body) / 2)
    content_rows = 0
    for y in range(top, bot):
        diff = sum(1 for x in range(0, w, 2) if abs(px[x, y] - mode) > 25)
        if diff > 0.05 * (w / 2):
            content_rows += 1
    pct = 100.0 * content_rows / max(1, bot - top)
    flag = ""
    if i > 1 and pct < args.min:
        flag = "  <-- under-filled"
        warn += 1
    rows.append((i, pct))
    print(f"page {i:2d}: content {pct:5.1f}% of body{flag}")

print(f"\n{len(files)} pages, {warn} under-filled (< {args.min:.0f}%)")

if args.sheet:
    ims = [Image.open(f) for f in files]
    w, h = ims[0].size
    cols = 4
    nrows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (w + 10), nrows * (h + 22)), "#888")
    d = ImageDraw.Draw(sheet)
    for i, im in enumerate(ims):
        x, y = (i % cols) * (w + 10), (i // cols) * (h + 22)
        sheet.paste(im, (x, y + 18))
        d.text((x + 4, y + 2), f"p{i+1}  {rows[i][1]:.0f}%", fill="white")
    sheet.save(args.sheet)
    print(f"wrote {args.sheet}")

sys.exit(1 if warn else 0)
