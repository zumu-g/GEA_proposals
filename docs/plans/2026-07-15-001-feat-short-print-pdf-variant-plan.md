---
title: "feat: short print PDF variant for full proposals"
type: feat
status: pending
date: 2026-07-15
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-plan-bootstrap
---

# feat: short print PDF variant for full proposals

## Summary

Add a second, condensed print mode to the client-facing full proposal page: a "save short pdf" button that prints a ~7-page A4-landscape core sales pack (cover, price guide, comparables, campaign + costs, fees, next steps + contact), dropping the long-tail sections. Pure print-layer work — the on-screen proposal, the full print mode, and the Express template are unchanged. Builds on the merged A4-landscape print layer (`fix/print-responsive-layout`, `fix/pdf-a4-landscape`).

## Requirements

- R1. The proposal page offers two print actions: the existing full "save pdf" and a new "save short pdf"; both hidden in print output.
- R2. Short mode keeps, in order: hero cover, brand statement (price guide), sold comparables, on-market listings, marketing campaign with advertising schedule/costs, fees/investment, approval/next steps + footer contact (no standalone NextSteps section exists in the full template — ApprovalSection carries that content). All other sections do not print in short mode.
- R3. Short mode caps each comparables section to one landscape page (first ~6 cards; no continuation pages).
- R4. Short mode is also reachable via `?print=short` on the proposal URL (pre-applies the mode for headless verification and internal automation); the URL param never affects screen rendering beyond marking the print mode.
- R5. Existing full-print output is visually unchanged (same page count and section sequence) when short mode is not engaged.

## Key Technical Decisions

- **Print-mode class on the proposal root, not a new route.** The short variant is the same DOM with a `print-short` scoping class on `ProposalLayout`'s existing `proposal-print-root`; the button applies the class, calls `window.print()`, and removes it. A separate route would duplicate the template for one output channel (same reasoning as the original print-layer decision).
- **Keep/drop via per-section data attributes in the template, not `:nth-child`.** The full template (`src/app/proposal/[id]/page.tsx`) renders section components as direct children of the wrapper. Positional selectors would break every time a section is added or conditionally rendered (dual campaign, rentals). Mark drop sections in the template with a wrapper attribute or a pass-through slot that preserves the `main > div > section` pagination selector — the implementer chooses the mechanism that keeps that selector matching (this is the one structural constraint; see U1).
- **Comparables cap in CSS.** `.print-short` hides cards beyond the first 6 in each comparables grid via child-index selectors *within* the section's own grid (stable — the grid contains only cards), avoiding any component logic changes.
- **`?print=short` sets the initial mode client-side** in the same component that owns the buttons, so there is exactly one place that engages the mode.

## Implementation Units

### U1. Section keep/drop marking for short mode

- **Goal**: Every full-template section is identifiably keep-or-drop in short print mode without breaking the one-section-per-page print selector.
- **Requirements**: R2, R5
- **Dependencies**: none
- **Files**: `src/app/proposal/[id]/page.tsx`, `src/styles/globals.css`
- **Approach**: Drop set: StatsBar, AgentProfile, MethodExplainer, ProcessJourney, MarketingShowcase, MarketingStrategy (if separate from campaign costs), VIPBuyers, InternetPresence, AreaAnalysis, TeamShowcase, ClosingStatement, and the dual-campaign 'combined advertising investment' summary section. Keep set per R2. Dual-campaign inline sections follow the same classification. The marking must survive the existing `.proposal-print-root main > div > section` pagination rule — either attributes on the section's wrapper with an updated selector, or a mechanism that leaves section roots as direct children. Note: section components own their `<section>` roots and take no attribute props, so the wrapper-element-in-page.tsx approach (with the pagination selector updated accordingly) is the path consistent with this unit's file list; per-component attribute edits would expand Files to every section component.
- **Patterns to follow**: existing print scoping in `src/styles/globals.css` (`proposal-print-root` block); `print-page-continue` opt-out class convention.
- **Test scenarios**:
  - Full print of a seeded proposal is unchanged after marking (page count and section set identical to pre-change output).
  - Every section in the template (including dual-campaign) carries exactly one classification.
- **Verification**: full-mode PDF via `scripts/print-proposal-pdf.sh` diffs to the same page count/section sequence as before the change.

### U2. Short-print CSS layer

- **Goal**: With `print-short` active, dropped sections don't print and comparables cap at one page each.
- **Requirements**: R2, R3, R5
- **Dependencies**: U1
- **Files**: `src/styles/globals.css`
- **Approach**: Under `@media print`, `.proposal-print-root.print-short` rules: hide drop-marked sections; hide comparables cards beyond the first 6 per grid; keep the cover full-bleed rule and footer as-is. No screen-media rules.
- **Test scenarios**:
  - Short PDF of a full proposal ≈7 pages: cover, price, sold comps (1), on-market (1), campaign/schedule, fees, approval/next steps + contact.
  - Proposal with 12+ sold comparables: sold section is exactly one page, no clipped cards.
  - Proposal with 3 comparables: section prints all 3, no blank filler page.
  - Screen rendering unchanged with and without the class (class has no screen-media rules).
- **Verification**: page-by-page visual review of one detailed sale proposal and one dual-campaign proposal in short mode.

### U3. Short-print trigger — second button and URL param

- **Goal**: Agents get a "save short pdf" button; automation gets `?print=short`.
- **Requirements**: R1, R4
- **Dependencies**: U2
- **Files**: `src/components/Proposal/PdfButton.tsx`, `src/components/Layout/ProposalLayout.tsx` (or wherever the root class is owned)
- **Approach**: PdfButton renders both actions (both `print:hidden`). Short action toggles `print-short` on the proposal root around `window.print()` (add before, remove in `afterprint`). On mount, `?print=short` pre-applies the class so headless `--print-to-pdf` produces the short variant with no interaction. Express template (`SimpleProposal`) keeps its single button.
- **Test scenarios**:
  - Clicking "save short pdf" then cancelling the dialog leaves the page in full mode (class removed on afterprint).
  - `?print=short` headless print yields the short page count; the same URL without the param yields the full count.
  - Express proposals show one button only.
- **Verification**: both buttons visible on a full proposal on screen, absent in both PDFs.

### U4. Verification harness update

- **Goal**: One-command regeneration of both variants.
- **Requirements**: R3, R4 (harness)
- **Dependencies**: U3
- **Files**: `scripts/print-proposal-pdf.sh`
- **Approach**: Optional `--short` flag appends `?print=short` to the URL. Output naming distinguishes variants.
- **Test scenarios**: `Test expectation: none — script change; its output is the check.`
- **Verification**: script produces full (~23p) and short (~7p) PDFs for the same proposal id; both pass visual review.

## Scope Boundaries

**In scope**: full template print variant, trigger UI, URL param, verification script.

### Deferred to Follow-Up Work

- Small-sections-share-pages compression of the *full* print (declined this round; shaves ~3–5 pages if wanted later).
- Marketing-plan standalone page short mode.
- Persisting a per-proposal default variant (wizard toggle) — revisit if agents ask.

**Outside this work's identity**: on-screen layout changes; Express template changes; email attachments.

## Risks & Dependencies

- The keep/drop marking must not break the `main > div > section` pagination selector — U1's verification (unchanged full output) guards this.
- `afterprint` reliability varies across browsers; if flaky, fall back to removing the class on a short timeout after `print()` returns (visual state is print-only anyway).
- Comparables card cap assumes the card grid contains only cards; verify against `RecentSales`/`OnMarketListings` markup before relying on child-index selectors.
