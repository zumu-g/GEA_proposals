---
title: "feat: Off-market campaign stage (test the market before going public)"
type: feat
status: active
date: 2026-08-19
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# feat: Off-Market Campaign Stage (Test the Market Before Going Public)

## Summary

Add an **off market campaign** toggle to sale proposals (full and Express), sitting directly above the existing dual target toggle in wizard step 2. When on, the client-facing proposal explains a **stage one — testing the market**: before any public campaign, we take the property to qualified buyers already in our database within the target price range, bring them through privately, and gather feedback. No marketing spend, no open homes, no signboard. Only then does the public stage begin.

The feature mirrors the `dualCampaign` flag end to end (wizard → FormData → DB column → proposal type → proposal page → approval emails) and reuses its toggle pattern. Alongside it, the dual target label is clarified to read **dual target campaign (residential campaign + development site campaign)**.

Product Contract preservation: n/a — direct planning, no upstream requirements doc.

---

## Problem Frame

- Sale proposals currently present a single public campaign narrative (marketing strategy, advertising schedule, process journey). There is no way to tell a vendor "we'll test the market privately first".
- Agents want a one-toggle way to offer this without editing copy or inventing marketing items, in the same place they already choose the dual target campaign.
- The dual target toggle's label ("also market as a development site") doesn't spell out that "dual" means residential + development site; the user wants that stated in brackets.

---

## Requirements

- **R1** — Wizard step 2 (Property & Sale) shows an "off market campaign" toggle above the dual target toggle, for sale proposals only (never rental), on both full and Express layouts.
- **R2** — The dual target toggle label reads "dual target campaign (residential campaign + development site campaign)".
- **R3** — The off-market flag persists on the proposal (create, edit, duplicate, draft restore) exactly like `dualCampaign`.
- **R4** — When on, the full proposal renders a dedicated "stage one — testing the market" section, placed before the public campaign content (before Marketing Strategy), explaining: database buyers in the target price range brought through privately, feedback gathered, no marketing spend, no open homes, no signboard, then the public stage commences.
- **R5** — When on, the Express proposal renders a compact version of the same section, placed after BrandStatement (price/method) and before AgentProfile.
- **R6** — When on, the proposal's sale-process steps gain a leading "stage one — off market" step, with subsequent steps renumbered, so `ProcessJourney` reflects the two-stage campaign (full layout only; Express shows the section but has no process journey).
- **R7** — Approval emails (agent + client) include a one-line "Off-market stage: yes — testing the market before public launch" note when on; unchanged when off.
- **R8** — Toggle off → proposal identical to today. Existing proposals (column default 0) are unaffected.

---

## Key Technical Decisions

- **KTD1 — Boolean flag, mirror `dualCampaign` plumbing.** New `off_market_campaign INTEGER DEFAULT 0` column via the existing `ALTER TABLE` migration list in `src/lib/db.ts`; `offMarketCampaign?: boolean` on `Proposal`; FormData `'0'/'1'` convention; server ignores it for rentals. Rationale: it's a presentation flag with no sub-data; the dual campaign path already proves the shape.
- **KTD2 — Fixed default copy, not editable.** Copy lives as a constant (`OFF_MARKET_STAGE` in `src/lib/property-type-content.ts` alongside other per-type copy so a per-type override is trivial later). Rationale: user confirmed; matches how the dual target section's intro is hardcoded.
- **KTD3 — Prepend a process step at generation time via a shared pure helper, not in the content tables.** Export `withOffMarketStage(steps: SaleStep[], on: boolean): SaleStep[]` from `src/lib/property-type-content.ts`; when `on` it returns a new array with `{ step: 1, title: 'stage one — off market', … }` first and every following step renumbered `i + 1`, otherwise the input unchanged. Call it from **both** `POST /api/proposals` (after `resolveSaleProcess`) and the `PUT /api/proposals/[id]` property-type-change branch (which already re-resolves `saleProcess`; pass `existing.offMarketCampaign`). Rationale: keeps `saleProcessSteps` tables untouched, the helper is unit-checkable by `scripts/check-property-type-content.ts`, and the PUT path can no longer silently drop stage one while the flag stays on.
- **KTD4 — One shared section component.** `src/components/Proposal/OffMarketStage.tsx` with a `variant: 'full' | 'compact'` prop, used by both `proposal/[id]/page.tsx` and `SimpleProposal.tsx`. Rationale: one source of copy; Express just needs tighter spacing.
- **KTD5 — No marketing/advertising changes.** The advertising schedule and marketing items describe the public stage; the off-market stage is explicitly $0 and open-home-free, so nothing is added there.

---

## High-Level Technical Design

