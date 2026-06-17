---
title: "fix: Rental proposals show sold data in Leased Comparables step"
status: active
date: 2026-06-18
type: fix
depth: standard
origin: none (direct invocation)
---

# fix: Rental proposals show sold data in Leased Comparables step

## Summary

When building a **rental** proposal, Step 4 ("Leased Properties — comparable rentals") renders correctly at the
header level but is unusable below it: the subject's leased comparables are all filtered out
("all 71 results filtered out", "nearest is Infinitykm away"), the tier bands show **sale** magnitudes
($500k–$1.2M) instead of weekly rent, and several result-section labels still say "sold properties" / "add sale
manually" / "sold within". The root cause is a cluster of issues spanning the wizard step, the comparables API
data path, and the leased-data pipeline — the rental flow reuses `SoldPropertiesStep` but several sale-specific
behaviours were never parameterised for rentals.

This plan fixes the **display + filtering** path so existing leased data renders correctly, and closes the
**data-availability** gap so the step actually returns usable leased comps (currently only ~30 leased rows
exist across all suburbs, ~1 per suburb, and the no-data fallback scrapes *sold* listings).

---

## Problem Frame

`SoldPropertiesStep` (`src/components/Wizard/steps/SoldPropertiesStep.tsx`) is shared between sale and rental
proposals. It already branches on an `isRental` flag (derived from `proposalType`) for the page header, the
fetch `type` (`leased` vs `sold`), and a few status messages — but the branch is incomplete. Three classes of
defect remain:

1. **Distance filtering wipes all leased results.** Leased records returned by `/api/comparables?type=leased`
   carry `distance: 0` from the API, but the client recomputes haversine distance from each row's `lat`/`lng`.
   Leased rows with null/absent coordinates yield `Infinity`, so the default 500m distance pill drops every
   row ("nearest is Infinitykm away"). The API hardcodes `distance: 0` (`src/app/api/comparables/route.ts`
   leased branch) which the client ignores.

2. **Tier bands derive from the sale price guide.** `page.tsx` passes `priceGuideMin`/`priceGuideMax` (sale
   magnitudes, or empty defaults) to `SoldPropertiesStep` even in rental mode; `deriveBands()` then produces
   $500k-scale bands. Weekly rents ($560–$700) never fall inside them, so even comps surviving distance are
   bucketed as "no sales in this band". The rental flow has `askingRent` but never feeds it to the bands.

3. **Sale-specific copy leaks through in rental mode.** Hardcoded strings remain at the results header
   ("sold properties", ~line 1596), the selection footer ("N sold properties selected", ~line 1862), the
   "sold within" date filter label (~line 1507), and the manual-add control ("add sale manually").

Separately, the **leased data pipeline is under-populated**: `leased_properties` holds ~30 rows total
(Cranbourne North = 1), and the on-demand no-data fallback in the step calls `/api/scrape-sold` — which scrapes
*sold* listings, not leased — so a thin rental suburb can never self-populate. A daily Apify leased cron
(`runDailyLeasedScrape`, 10am) exists but coverage is sparse, and there is no `/api/scrape-leased` route for the
on-demand path to call.

---

## Requirements

- **R1** — In rental mode, Step 4 returns and displays leased comparables for the subject suburb (and neighbours)
  rather than filtering them all out.
- **R2** — Distance filtering must not silently drop leased comps that lack coordinates; comps with unknown
  distance remain visible (and are geocoded where possible).
- **R3** — Tier bands in rental mode derive from the weekly asking rent, not the sale price guide — or tiered
  view degrades gracefully for rentals.
- **R4** — All result-section copy (header, footer, date filter, manual-add) reads in rental terms when
  `isRental` is true.
- **R5** — A rental suburb with no/thin local leased data can self-populate via an on-demand leased scrape (not
  a sold scrape), mirroring the existing sold on-demand path.
- **R6** — Existing leased records missing `lat`/`lng` can be backfilled so distance filtering works on
  subsequent loads.

---

## Key Technical Decisions

- **KTD1 — Pass rent, not sale guide, into the bands.** Add `askingRent` (or a derived min/max) as props to
  `SoldPropertiesStep` and, when `isRental`, derive tier bands from it. A single asking rent (e.g. $640/wk)
  has no min/max, so derive a symmetric band around it (e.g. ±15%) using the existing `deriveBands` shape with
  rent magnitudes. Rationale: reuses the proven band/tier machinery; avoids a parallel rental-only layout.

