# GEA Proposals - Project Instructions

## What This Is
Estate agency proposal system for Grant's Estate Agents. Creates shareable luxury proposal pages for property vendors. Multi-step wizard to build proposals with comparable sales, marketing plans, and fee structures.

**Live site:** https://proposalto.com (Railway deployment)
**Stack:** Next.js 14 + TypeScript + Tailwind + Framer Motion + SQLite (app data only) + AgentMail + everypropertyAI (all property data)

## Authentication
- Simple password gate: email + password (`grants` default, configurable via `AUTH_PASSWORD` env var)
- Cookie-based session (30 days), stored email for identification
- Protected routes: `/` (wizard), `/dashboard`, `/edit/*`, `/api/dashboard`, `/api/proposals`
- Public routes: `/proposal/[id]` (client-facing), `/login`, `/api/comparables`, `/api/geocode`
- CDN cache bypass: middleware sets `Cache-Control: private, no-store` on protected pages

## Wizard Steps
1. **Client Details** — name, email, property address (VIC autocomplete), property type selector (sale only), Express/full layout toggle
2. **Property & Sale** — hero image (auto-fetched from REA), method of sale, price guide, commission, visibility toggles (show/hide price range & commission on proposal)
3. **Marketing** — campaign items with costs
4. **Sold Properties** — auto-searches comparable sales by suburb + neighbors, distance filtering, same-street priority
5. **For Sale Properties** — on-market listings from everypropertyAI, with filters (distance, price, beds, baths, type, suburb, days listed), select all/deselect all, default unselected
6. **Review & Generate** — preview and create proposal

## Data Pipeline
All property data comes live from the everypropertyAI HTTP API — the app keeps **no local property database** and runs **no scrapers**.
- **Sold comparables**: `getComparables(suburb, 'sold')` → `/api/sold-sales` (accurate per-property lat/lng)
- **On-market listings**: `getComparables(suburb, 'buy')` → `/api/on-market-listings`
- **Rentals**: `getComparables(suburb, 'rent' | 'leased')` → `/api/rental-listings` ('leased' filters status=Leased; empty until the backend adds historical data)
- **Search fan-out**: `getComparablesForAddress()` queries subject suburb + `NEIGHBORING_SUBURBS` (one extra hop when thin), deduped
- **Distance**: client-side haversine; listings without coords are excluded when a distance filter is active
- **Neighboring suburbs + address parsing**: `src/lib/address-utils.ts`
- **Hero images / property details**: `/api/everyproperty` → `getProposalData()` (photos come from everypropertyAI)
- Runnable check: `npx tsx scripts/check-everyproperty-comparables.ts`

## Cron Jobs (2 jobs)
- **Inbox poll**: every 5 mins — checks AgentMail for new proposal emails
- **Nurture**: every 15 mins — processes nurture touchpoints

## Approval Emails
When a client approves a proposal, two emails are sent:
1. **Agent email** — comprehensive details: client info, price guide, commission, marketing campaign table, advertising schedule, comparable sales table
2. **Client confirmation** — thank you with agreed terms summary, marketing items, agent contact details

## Environment Variables
```
AGENTMAIL_API_KEY=am_us_...         # AgentMail email intake
AGENTMAIL_INBOX=newproposal@agentmail.to
NEXT_PUBLIC_BASE_URL=https://proposalto.com
AGENCY_EMAIL=info@grantsea.com.au   # Agent notification emails
AUTH_PASSWORD=grants                # Login password (default: grants)
RESEND_API_KEY=re_...               # Resend for approval/nurture emails
EMAIL_FROM=onboarding@resend.dev    # Email sender address
EVERYPROPERTY_API_URL=https://geaeverypropertyai-production.up.railway.app  # everypropertyAI HTTP API
EVERYPROPERTY_API_TOKEN=epai_...    # everypropertyAI bearer token (server-side only)
```

## everypropertyAI Integration
- Property data comes from the everypropertyAI HTTP API (authenticated, server-to-server, Bearer auth)
- `src/lib/everyproperty.ts` is a thin client, surfaced via `GET /api/everyproperty` and `/api/comparables`:
  - `getProposalData(address, { fast? })` → `GET /api/proposal?address=...[&fast=1]` — presentation-ready data
  - `suggestAddresses(query)` → `GET /api/search?q=...` — address suggestions (empty for q<3 chars)
  - `getComparables(suburb, type)` / `getComparablesForAddress(address, type)` → sold/buy/rent/leased comparables
- Uncached `/api/proposal` calls can take **~120s** (live crawl); pass `fast: true` for a faster, lower-fidelity path
- Two env vars: `EVERYPROPERTY_API_URL` and `EVERYPROPERTY_API_TOKEN`. The token is **server-side only** (never exposed to the browser)

## Railway Deployment
- **URL**: https://proposalto.com (custom domain via Porkbun DNS)
- **Railway URL**: https://geaproposals-production.up.railway.app
- **Volume**: `/app/data` mount for SQLite persistence (5GB)
- **Dockerfile**: Node 20 + Python for better-sqlite3 native build
- **Note**: Volume mount overlays `data/` directory — agency-config.json has hardcoded fallback in proposal-generator.ts
- **Note**: `data/gea.db` is gitignored — created automatically on boot (app data only: proposals, nurture, tracking)