```mermaid
flowchart LR
  W[PropertySaleStep toggle<br/>offMarketCampaign] --> P[page.tsx state<br/>draft / edit / duplicate / reset]
  P --> F[FormData offMarketCampaign=0|1]
  F --> API[POST /api/proposals<br/>set flag · prepend stage-1 step]
  API --> DB[(proposals.off_market_campaign)]
  DB --> G[proposal-generator rowToProposal]
  G --> Full[proposal/[id]/page.tsx<br/>OffMarketStage variant=full<br/>ProcessJourney shows stage 1]
  G --> Exp[SimpleProposal.tsx<br/>OffMarketStage variant=compact]
  G --> E[email.ts approval emails<br/>one-line note]
```

---

## Scope Boundaries

- Sale proposals only; rentals never see the toggle, section, or step.
- No editable copy, no per-proposal customisation of the stage (KTD2).
- No change to marketing costs, advertising schedule totals, or marketing presets.
- No dashboard column/filter for the flag.

### Deferred to Follow-Up Work
- Per-property-type copy overrides for the off-market stage (the constant is placed to allow it).
- Express process steps generally (the June 30 express-process plan; SimpleProposal still has no ProcessJourney — this plan only adds the off-market section to Express, not the full step list).

---

## Implementation Units

### U1. Schema, type, persistence
**Goal:** Persist `offMarketCampaign` end to end.
**Requirements:** R3, R8
**Dependencies:** none
**Files:** `src/lib/db.ts`, `src/types/proposal.ts`, `src/lib/proposal-generator.ts`, `src/app/api/proposals/route.ts`
**Approach:**
1. Add `'ALTER TABLE proposals ADD COLUMN off_market_campaign INTEGER DEFAULT 0'` next to `dual_campaign` in the migration list.
2. Add `offMarketCampaign?: boolean` to `Proposal` beside `dualCampaign`.
3. Map row ↔ model in `proposal-generator.ts` (row type, `rowToProposal`, insert/update param + SQL) exactly as `dual_campaign`.
4. In `POST /api/proposals`, read `offMarketCampaign` from FormData; set `proposal.offMarketCampaign = true` only when `'1'` and `proposalType !== 'rental'`.
5. Confirm `PUT /api/proposals/[id]` partial-update allowlist leaves the column untouched, and in its property-type-change branch wrap the re-resolved steps with `withOffMarketStage(steps, existing.offMarketCampaign)` (KTD3).
**Patterns to follow:** every `dual_campaign` / `dualCampaign` touchpoint in the same files.
**Test scenarios:**
- Create with flag `'1'` on a sale proposal → `GET ?id=` returns `offMarketCampaign: true`.
- Create with flag `'1'` on a rental → stored false.
- Create with flag omitted → false; existing DB rows read as false.
- Edit via PUT admin path → flag unchanged.
- PUT property-type change on an on-proposal → `saleProcess[0]` is still the off-market step.
**Verification:** flag round-trips through create → fetch → edit → duplicate; `npx tsc --noEmit` clean.

### U2. Wizard toggle + dual target relabel
**Goal:** Agent can switch off-market on/off above the dual target toggle; dual label clarified.
**Requirements:** R1, R2, R3
**Dependencies:** U1
**Files:** `src/components/Wizard/steps/PropertySaleStep.tsx`, `src/app/page.tsx`
**Approach:**
1. In `PropertySaleStep`, add `offMarketCampaign: boolean` to the formData shape and render a new labelled toggle row (`sr-only peer` checkbox, identical to the dual target row) immediately above the dual target block, label "off market campaign", helper "test the market privately before the public campaign".
2. Change dual target label text to "dual target campaign" with helper "(residential campaign + development site campaign)".
3. Lift `offMarketCampaign` state in `page.tsx`: `useState(false)`, include in draft-persist object and its deps, draft restore, `handleEdit`/duplicate load, `resetForm`, `onChange` switch case, FormData append (`'1'/'0'`, forced `'0'` for rental), and the `PropertySaleStep` props.
**Patterns to follow:** `dualCampaign` handling at each of those `page.tsx` sites; toggle markup at `PropertySaleStep.tsx` dual target block.
**Test scenarios:**
- Toggle appears above dual target on sale (full and Express), hidden on rental.
- Toggle on → generate → proposal shows the section; reload wizard draft → toggle still on.
- Edit an existing on-proposal → toggle pre-filled on; duplicate carries it.
- Dual label reads with the bracketed explanation.
**Verification:** manual wizard run in both layouts; TypeScript clean.

