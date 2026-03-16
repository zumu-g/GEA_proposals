# GEA Proposals - Project Instructions

## What This Is
Estate agency proposal system for Grant Estate Agents. Creates shareable luxury proposal pages for property vendors. Email a brief to `newproposal@agentmail.to` and the system auto-generates a proposal with comparable sales.

**Stack:** Next.js 14 + TypeScript + Tailwind + Framer Motion + SQLite + AgentMail

## Current Priority: Phase 6 - Pipeline & Nurture System

### Done:
- SQLite database (replaced JSON files) — tables: proposals, activities, nurture_plans, nurture_touchpoints
- AgentMail email intake — polls `newproposal@agentmail.to`, parses brief, creates proposals
- Auto comparable sales lookup from homely.com.au (no CSV needed)
- Cron auto-polling every 5 mins (node-cron + Next.js instrumentation)
- Pipeline dashboard at `/dashboard` — kanban board, stats, activity log
- API routes for poll-inbox, cron control, comparables lookup, dashboard data

### TODO:
- AI nurture engine (Claude API for follow-up emails/call reminders)
- Agent notifications (view alerts, call due reminders)
- Proposal editing (admin UI to modify before sending)

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

## API Routes
- `POST /api/proposals` — create proposal (FormData + CSV/Excel)
- `GET /api/proposals` — list all | `?id=X` single
- `POST /api/send` — send proposal email to client
- `POST /api/track` — record proposal view
- `POST /api/approve` — approve proposal + notify agency
- `GET/POST /api/poll-inbox` — poll AgentMail for new proposals
- `GET/POST /api/cron` — cron status / start / stop
- `GET /api/comparables?address=X` — preview comparable sales
- `POST /api/comparables` — lookup + save to proposal `{ proposalId }`
- `GET /api/dashboard` — dashboard data with computed fields

## Design Palette
- Charcoal: #1A1A1A | Gold: #C4A962 | Sage: #8B9F82 | Forest: #2D3830
- Fonts: Playfair Display (headlines) + Inter (body)
- Style: lowercase headlines, left-aligned, magazine/editorial feel

## Key Files
- `/data/gea.db` — SQLite database (gitignored)
- `/data/agency-config.json` — agency defaults
- `/src/lib/db.ts` — database connection + schema
- `/src/lib/proposal-generator.ts` — CRUD (SQLite)
- `/src/lib/email-intake.ts` — AgentMail polling + proposal creation
- `/src/lib/comparables-lookup.ts` — homely.com.au sold data
- `/src/lib/cron.ts` — node-cron scheduler
- `/src/lib/email.ts` — Resend email integration
- `/src/components/Proposal/` — proposal page components
- `/src/components/Dashboard/` — pipeline dashboard components
