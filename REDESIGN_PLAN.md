# GEA Proposal System Redesign Plan

## Overview

Transform the current basic web app into a polished, designer-quality proposal presentation system with email delivery to vendors.

---

## Current State

- **Design:** Generic sky blue/purple palette, centered layouts, standard web app feel
- **Functionality:** Proposal creation form, viewing page, basic approval button
- **Storage:** JSON files on disk
- **Missing:** Email delivery, template customization, premium design

---

## Target State

### 1. Visual Redesign

Apply the STYLE_GUIDE.md properly:

**Color Palette:**
- Charcoal (#1A1A1A) - Primary backgrounds, dark sections
- Off-White (#FAFAFA) - Light backgrounds
- Warm Gold (#C4A962) - Accents, highlights, CTAs
- Sage Green (#8B9F82) - Secondary accents
- Forest (#2D3830) - Dark accent blocks

**Typography:**
- Lowercase headlines (not title case)
- Clean sans-serif (Inter) for body
- Modern serif (Playfair Display) for accents/quotes
- Generous line spacing (1.5-2.0)
- Light/regular weight, not always bold

**Layout Principles:**
- Left-aligned headlines (NOT centered)
- Generous whitespace - 25-30% of sections left empty
- One idea per section
- Image-left layouts for property photos
- Full-bleed imagery

### 2. Scroll Experience

Convert to a sectioned, presentation-style scroll:

```
Section 1: Hero
- Full-height dark background
- Property address large, lowercase
- Subtle gold accent line
- Optional property hero image (full-bleed)

Section 2: Introduction
- "your property" headline (lowercase)
- Brief intro text on right
- Agency commitment statement

Section 3: Sale Process Timeline
- "the journey" headline
- Horizontal timeline (desktop) / vertical (mobile)
- 6 steps with gold accent markers
- Minimal text per step

Section 4: Marketing Plan
- "our approach" headline
- Grid of 4-5 marketing channels
- Icons minimal, text-focused
- Dark background section for contrast

Section 5: Market Evidence
- "recent sales" headline
- Property cards with images
- Clean data presentation
- Sortable by price/distance/date

Section 6: Investment / Fees
- "your investment" headline
- Clear fee structure
- Commission rates
- What's included

Section 7: Next Steps / Approval
- "the next step" headline
- Clear CTA to approve
- Contact details subtle
- Confidence without being salesy
```

### 3. Template System Architecture

**Per-Property Customization:**
```
/data/proposals/[id].json
{
  id: string,
  clientName: string,
  clientEmail: string,
  propertyAddress: string,
  propertyImages: string[],  // NEW: Array of image URLs
  heroImage: string,         // NEW: Main hero image
  recentSales: Sale[],
  saleProcess: Step[],       // Customizable steps
  marketingPlan: Channel[],  // Customizable channels
  fees: {                    // NEW: Fee structure
    commissionRate: number,
    fixedFees: Fee[],
    inclusions: string[]
  },
  agency: {                  // NEW: Agency branding
    name: string,
    logo: string,
    primaryColor: string,
    accentColor: string,
    contactEmail: string,
    contactPhone: string
  },
  status: 'draft' | 'sent' | 'viewed' | 'approved',
  sentAt: string | null,
  viewedAt: string | null,
  approvedAt: string | null
}
```

**Agency Branding Config:**
```
/data/agency-config.json
{
  name: "Grant Estate Agents",
  logo: "/images/logo.png",
  primaryColor: "#1A1A1A",
  accentColor: "#C4A962",
  defaultCommissionRate: 1.5,
  contactEmail: "info@gea.co.uk",
  contactPhone: "01onal 123 456",
  address: "..."
}
```

### 4. Email Workflow

**Flow:**
1. Agent creates proposal (existing form + new fields)
2. Agent clicks "Send to Vendor"
3. System sends branded email with:
   - Property address as subject
   - Brief intro text
   - "View Your Proposal" button linking to `/proposal/[id]`
4. Vendor clicks link, views proposal
5. System tracks: sent, viewed, approved timestamps
6. Agent notified on approval (email or dashboard)

**Email Template:**
```
Subject: Your Property Sale Proposal - [Address]

Dear [Client Name],

Please find your personalised property sale proposal ready for review.

[View Your Proposal] <- Button linking to proposal URL

We look forward to discussing this with you.

[Agency Name]
[Contact Details]
```

**Email Integration Options:**
- Resend (recommended - modern, simple API)
- SendGrid
- AWS SES
- Nodemailer with SMTP

### 5. Tracking & Dashboard (Future)

**Vendor-facing URL:** `/proposal/[id]`
**Agent dashboard:** `/dashboard` (future)

Dashboard shows:
- All proposals with status
- Sent/Viewed/Approved counts
- Recent activity
- Quick actions (resend, edit, delete)

---

## Implementation Phases

### Phase 1: Visual Redesign
- [ ] Update tailwind.config.js with new color palette
- [ ] Update globals.css with typography defaults
- [ ] Redesign HeroSection component
- [ ] Redesign SaleProcess component (timeline)
- [ ] Redesign MarketingPlan component
- [ ] Redesign RecentSales component
- [ ] Create section dividers
- [ ] Add scroll-based animations
- [ ] Mobile optimization pass

### Phase 2: Template System
- [ ] Extend Proposal type with new fields
- [ ] Create agency-config.json
- [ ] Update proposal creation form
- [ ] Add image upload/URL fields
- [ ] Add fee structure fields
- [ ] Update API routes

### Phase 3: Email Integration
- [ ] Choose email provider (Resend recommended)
- [ ] Create email templates
- [ ] Add "Send to Vendor" functionality
- [ ] Track sent/viewed/approved status
- [ ] Update proposal page to record view
- [ ] Send notification on approval

### Phase 4: Dashboard (Optional)
- [ ] Agent login/auth
- [ ] Proposal list view
- [ ] Status filtering
- [ ] Analytics

---

## Technical Decisions

**Email Provider:** Resend
- Modern API, great DX
- Free tier: 100 emails/day
- Easy Next.js integration

**Image Storage Options:**
- Cloudinary (recommended for transforms)
- Vercel Blob
- AWS S3
- Local /public folder (dev only)

**Database (when scaling beyond JSON files):**
- Supabase (Postgres + auth + storage)
- PlanetScale (MySQL)
- Prisma ORM for type safety

---

## Design Mockup Descriptions

### Hero Section
```
┌────────────────────────────────────────────────────┐
│                                                    │
│  ▔▔▔▔▔▔▔▔▔▔ (thin gold line)                      │
│                                                    │
│  42 wellington road                                │
│  brighton bn1 4pg                                  │
│                                                    │
│                                  [prepared for     │
│                                   mr & mrs smith]  │
│                                                    │
│                                                    │
│                                                    │
└────────────────────────────────────────────────────┘
Background: Charcoal #1A1A1A
Text: White, lowercase
Accent: Gold line at top
```

### Sale Process
```
┌────────────────────────────────────────────────────┐
│                                                    │
│  the journey                                       │
│                                                    │
│  ●────●────●────●────●────● (gold dots)           │
│  1    2    3    4    5    6                       │
│                                                    │
│  consultation  valuation  prep  launch  viewings  │
│                                   & marketing     │
│                                                    │
│                                                    │
└────────────────────────────────────────────────────┘
Background: Off-white #FAFAFA
Dots: Gold #C4A962
Text: Charcoal, minimal
```

### Market Evidence Card
```
┌──────────────────────┐
│ [Property Image]     │
│                      │
│ 38 marine parade     │
│ £425,000             │
│                      │
│ 3 bed · 0.2 miles    │
│ sold 14 jan 2024     │
└──────────────────────┘
Clean, minimal, no borders
Subtle shadow on hover
```

---

## Files to Modify

### Config Updates
- `tailwind.config.js` - New color palette, fonts
- `src/styles/globals.css` - Typography defaults

### Component Rewrites
- `src/components/Proposal/HeroSection.tsx`
- `src/components/Proposal/SaleProcess.tsx`
- `src/components/Proposal/MarketingPlan.tsx`
- `src/components/Proposal/RecentSales.tsx`
- `src/components/Proposal/ApprovalButton.tsx`

### New Components
- `src/components/Proposal/SectionDivider.tsx`
- `src/components/Proposal/FeeStructure.tsx`
- `src/components/Proposal/NextSteps.tsx`
- `src/components/Email/ProposalEmail.tsx`

### Type Updates
- `src/types/proposal.ts` - Extended fields

### New API Routes
- `src/app/api/send/route.ts` - Send email
- `src/app/api/track/route.ts` - Track views

---

## Notes

- Keep mobile-first approach
- Test on real devices
- Consider print stylesheet for PDF export later
- Agency may want multiple property images (gallery)
- Approval should feel confident, not pushy

---

*Plan Version 1.0 - Created 2026-02-05*
*Resume this plan when ready to implement*
