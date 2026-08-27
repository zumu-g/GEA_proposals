# Backfill request — Casey/Cardinia sold & on-market properties missing from everypropertyAI

Hi everypropertyAI team,

Your property data for our Casey/Cardinia suburbs is currently **incomplete and price-skewed**, which is breaking comparable-sales in our proposals.

**The problem, concretely:**
- **Sold:** for Berwick your `/api/sold-sales` returns ~440 records, ~433 of them **over $900k**, and includes garbage values (we saw a **$140,000,000** row). In reality Berwick sold activity is mostly **under $900k** (median ≈ $720–780k). The net effect is proposals show almost no sub-$900k comparables.
- **On-market:** your `/api/on-market-listings` holds only **633 listings across all our suburbs combined** — far short of what's actually on the market.

We diffed your data against our agency's legacy database (matched on normalised street address). The two attached files are **only the properties you are missing** — already-present records have been excluded, so you can ingest these directly.

## Attached files

### 1. `missing-from-ep-sold.json` — 2,071 sold properties
- Sold records **absent from your `/api/sold-sales`**, across 40 suburbs.
- Price spread: **min $220k / median $720k / max $15.5M**; **82% are under $900k** (the band you're missing). 1,797 sold within the last 24 months.

### 2. `missing-from-ep-onmarket.json` — 2,159 on-market listings
- Live/recent listings **absent from your `/api/on-market-listings`**, across 45 suburbs (you currently have only 633 total).
- Median ≈ $769k; 74% under $900k.

## Schema (identical for both files — one object per property)

| field | notes |
|---|---|
| `address` | full street address, e.g. `"12 Smith St, Berwick VIC 3806"` |
| `suburb`, `state`, `postcode` | derived; `state` always `"VIC"` |
| `price` | integer AUD. Sold = sale price (always > 0). On-market = list/guide price (may be `0` or `1` where the source had no clean figure — re-price on your side). |
| `bedrooms`, `bathrooms`, `car_spaces` | integers; `0` where unknown |
| `property_type` | `House`, `Unit`, `Townhouse`, etc. |
| `sold_date` | `YYYY-MM-DD` for sold; empty string `""` for on-market |
| `url` | mostly empty (we don't retain listing URLs) |
| `image_url` | REA static image where available |
| `lat`, `lng` | usable but some sit at the suburb centroid — prefer your own geocoding |
| `land_size` | integer m² (or `null`) |
| `source` | always `"gea-legacy-db"` (provenance tag) |

## Ingestion guidance

- **Match / dedupe** on normalised street address (+ `sold_date` for sold). These are already filtered to addresses you don't have, but please re-check on your side before inserting.
- Treat our `price` and `sold_date` as **authoritative for the sold set**.
- **On-market prices** are lower quality — re-scrape/re-price from the listing where you can; a few rows carry placeholder values like `$1`. Drop or correct those rather than storing them verbatim.
- **Coordinates:** prefer your own per-property geocoding; only fall back to our `lat`/`lng` where you have none.
- **beds/baths:** present for most rows; verify against your own data where possible.
- Please also **purge implausible outliers** already in your data (e.g. sold price > $50M, the $140M row) so they stop surfacing.

## Goal

Restore a **natural price distribution** for both sold and on-market data across every Casey/Cardinia suburb, so comparable-sales lookups return the full range — not just $900k+. After ingest, `GET /api/sold-sales?suburb=Berwick&state=VIC` should show a spread similar to the attached (majority under $900k), and `/api/on-market-listings` should reflect the true volume of current listings.

Thanks!
