# Pickup Prompt — GEA Digital Proposal System

Copy and paste this to continue where we left off:

---

I'm continuing work on the GEA digital proposal system for Grant's Estate Agents. Check your memory files for full context.

## Where we left off (2026-03-18)

We restored the designer UI, fixed branding from gold to Grant's red (#C41E2A), added new proposal sections (AdvertisingSchedule, AreaAnalysis, AgentProfile), and built auto property image lookup from realestate.com.au.

## Priority items for today

1. **Property image lookup is being rate-limited by realestate.com.au (429)** — need a workaround. Options: add delays between requests, use a different property data source, or rely more on manual image URLs.

2. **Fix ViewTracker** — it calls `POST /api/track` which was deleted. Either restore the tracking API route or remove the ViewTracker component from the proposal page.

3. **Email poller keeps retrying failed emails** — the 4 old emails in the inbox without proper addresses get retried every 5 minutes. Need to mark them as processed/skipped after first failure.

4. **Magazine-style property images** — Stuart wants more polished, magazine-style presentation of property photos in the proposal. The PropertyGallery component exists but could be more visually impressive.

5. **Set up Resend API** — need RESEND_API_KEY to actually send proposal emails to clients.

6. **Agent photo** — add Stuart's photo to `data/agency-config.json` for the AgentProfile component.

## How to run

```bash
cd "/Users/stuartgrant_mbp13/Library/Mobile Documents/com~apple~CloudDocs/GEA_Projects/GEA_ST_proposals"
npx next dev -p 4777
```

Then visit http://localhost:4777

## Key files

- `data/agency-config.json` — agency details (source of truth)
- `GEA Example proposals/` — PDF proposals (branding reference)
- `src/app/proposal/[id]/page.tsx` — main proposal page
- `src/lib/property-image-lookup.ts` — auto image fetch
- `src/lib/comparables-lookup.ts` — comparable sales from homely.com.au
- `src/lib/email-intake.ts` — AgentMail email processing
- `.env` — API keys (AgentMail configured, Resend not yet)
