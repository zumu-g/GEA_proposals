---
title: "fix: A4 landscape print/PDF formatting for proposal pages"
type: fix
status: completed
date: 2026-07-07
---

# fix: A4 landscape print/PDF formatting for proposal pages

## Summary

Make "save pdf" (`window.print()`) on the client-facing proposal page produce a clean A4 landscape report: every section visible (no animation-blanked pages), one major section per page, real page margins, no clipped cards or stranded half-blank pages — on both the full and Express templates. Print-layer CSS only; the on-screen design is untouched.

---

## Problem Frame

Printing a proposal to A4 landscape today produces the defects visible in the example PDF (94 Lesdon Avenue): mostly-blank pages, sections spilling with half a page of dead space, comparable cards clipped mid-tile, wizard-ish sort controls printed, and solid-ink pages. Root causes, confirmed in code:

1. **Animation-blanked content.** 23 of the proposal components use framer-motion `whileInView` with `initial opacity 0` / translate. Print renders unviewed sections at their initial state — invisible. This is the dominant cause of the blank/half-blank pages.
2. **Viewport-height layouts.** `FullHero` and `SimpleProposal` use `min-h-screen`/viewport heights; a screen-height section doesn't fit a landscape page and spills.
3. **`@page { margin: 0 }`** clips edges on most printers and leaves no breathing room.
4. **Blanket `section { break-inside: avoid }`** forces any section taller than one page onto its own page with the remainder stranded blank, instead of allowing controlled breaks.
5. **Interactive chrome prints** — sort chips on the comparables sections, the approval CTA, hover-only affordances.

---

## Requirements

- R1. Every proposal section is fully visible in print output — no content stuck at animation-initial opacity/transform, on either template.
- R2. Output paginates deliberately on A4 landscape: each major section starts on its own page and fits within it; cards, table rows, and process tiles never split across pages; no page is left mostly blank by layout accident. Long comparable lists are never truncated — they continue onto following pages under a repeated "(cont.)" heading.
- R3. `@page` uses A4 landscape with a real margin (≈10mm) and white page background; brand dark sections are kept but constrained to their page.
- R4. Interactive-only chrome is hidden in print: pdf button (already), sort/filter chips, approval CTA buttons, hover affordances; static content of those sections still prints where it carries information.
- R5. Both templates print cleanly: full layout (including the dual-campaign block when present) and Express (`SimpleProposal`); rental proposals inherit the same treatment.
- R6. On-screen rendering is unchanged — all changes live under `@media print` (or `print:` utility classes).
- R7. Every page after the cover carries a print-only footer with the property address and proposal date, sitting inside the page margin, so loose printed sheets remain identifiable. (Page numbers are omitted — CSS page counters/margin boxes are not reliably supported in browser print engines.)

---

## Key Technical Decisions

- **Print CSS on the existing page, not a separate print route.** `window.print()` and `PdfButton` stay. A dedicated print route or server-side renderer (Puppeteer) would duplicate every section component for one output channel; print CSS reaches the same DOM. (Confirmed with user.)
- **Neutralise framer-motion globally in print, with `!important`.** framer-motion writes inline `opacity`/`transform` styles; CSS `!important` rules override inline styles, so a single global block (`opacity: 1`, `transform: none`, `visibility: visible` on descendants of the proposal root) fixes all 23 components without touching any of them. This is the root-cause fix for R1 — no per-component motion changes.
- **One section per page via a print-only child selector, replacing the blanket `break-inside: avoid`.** The section components render their own `<section>` roots and accept no className, but every section root (including the inline dual-campaign sections) is a **direct child** of the template wrapper div — so `main > div > section { break-before: page }` under the print scope paginates everything without touching ~20 component files. An opt-out class (`print-page-continue`) lets small adjacent sections share a page. `break-inside: avoid` is retained only on leaf blocks: property cards, schedule table rows, process step tiles, team member cards, stat blocks. Two sections may share a page only when their combined content is under about half a printable page's height.
- **Full-bleed cover, framed report.** `@page :first { margin: 0 }` gives the hero a true edge-to-edge cover page; every subsequent page keeps the 10mm frame. Chrome supports `@page :first`.
- **Print footer via fixed positioning.** A print-only footer element in `ProposalLayout` (`position: fixed; bottom: 0` repeats per printed page in Chrome) carries the property address and proposal date (R7); hidden on screen and suppressed on the cover page.
- **Compress scale in print rather than redesigning sections.** A global print typography/spacing layer (clamped display sizes, reduced section padding, killed `min-h-screen`/viewport heights) makes screen-designed sections fit a 277×190mm printable area. Worst offenders get targeted `print:` utility tweaks; everything else inherits the global layer.
- **Keep dark sections dark, page-constrained.** Brand fidelity wins over toner (user call); `print-color-adjust: exact` already exists. Each dark section obeys the one-page rule so a dark section is exactly one page, never a spill.
- **Hide, don't restyle, interactive chrome.** Sort chips, approval buttons, and the pdf button get `print:hidden` (existing utility). The approval section's static summary content may remain if it reads as report content; the buttons never print.