- **KTD2 — Treat unknown distance as "include", not "exclude", in rental mode.** Rather than block on
  geocoding, the distance filter should keep rows whose distance is unknown (Infinity) when `isRental`, so
  thin/uncoordinated leased data still surfaces. Geocoding backfill (U6) improves accuracy over time but is not
  a hard dependency for the step to be usable. Rationale: leased data is inherently sparser than sold; a strict
  geo gate makes the step empty far too often.

- **KTD3 — Add a dedicated `/api/scrape-leased` route + branch the on-demand fallback.** The step's no-data
  path must call leased scraping when `isRental`. Reuse `runDailyLeasedScrape`'s per-suburb Apify helper rather
  than inventing a new scraper. Rationale: leased and sold are different REA list pages; scraping sold can never
  populate leased.

- **KTD4 — Backfill leased coordinates via the existing geocoding lib.** Add a leased-aware geocode path
  (extend `/api/comparables/geocode` or a small one-off) using `src/lib/geocoding.ts`, matching how sold rows
  are refined. Rationale: consistent with the sold refinement loop already in the step.

---

## High-Level Technical Design

Data + control flow for rental Step 4 after the fix:

```
page.tsx (rental)
  └─ SoldPropertiesStep  props: proposalType='rental', askingRent, leaseType
        │  isRental = true
        ├─ fetch /api/comparables?type=leased  ──► leased_properties (suburb+neighbours)
        │       └─ if 0 results ──► POST /api/scrape-leased {suburb}  (NEW)
        │                              └─ runDailyLeasedScrape helper (Apify REA /leased)
        │                                    └─ store rows (with lat/lng) ──► re-fetch type=leased
        ├─ distance filter:  isRental → keep rows with unknown distance (KTD2)
        ├─ tier bands:       isRental → deriveBands(rent±15%)  (KTD1)
        ├─ background geocode backfill for leased rows missing lat/lng (KTD4)
        └─ labels:           isRental → "leased properties", "add lease manually", "leased within", etc.
```

Display/filtering units (U1–U4) make existing data usable and are independently shippable; data-population
units (U5–U7) close the coverage gap. U1–U4 should land first so the step is correct even before the pipeline
is richer.

---

## Implementation Units

### U1. Pass rent into the step and derive rental tier bands

**Goal:** Tier bands in rental mode reflect weekly rent, so leased comps bucket into Entry/Similar/Above
instead of "no sales in this band".

**Requirements:** R3

**Dependencies:** none

**Files:**
- `src/app/page.tsx` — pass `askingRent` (and `proposalType` already passed) to the Step-4 `SoldPropertiesStep`
- `src/components/Wizard/steps/SoldPropertiesStep.tsx` — accept `askingRent` prop; when `isRental`, derive
  bands from rent instead of `priceGuideMin/Max`

**Approach:** Add `askingRent?: string` to the step's props. Parse it to a number; when `isRental` and a rent
value exists, compute `pgMin`/`pgMax` as `rent*(1-δ)` / `rent*(1+δ)` (δ≈0.15) before `deriveBands`, so the
existing `deriveBands`/`tierForPrice` machinery produces rent-scale bands. When `isRental` and no rent is set,
default `tieredView` to off (flat list) rather than showing sale-scale bands. Keep `round5k` for sale; consider
a smaller rounding (e.g. round to $10) for rent so bands aren't all collapsed — confirm during implementation.

**Patterns to follow:** existing `deriveBands` / `tierForPrice` / `pgMin`/`pgMax` derivation in the same file.

**Test scenarios:**
- Rental proposal, askingRent=$640 → `similar` band brackets $640 (e.g. ~$544–$736), a $650/wk comp buckets to
  `similar`, a $500/wk comp to `entry`.
- Rental proposal with no askingRent → tiered view defaults off; all leased comps render in the flat list, none
  dropped by banding.
- Sale proposal (regression) → bands still derive from `priceGuideMin/Max`; behaviour unchanged.

### U2. Don't drop coordinate-less leased comps in the distance filter

**Goal:** Leased comps with unknown distance stay visible in rental mode instead of being filtered to zero.

**Requirements:** R1, R2

**Dependencies:** none

**Files:**
- `src/components/Wizard/steps/SoldPropertiesStep.tsx` — distance filter predicate (~`filteredSold` block,
  ~line 518) and the "nearest is Infinitykm" empty-state message

**Approach:** In the distance filter, when `isRental` keep rows whose computed distance is not finite (treat
unknown as passing the filter). Sort finite-distance rows first, unknown-distance rows after. Update the empty
helper so it doesn't claim "nearest is Infinitykm away" when the real issue is missing coordinates — only show
the distance-widening hint when at least one finite distance exists.

