---
title: "Print renders mobile layout: Chrome evaluates min-width queries at ~750px while laying pages out at 1046px"
module: proposal-print
date: 2026-07-15
problem_type: ui_bug
component: tooling
severity: high
symptoms:
  - "Proposal PDF printed 37 pages instead of ~23, with stacked mobile layouts stretched across landscape pages"
  - "Full-page images with grey gradient remainder blocks (aspect-ratio boxes taller than the img max-height cap)"
  - "Cards and tiles clipped across page boundaries despite break-inside: avoid"
root_cause: config_error
resolution_type: config_change
tags:
  - print
  - pdf
  - tailwind
  - media-queries
  - chrome
  - a4-landscape
---

# Print renders mobile layout: Chrome print media queries never match desktop breakpoints

## Problem

Printing the proposal page to A4 landscape produced the tablet/mobile layout even though the printed page is desktop-wide, inflating the PDF to 37 broken pages. All `md:`/`lg:` Tailwind styles were silently inert in print.

## Root cause

Chrome's print engine lays pages out at the page-box width in CSS px (~1046px for A4 landscape with 10mm margins) **but evaluates `min-width` media queries against a ~750px effective viewport — regardless of the browser window size**. Verified with a probe page: `document.documentElement.clientWidth` = 1046 during print, yet only `(min-width: 640px)` matched; 768/1024/1280 never did, with either an 800px or 1440px window. So any layout that depends on `md:`/`lg:` breakpoints prints its narrow variant, stretched across the wide page.

Knock-on effects: `aspect-[4/3]` boxes at full page width became ~200mm tall (one per page); a print-CSS `img { max-height: 110mm }` cap constrained the image but not the aspect box, leaving grey gradient-overlay remainder blocks; unbreakable tiles taller than a page clipped at boundaries.

## Solution

Make Tailwind's breakpoints also match print media, so print gets the desktop layout the print CSS was designed around (`tailwind.config.js`):

```js
theme: {
  screens: {
    sm: { raw: '(min-width: 640px), print' },
    md: { raw: '(min-width: 768px), print' },
    lg: { raw: '(min-width: 1024px), print' },
    xl: { raw: '(min-width: 1280px)' },   // screen-only: print canvas < 1280px
    '2xl': { raw: '(min-width: 1536px)' },
  },
  ...
}
```

Screen CSS is byte-identical (`@media (min-width: 1024px), print` behaves the same on screen); print gains every `sm/md/lg` rule. Result: 37 → 23 clean pages, no clipped tiles, no gradient remainders. Shipped in commit `08587cc` (PR zumu-g/GEA_proposals#4).

## Diagnosis technique

When print layout misbehaves, don't theorise about breakpoints — print a probe page through the same pipeline:

```html
<style>
@page { size: A4 landscape; margin: 10mm }
div::after { content: "base" }
@media (min-width: 640px)  { div::after { content: "sm" } }
@media (min-width: 1024px) { div::after { content: "lg" } }
</style>
<div></div>
<script>/* also dump document.documentElement.clientWidth into the DOM */</script>
```

Then `chrome --headless --print-to-pdf=...` and `pdftotext`. The layout width vs media-query width divergence is immediately visible. `scripts/print-proposal-pdf.sh` + `pdftoppm -png` remains the page-by-page visual check for proposal PDFs.

## Prevention

- Never rely on `sm/md/lg/xl` responsive variants to shape print output; in this repo they now match print by design — keep the `screens` block in `tailwind.config.js` intact when upgrading Tailwind (v4 moves screens to CSS `@theme`; port the `, print` alternation).
- Any breakpoint wider than the ~1046px print canvas (`xl`, `2xl`) must stay screen-only, or print will apply layouts designed for wider canvases.
- After any print-layer change, regenerate with `scripts/print-proposal-pdf.sh <id>` and sanity-check the page count (~23 for a full proposal) and a page-by-page render.