---

## Implementation Units

### U1. Global print foundation

- **Goal**: One `@media print` layer that makes all content visible, scales it to A4 landscape, and sets sane page geometry.
- **Requirements**: R1, R3, R6, R7
- **Dependencies**: none
- **Files**: `src/styles/globals.css`, `src/components/Layout/ProposalLayout.tsx`
- **Approach**: Add a scoping class (e.g. `proposal-print-root`) to the `ProposalLayout` wrapper — `<main>` alone leaks the overrides into the wizard and edit pages, which render their own `<main>` — and add the print-only footer element (address + date, hidden on screen, suppressed on the cover) there. Rework the existing `@media print` block: `@page { size: A4 landscape; margin: 10mm }` with `@page :first { margin: 0 }` for the full-bleed cover; force `opacity: 1 !important; transform: none !important` on all elements under the scoping class; neutralise `min-h-screen`/`h-screen`/fixed positioning (`position: fixed → static` for decorative elements, hidden for buttons; the footer is the deliberate exception); global print type scale (display headings clamped, body ≥9pt as a **hard floor** — a section that can't fit at 9pt spills to a continuation page rather than shrinking further) and section padding compression; keep `print-color-adjust: exact` and the animation-duration zeroing; **remove** the blanket `section { break-inside: avoid }`.
- **Patterns to follow**: existing `print\:` utility definitions in the same block; Tailwind `print:` variants already used in `PdfButton`/`FullHero`/`ApprovalSection`.
- **Test scenarios**:
  - Print preview of a seeded full proposal: no page renders blank; previously-unscrolled sections (VIP buyers, closing) are visible.
  - Page margins visible on all four edges; no content clipped at page edges.
  - Screen rendering unchanged (visual spot-check of hero, brand statement, comparables at desktop width).
- **Verification**: Chrome print preview (A4 landscape) of a real proposal shows every section with content; on-screen diff is nil.

### U2. Section pagination for both templates

- **Goal**: Deliberate one-section-per-page flow on the full template, Express template, and dual-campaign block.
- **Requirements**: R2, R5, R6
- **Dependencies**: U1
- **Files**: `src/styles/globals.css`, `src/app/proposal/[id]/page.tsx`, `src/components/Proposal/SimpleProposal.tsx`, `src/components/Proposal/FullHero.tsx`
- **Approach**: Paginate via the print-only child selector from the KTD (`main > div > section { break-before: page; break-inside: auto; min-height: 0 }` under the scoping class) — no per-component class threading. Apply the `print-page-continue` opt-out to small adjacent sections that read as one page (e.g. stats bar + agent profile), only when their combined content is under about half a printable page. Hero becomes the full-bleed cover at a fixed print height (fills the page, image `object-fit: cover`) — this **replaces** FullHero's existing `print:h-auto print:min-h-0 print:max-h-none print:py-20` utilities, which would otherwise collapse it to a strip. Dual-campaign inline sections are direct children of the same wrapper and inherit the rule.
- **Test scenarios**:
  - Full proposal with dual campaign: each major section starts on a fresh landscape page; no section spills into the next page's header.
  - Express proposal: hero, brand statement, agent, sales, fees, approval each paginate cleanly; total page count is small (~4-6).
  - Rental proposal prints with the same treatment (leased comparables section included).
  - Screen rendering unchanged — visual spot-check of hero and both templates at desktop width (R6).
- **Verification**: printed PDFs of one sale, one rental, one dual-campaign, and one Express proposal show deliberate page starts with no stranded mostly-blank pages.

### U3. Component-level print tidy-ups

- **Goal**: Data-dense sections lay out for landscape and interactive chrome disappears.
- **Requirements**: R2, R4, R6
- **Dependencies**: U1
- **Files**: `src/components/Proposal/RecentSales.tsx`, `src/components/Proposal/OnMarketListings.tsx`, `src/components/Proposal/AdvertisingSchedule.tsx`, `src/components/Proposal/ProcessJourney.tsx`, `src/components/Proposal/TeamShowcase.tsx`, `src/components/Proposal/FeeStructureVisual.tsx`, `src/components/Proposal/ApprovalSection.tsx`
- **Approach**: `print:hidden` on the sort/filter chip rows in RecentSales/OnMarketListings and on approval CTA buttons; card grids get print column counts suited to landscape (e.g. 4-up) with `break-inside: avoid` per card; schedule table rows and process tiles avoid splitting. Long comparable lists always flow to continuation pages with a lighter-weight repeated "(cont.)" heading — never cap or truncate the list (the comps are the pricing evidence). Hover-only affordances need no explicit handling: hover states cannot trigger in print, so R4's hover clause is satisfied by default.
- **Test scenarios**:
  - Comparables sections: no card clipped across a page boundary; sort chips absent in print, present on screen.
  - Advertising schedule: week tables never split a row; totals row stays with its table.
  - Approval section: CTA buttons absent in print; any agreed-terms summary text still prints.
  - Long comparable list (12+): continues to a second page under a "(cont.)" heading with no cards dropped.
  - Screen rendering unchanged — visual spot-check of the touched components at desktop width (R6).
- **Verification**: print preview per section confirms the above with an 8-comp and a 2-comp proposal.

### U4. Repeatable print verification

- **Goal**: A one-command way to regenerate the A4 landscape PDF for review, so print regressions are catchable without manual printing.
- **Requirements**: R1, R2, R5 (verification harness)
- **Dependencies**: U1, U2, U3
- **Files**: `scripts/print-proposal-pdf.sh` (new)
- **Approach**: Small script driving system Chrome headless (`--headless --print-to-pdf=<out> <url>` for a given proposal id) to emit the PDF into the scratch folder; orientation comes from the `@page` CSS under test — Chrome has no `--landscape` CLI switch and silently ignores unknown flags. First run must confirm dark sections actually print (headless defaults to no backgrounds; `print-color-adjust: exact` should force them — verify). No new npm dependencies. Manual visual review of the output remains the acceptance step.
- **Test scenarios**: `Test expectation: none` beyond the script running — the script IS the check; its output is reviewed visually against R1-R5.
- **Verification**: script produces a PDF for both a full and an Express proposal; visual review passes against the example-PDF defect list.

---

## Scope Boundaries

**In scope**: print-layer CSS and `print:` class changes for the client-facing proposal page (both templates, dual campaign, rentals), plus the verification script.

### Deferred to Follow-Up Work

- The standalone marketing-plan page (`/proposal/[id]/marketing-plan`) — separate surface; apply the same treatment later if it's printed in practice.
- A server-side PDF pipeline (Puppeteer/Playwright) for pixel-identical PDFs without user printing — only if print CSS proves insufficient in practice.
- Portrait print support — the report is designed landscape-only per the request.

**Outside this work's identity**: any on-screen layout/design change; email templates; wizard pages.

---

## Risks & Dependencies

- **Browser variance**: `break-before/inside` support differs between Chrome/Safari print engines; agents likely print from Chrome. Verify in Chrome first (the `--print-to-pdf` script), spot-check Safari; accept minor Safari variance.
- **`!important` opacity overrides** are broad; scoping them to the proposal layout root prevents side effects on other printable pages (dashboard etc.).
- **Content-length variance**: proposals with many marketing items or comparables may legitimately need continuation pages — the design must break cleanly rather than force-fit (handled in U3).