**Patterns to follow:** the existing distance-filter and sort blocks in the same component.

**Test scenarios:**
- Rental, all leased rows lack lat/lng, distance pill = 500m → rows still render (not "0 results").
- Rental, mix of coordinated and uncoordinated rows → coordinated sorted by distance first, uncoordinated after.
- Sale proposal (regression) → strict distance filtering unchanged; uncoordinated sold rows still excluded as
  today.

### U3. Switch remaining sale-specific copy to rental wording

**Goal:** No "sold"/"sale" copy leaks into the rental Step 4.

**Requirements:** R4

**Dependencies:** none

**Files:**
- `src/components/Wizard/steps/SoldPropertiesStep.tsx` — results header (~1596), selection footer (~1862),
  "sold within" filter label (~1507), manual-add control label/button ("add sale manually"), and any other
  literal "sold"/"sale" strings in the rendered tree

**Approach:** Gate each remaining literal on `isRental`, mirroring the existing `isRental ? 'leased' : 'sold'`
pattern already used at lines ~660, ~1146. Use "leased properties", "leased within", "add lease manually",
"N leased properties selected". Audit the full JSX for any other "sold"/"sale" literal not yet branched.

**Patterns to follow:** existing `isRental ? … : …` ternaries in the same file.

**Test scenarios:**
- Rental proposal → results header reads "leased properties", footer "N leased properties selected", date filter
  "leased within", manual control "add lease manually".
- Sale proposal (regression) → all copy reads "sold"/"sale" as before.
- Grep the rendered component for `/sold|sale/i` literals → every remaining one is inside an `isRental` branch.

### U4. Map leased date field through the date filter

**Goal:** The "leased within" date filter operates on the leased date, and leased rows aren't dropped by a
date filter expecting `sold_date`.

**Requirements:** R1, R4

**Dependencies:** U3

**Files:**
- `src/components/Wizard/steps/SoldPropertiesStep.tsx` — date-filter predicate and the `date` field consumed
  from API rows
- `src/app/api/comparables/route.ts` — leased branch already maps `date: s.soldDate || s.sold_date` but the
  leased table column is `leased_date`; confirm the mapping reads `leased_date`