### U3. Off-market copy + prepended process step
**Goal:** Single source of copy; generated `saleProcess` gains stage 1 when on.
**Requirements:** R4, R6
**Dependencies:** U1
**Files:** `src/lib/property-type-content.ts`, `src/app/api/proposals/route.ts`, `src/app/api/proposals/[id]/route.ts`, `scripts/check-property-type-content.ts`
**Approach:**
1. Export `OFF_MARKET_STAGE` from `property-type-content.ts`: `{ eyebrow: 'stage one', title: 'testing the market', intro, points: [ 'buyers from our database in your target price range', 'private inspections, feedback before you commit', 'no marketing spend', 'no open homes', 'no signboard' ], outro: 'only then does the public campaign begin' }` and a `step: SaleStep`-shaped `{ title: 'stage one — off market', description }` (lowercase editorial voice per house style).
2. Export `withOffMarketStage(steps, on)` (KTD3): returns `[offMarketStep, ...steps]` with `step` renumbered `1..n+1` when `on`, else the input unchanged; never mutates the source arrays.
3. In `POST`, replace `proposal.saleProcess = resolveSaleProcess(...)` with `withOffMarketStage(resolveSaleProcess(...), proposal.offMarketCampaign === true)`. Never for rentals.
4. Add an invariant to `check-property-type-content.ts` calling the helper: contiguous numbering starting at 1, first title is the off-market step, `on=false` is identity, and the source tables are unchanged afterwards.
**Test scenarios:**
- Flag on, house/auction → `saleProcess[0].title` is the off-market step, `[1]` is the former step 1, numbering 1..n+1.
- Flag off → `saleProcess` identical to `resolveSaleProcess` output.
- On-proposal edited via the wizard with the toggle turned off → regenerated `saleProcess` has no stage-one step.
- Rental → no prepend.
**Verification:** `npx tsx scripts/check-property-type-content.ts` passes.

### U4. Proposal page rendering (full + Express)
**Goal:** Client sees the stage-one section on both templates.
**Requirements:** R4, R5, R8
**Dependencies:** U1, U3
**Files:** `src/components/Proposal/OffMarketStage.tsx` (new), `src/app/proposal/[id]/page.tsx`, `src/components/Proposal/SimpleProposal.tsx`
**Approach:**
1. `OffMarketStage({ variant })` renders eyebrow/title/intro/points/outro from `OFF_MARKET_STAGE`. Full variant: charcoal band with brand-red top rule (use `#C41E2A`, not the legacy gold) and a "no spend · no open homes · no signboard" pill row (mirror the dual target section break layout). Compact variant: light section, smaller heading, single-column points (no pill row).
2. Full page: render **outside** the `print-drop` wrapper — directly after `BrandStatement` and before the `print-drop` div that opens at `AgentProfile` — so it appears in the short print PDF and still precedes `MarketingStrategy`. Accept that ProcessJourney's stage-1 step (inside a print-drop group) is not in the short PDF. Always show when the flag is on regardless of the `marketing` hidden-section toggle.
3. Express: render after `BrandStatement`, before `AgentProfile`, when on.
**Patterns to follow:** dual target section-break markup in `proposal/[id]/page.tsx`; `SectionDivider`; lowercase display headings, `font-display`, brand red `#C41E2A` (not gold).
**Test scenarios:**
- On → section visible on full and Express in the stated positions; ProcessJourney shows stage 1 first.
- Off → no section, DOM identical to today.
- Print/PDF (`scripts/print-proposal-pdf.sh`) → section renders, no orphaned page break.
- Reduced motion / mobile widths → legible, no horizontal scroll.
**Verification:** browser check both templates + a PDF print of a full proposal.

### U5. Approval emails
**Goal:** Agent and client emails note the off-market stage.
**Requirements:** R7
**Dependencies:** U1
**Files:** `src/lib/email.ts`
**Approach:** In the agent approval details block and the client confirmation summary, add a single row/line "Off-market stage: yes — testing the market before public launch" guarded on `proposal.offMarketCampaign`.
**Test scenarios:**
- On → both HTML builders include the line; off → byte-identical to today.
**Verification:** render both builders for an on/off proposal and diff.

---

## Risks & Dependencies

- Renumbering `saleProcess` (U3) — any consumer that assumes step 1 is "appraisal" (e.g. copy in `ProcessJourney` intro or Express future work) should be grepped; low risk today.
- `PUT /api/proposals/[id]` allowlist must not clobber the new column — same trap the dual target plan called out.
- No automated test runner in this repo; verification leans on the `scripts/check-*` invariants plus manual template checks.

## Deferred Implementation Notes

- Exact wording of the stage-one copy is drafted in U3 and can be tuned in review; keep it lowercase, left-aligned, editorial.
- Prepended step: give it a `duration` (e.g. '1–2 weeks') and match sibling title casing in the ProcessJourney data; the index-based step imagery shifting by one is accepted.