## API Routes
- `POST /api/proposals` — create proposal (FormData + CSV/Excel)
- `GET /api/proposals` — list all | `?id=X` single (auth required)
- `POST /api/send` — send proposal email to client
- `POST /api/track` — record proposal view
- `POST /api/approve` — approve proposal + send emails to agent & client
- `GET/POST /api/poll-inbox` — poll AgentMail for new proposals
- `GET/POST /api/cron` — cron status / start / stop (auth required)
- `GET /api/comparables?address=X&type=sold|buy|leased|rent` — live everypropertyAI comparables (suburb + neighbours)
- `GET /api/dashboard` — dashboard data (auth required)
- `GET /api/address-suggest?q=X` — VIC address autocomplete
- `GET /api/geocode?address=X` — geocode via Nominatim
- `POST /api/auth` — login `{ email, password }` → sets auth cookie
- `DELETE /api/auth` — logout

## Design Palette
- Brand Red: #C41E2A | Charcoal: #1A1A1A | Sage: #8B9F82
- Fonts: Playfair Display (headlines) + Inter (body)
- Style: lowercase headlines, left-aligned, magazine/editorial feel

## Key Files
- `/data/gea.db` — SQLite database (gitignored, app data only — no property tables)
- `/data/agency-config.json` — agency defaults (hidden by volume mount on Railway)
- `/middleware.ts` — auth guard + CDN cache bypass
- `/src/lib/db.ts` — database connection + schema (auto-creates data dir)
- `/src/lib/proposal-generator.ts` — CRUD + agency config with hardcoded fallback
- `/src/lib/email.ts` — Resend emails: proposal, nurture, approval (agent + client)
- `/src/lib/email-intake.ts` — AgentMail polling + proposal creation
- `/src/lib/property-type-content.ts` — per-property-type copy, sale methods, process steps, visibility flags
- `/src/lib/everyproperty.ts` — everypropertyAI client: proposal data, comparables (all 4 types), address search
- `/src/lib/address-utils.ts` — address parser + 42-suburb neighbour map
- `/src/lib/geocoding.ts` — Nominatim geocoding with AU abbreviation expansion
- `/src/lib/address-suggest.ts` — realestate.com.au address autocomplete (VIC only)
- `/src/lib/cron.ts` — node-cron scheduler (2 jobs: inbox, nurture)
- `/src/components/Wizard/` — multi-step proposal wizard
- `/src/components/Proposal/` — proposal page components
- `/src/components/Dashboard/` — pipeline dashboard components

## Property Types
- `property_type` (TEXT, default `house`) on `proposals` — 7 values: house, unit, apartment, land, residential-development, commercial-property, commercial-land. Legacy rows read as `house`; rentals never carry a type (POST + PUT guards).
- `src/lib/property-type-content.ts` is the single source of truth: per-type copy overrides (house = empty baseline), sale-method lists, sale-process steps by (type, method) with case-insensitive lookup + per-type default fallback, comparables filter mapping (house = null → "Any"), `requiresComparables` waiver (false for land/dev/commercial), `showsVipBuyers` / `includesOpenHomes` / `showsBedsBaths` flags.
- Verification: `npx tsx scripts/check-property-type-content.ts` (library invariants) and `npx tsx scripts/check-property-type-migration.ts <db-copy>` (migration round-trip against a COPY of gea.db).

## Proposal Visibility Controls
- `show_price_range` (INTEGER, default 1) — toggle in wizard step 2 to show/hide price guide on client-facing proposal
- `show_commission` (INTEGER, default 1) — toggle in wizard step 2 to show/hide commission rate on client-facing proposal
- Both stored as DB columns on `proposals` table, migrated via ALTER TABLE for existing DBs
- Proposal page: BrandStatement respects `showPriceRange`, FeeStructureVisual accepts `showCommission` prop
- Commission is always stored internally (for approval emails, dashboard) regardless of visibility toggle

## On-Market Listings Filters
- **Distance**: primary pill filter (500m, 1km, 2km, 5km, 10km, Any)
- **Secondary filters** (collapsible): min/max price, bedrooms, bathrooms, property type, suburb text search, listed within (7d–6mo)
- **Select all / Deselect all** buttons in results header
- **Default**: listings start unselected — user picks which to include
- **Days on market**: shown as blue badge on each listing card when available from API
- Filters stored as component-local state, applied client-side against raw API results

## Known Issues / TODO
- Property images sometimes wrong — REA property history page has limited photos
- Proposal page components still use gold color scheme in places (should be red #C41E2A)
- ClosingStatement hardcodes agent photo path instead of using agentPhoto prop
- Leased (historical rental) comparables are empty until the everypropertyAI backend adds leased data to /api/rental-listings
- Data coverage/quality issues (missing suburbs, price outliers) are fixed in the everypropertyAI repo, not here