**Approach:** Ensure the leased API branch maps `date` from `leased_date` (DB column), and that the client date
filter tolerates empty leased dates (don't exclude rows with no date). Leased records frequently have no date —
treat missing date as passing the filter.

**Patterns to follow:** the sold date-filter handling in the same component; the leased mapping in the API route.

**Test scenarios:**
- Leased row with `leased_date` set, filter "last 24 months" → included when within range, excluded when older.
- Leased row with empty date → not dropped by the date filter.
- API leased branch returns `date` populated from `leased_date` for a row that has it.

### U5. Add `/api/scrape-leased` and branch the on-demand fallback

**Goal:** A rental suburb with no local leased data triggers a leased scrape (not a sold scrape) and re-fetches.

**Requirements:** R5

**Dependencies:** none (independent of U1–U4)

**Files:**
- `src/app/api/scrape-leased/route.ts` — **new** route: `POST { suburb, pages? }` → scrape REA leased via the
  Apify helper in `rental-scraper.ts`, store into `leased_properties`, return `{ stored }`
- `src/lib/rental-scraper.ts` — export a single-suburb leased scrape helper if not already exported (the daily
  job's internal per-suburb function)
- `src/components/Wizard/steps/SoldPropertiesStep.tsx` — in the no-data fallback (~line 724), call
  `/api/scrape-leased` when `isRental`, else `/api/scrape-sold`

**Approach:** Factor the per-suburb leased Apify scrape out of `runDailyLeasedScrape` (or reuse
`scrapeSuburbLeasedViaApify`) behind an exported function the route can call with a suburb + postcode. The route
resolves postcode the same way the daily job does. The step's existing retry-after-scrape logic already
re-fetches `type=leased`, so only the scrape endpoint selection needs branching.

**Patterns to follow:** `src/app/api/scrape-sold/route.ts`; `runDailyLeasedScrape` in `src/lib/rental-scraper.ts`.

**Test scenarios:**
- Rental, suburb with 0 local leased rows, Apify available → `/api/scrape-leased` called, rows stored, step
  re-fetches and renders them.
- Rental, Apify unavailable/token missing → route returns `{ stored: 0 }` gracefully; step falls back to manual
  add without error.
- Sale proposal (regression) → no-data path still calls `/api/scrape-sold`.

### U6. Backfill leased coordinates for distance accuracy

**Goal:** Leased rows missing `lat`/`lng` get geocoded so distance filtering and sorting become accurate over
time (complements U2's graceful handling).

**Requirements:** R6

**Dependencies:** U2

**Files:**
- `src/app/api/comparables/geocode/route.ts` (or a leased-aware variant) — update to optionally target
  `leased_properties` rows missing coordinates
- `src/components/Wizard/steps/SoldPropertiesStep.tsx` — the geocode-refinement `useEffect` currently returns
  early when `isRental` (~line 364); allow a leased geocode pass that backfills coordinates and re-fetches

**Approach:** Mirror the sold refinement loop but target leased rows. Use `src/lib/geocoding.ts` (Nominatim with
AU abbreviation expansion) to resolve addresses, persist `lat`/`lng` to `leased_properties`, then re-fetch
`type=leased`. Run in the background, bounded (a few rounds) like the sold path. Guard rate limits.

**Patterns to follow:** the sold geocode-refinement `useEffect` and `/api/comparables/geocode` for sold;
`src/lib/geocoding.ts`.

**Test scenarios:**
- Leased rows without coordinates + a geocodable address → after backfill, rows have `lat`/`lng` and distances
  become finite on re-fetch.
- Address that fails to geocode → row retained (per U2), distance stays unknown, no crash.
- Backfill loop respects its round bound and stops when no rows remain.

### U7. Improve leased-data coverage (cron breadth)

**Goal:** The daily leased scrape populates meaningfully more than ~1 suburb/row, so common rental suburbs have
local comps without relying on on-demand scrape.

**Requirements:** R1 (durably)

**Dependencies:** U5 (shares the per-suburb leased scrape helper)

**Files:**
- `src/lib/rental-scraper.ts` — `runDailyLeasedScrape` suburb selection/rotation and per-suburb page count
- `src/lib/cache-refresh.ts` — if leased uses the rotating-suburb helper, widen the leased rotation

**Approach:** Review how many suburbs/pages the daily leased job covers; increase breadth (more suburbs/day or
more pages/suburb) within Apify rate/credit limits. Confirm `UNIQUE(address, leased_date)` upserts rather than
silently dropping. This is tuning, not a behaviour change — measure stored-row growth after a run.

**Execution note:** verify against real Apify output for one suburb before widening the rotation, to confirm
leased pages return enough listings to justify the breadth increase.

**Patterns to follow:** the rotating sold/on-market scrape breadth in `cache-refresh.ts` and `onmarket-scraper.ts`.

**Test scenarios:**
- Run leased scrape for a known-active rental suburb → stored count > 1.
- Re-run same suburb → upsert, no duplicate-key errors, counts stable or growing by genuinely new listings.
- Test expectation: coverage tuning is measured via a manual/cron run, not a unit assertion — validate by
  inspecting `leased_properties` row counts before/after.

---

## Scope Boundaries

**In scope:** rental Step 4 display/filtering correctness (distance, bands, labels, dates) and leased-data
population (on-demand scrape route, coordinate backfill, cron breadth).

### Deferred to Follow-Up Work
- Property images for leased/on-market rental listings (Apify doesn't extract them — a known project-wide gap).
- The Step 5 "For Rent" listings path (`ForSalePropertiesStep` in rental mode) — out of scope here unless the
  same label/filter defects are found there; flag separately if so.
- Backfilling historical leased data en masse (one-time import) beyond what cron breadth (U7) achieves.

**Non-goals:** redesigning the tiered comparables UI; changing the sale proposal behaviour (all sale paths must
remain regression-clean).

---

## Risks & Dependencies

- **Apify leased coverage may be genuinely thin** for some outer-growth suburbs (new estates). U2's graceful
  handling + manual add is the floor; U5/U7 improve but can't guarantee density. Mitigation: manual-add path
  must stay first-class in rental mode.
- **Geocoding rate limits** (Nominatim) — U6 must stay bounded and background, as the sold path already is.
- **Regression surface:** `SoldPropertiesStep` is shared. Every unit must verify the sale path is unchanged —
  call this out explicitly in each unit's tests.
- **Apify credit cost** for widened leased rotation (U7) — tune within existing daily budget.

---

## Verification Strategy

- Build a rental proposal end-to-end for a known suburb (e.g. Cranbourne North): Step 4 returns leased comps,
  none wrongly filtered, bands reflect weekly rent, all copy reads "leased".
- Build a sale proposal for the same suburb: Step 4 behaviour unchanged (sold data, sale bands, sold copy).
- Trigger the no-data path for a sparse rental suburb: leased scrape fires, rows appear after re-fetch.
- Inspect `leased_properties` after a leased scrape run: coordinates present on new rows, counts growing.
