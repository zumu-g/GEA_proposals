# GEA Proposals - Project Instructions

## What This Is
Estate agency proposal system for Grant Estate Agents. Creates shareable luxury proposal pages for property vendors. Email a brief to `newproposal@agentmail.to` and the system auto-generates a proposal with comparable sales.

**Stack:** Next.js 14 + TypeScript + Tailwind + Framer Motion + SQLite + AgentMail + Firecrawl

## Current Priority: Phase 6 - Pipeline & Nurture System

### Done:
- SQLite database (replaced JSON files) — tables: proposals, activities, nurture_plans, nurture_touchpoints, sold_properties
- AgentMail email intake — polls `newproposal@agentmail.to`, parses brief, creates proposals
- **Sold properties DB** — Firecrawl scrapes realestate.com.au sold listings, stores in SQLite with geocoded lat/lng. 14 suburbs, 700+ properties. Daily cron refresh at 7am AEST
- **Address autocomplete** — VIC-only suggestions from realestate.com.au suggest API with debounced dropdown
- **Geocoding** — Nominatim (OpenStreetMap) with AU street abbreviation expansion + suburb fallback
- **Property hero images** — Firecrawl scrapes REA property pages, alt-text matching for correct property photos
- **Distance from subject** — actual property geocoding (not first comparable's coords), haversine distance calculation
- **Neighboring suburb search** — comparable sales search includes 3 adjacent suburbs for wider coverage
- Cron auto-polling every 5 mins (node-cron + Next.js instrumentation)
- Pipeline dashboard at `/dashboard` — kanban board, stats, activity log
- API routes for poll-inbox, cron control, comparables lookup, dashboard data, geocoding, scraping

### TODO:
- AI nurture engine (Claude API for follow-up emails/call reminders)
- Agent notifications (view alerts, call due reminders)
- Proposal editing (admin UI to modify before sending)
- Property images from property.com.au (better coverage for some properties)
- Batch geocoding for properties without coords

## Email-to-Proposal Workflow
1. Email `newproposal@agentmail.to` with brief (see format below)
2. Cron polls every 5 mins (or hit `GET /api/poll-inbox`)
3. System parses email, looks up comparable sales, creates proposal
4. Auto-replies with proposal link
5. Monitor on `/dashboard`

### Email Format:
```
Subject: New Proposal - 42 Smith St, Brighton VIC 3186

Client: Tom & Lisa Chen
Email: tom.chen@example.com
Address: 42 Smith St, Brighton VIC 3186
Price Guide: $2,200,000 - $2,400,000
Method: Auction
Commission: 1.8%
Marketing Budget: $12,000
```
Optionally attach a CSV of comparable sales (overrides auto-lookup).

## Dev Commands
- `npx next dev -p 4777` — dev server (cron auto-starts)
- `npx next build` — production build
- `npm run migrate` — migrate JSON proposals to SQLite
- `npm run cron` — standalone cron poller (outside Next.js)

## Environment Variables (`.env`)
```
AGENTMAIL_API_KEY=am_us_...
AGENTMAIL_INBOX=newproposal@agentmail.to
NEXT_PUBLIC_BASE_URL=http://localhost:4777
AGENCY_EMAIL=info@grantestate.com.au
APIFY_API_TOKEN=apify_api_...          # realestate.com.au scraper (monthly limit, fallback only)
FIRECRAWL_API_KEY=fc-...               # Firecrawl for scraping REA sold listings + property images
```

## API Routes
- `POST /api/proposals` — create proposal (FormData + CSV/Excel)
- `GET /api/proposals` — list all | `?id=X` single
- `POST /api/send` — send proposal email to client
- `POST /api/track` — record proposal view
- `POST /api/approve` — approve proposal + notify agency
- `GET/POST /api/poll-inbox` — poll AgentMail for new proposals
- `GET/POST /api/cron` — cron status / start / stop
- `GET /api/comparables?address=X` — comparable sales (local-db → cache → homely)
- `GET /api/comparables?address=X&source=local` — force local DB only
- `GET /api/comparables?address=X&refresh=true` — force re-scrape
- `POST /api/comparables` — lookup + save to proposal `{ proposalId }`
- `GET /api/dashboard` — dashboard data with computed fields
- `GET /api/address-suggest?q=X` — VIC address autocomplete from realestate.com.au
- `GET /api/geocode?address=X` — geocode address to lat/lng via Nominatim
- `POST /api/scrape-sold` — trigger Firecrawl scrape `{ suburb, pages }` (geocodes inline)
- `GET /api/property-images?address=X` — fetch property photos via Firecrawl → Apify → homely

## Design Palette
- Charcoal: #1A1A1A | Gold: #C4A962 | Sage: #8B9F82 | Forest: #2D3830
- Fonts: Playfair Display (headlines) + Inter (body)
- Style: lowercase headlines, left-aligned, magazine/editorial feel

## Data Pipeline (Comparable Sales)
1. **Primary: Local SQLite** (`sold_properties` table) — Firecrawl-scraped REA data, geocoded
2. **Fallback: Homely.com.au** — scrapes sold listings pages, parses Apollo cache
3. **Fallback: Apify** — REA scraper actor (monthly limit, often exceeded)
4. **Distance**: client-side haversine from geocoded subject property
5. **Neighboring suburbs**: `NEIGHBORING_SUBURBS` map in comparables-lookup.ts (40 suburbs)
6. **Cron**: daily 7am AEST refresh for active proposal suburbs

## Cron Jobs
- **Inbox poll**: every 5 mins — checks AgentMail for new proposal emails
- **Nurture**: every 15 mins — processes nurture touchpoints
- **On-market cache**: daily 6am AEST — refreshes for-sale listings
- **Sold cache**: weekly Mon 5am AEST — refreshes homely sold data
- **Firecrawl sold**: daily 7am AEST — scrapes REA sold listings for active suburbs

## Key Files
- `/data/gea.db` — SQLite database (gitignored)
- `/data/agency-config.json` — agency defaults
- `/src/lib/db.ts` — database connection + schema (incl. sold_properties table)
- `/src/lib/proposal-generator.ts` — CRUD (SQLite)
- `/src/lib/email-intake.ts` — AgentMail polling + proposal creation
- `/src/lib/comparables-lookup.ts` — sold data lookup, address parser, neighboring suburbs map
- `/src/lib/firecrawl-scraper.ts` — Firecrawl REA scraper for sold + on-market listings
- `/src/lib/property-cache.ts` — SQLite cache layer + sold_properties CRUD
- `/src/lib/property-image-lookup.ts` — hero image fetcher (Firecrawl → Apify → REA → domain → homely)
- `/src/lib/geocoding.ts` — Nominatim geocoding with AU abbreviation expansion
- `/src/lib/address-suggest.ts` — realestate.com.au address autocomplete
- `/src/lib/cache-refresh.ts` — cache refresh logic + daily Firecrawl refresh
- `/src/lib/cron.ts` — node-cron scheduler (5 jobs)
- `/src/lib/email.ts` — Resend email integration
- `/src/components/Proposal/` — proposal page components
- `/src/components/Dashboard/` — pipeline dashboard components
