# GEA Proposals - Project Instructions

## What This Is
Estate agency proposal system for Grant Estate Agents. Creates shareable luxury proposal pages for property vendors (Next.js 14 + TypeScript + Tailwind + Framer Motion).

## Current Priority: Phase 5 - Design Polish
The proposal page design needs to be elevated from "functional template" to "bespoke luxury brochure". Key issues to fix:
- WCAG contrast failures (avoid text-white/40 on dark backgrounds)
- Gold accent lines overused — vary decorative elements
- CSS gradient placeholders need real/generated imagery
- Cards look generic — need premium depth (shadows, layering)
- Missing stagger animations, parallax, scroll progress
- No brand identity assets (logos, lettermarks)

## Design Tools Available
- **Impeccable plugin** — /impeccable:audit, /impeccable:critique, /impeccable:bolder, /impeccable:polish
- **Page Design Guide MCP** — typography hierarchy, font pairing, color psychology
- **Figma MCP** — design token extraction (needs OAuth on first use)
- **Paper MCP** — visual HTML/CSS canvas (needs Paper Desktop app running)
- **Design Critique MCP** — screenshot-based design analysis

## Dev Commands
- `npx next dev -p 4777` — dev server (use port 4777)
- `npx next build` — production build

## Design Palette
- Charcoal: #1A1A1A | Gold: #C4A962 | Sage: #8B9F82 | Forest: #2D3830
- Fonts: Playfair Display (headlines) + Inter (body)
- Style: lowercase headlines, left-aligned, magazine/editorial feel
