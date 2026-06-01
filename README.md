# GEA Property Proposal System

A professional, responsive online proposal system for estate agencies. Generate beautiful proposals from spreadsheet data that clients can view and approve on any device.

## Features

- 📱 **Mobile-First Design** - Optimized for iPhone and all mobile devices
- 🎨 **Professional UI** - Clean, modern design that represents your brand
- 📊 **Spreadsheet Integration** - Import recent sales data from CSV or Excel
- ✍️ **Dynamic Proposals** - Generate unique proposal URLs for each client
- ✅ **Approval System** - Clients can approve proposals with a single click
- 📧 **Email Ready** - Share proposal links via email

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Creating a Proposal via Web Interface

1. Go to the home page
2. Fill in:
   - Client Name
   - Client Email
   - Property Address
   - (Optional) Upload a CSV/Excel file with recent sales data
3. Click "Create Proposal"
4. Copy the generated URL and email it to your client

### Creating a Proposal via Command Line

```bash
npm run import "John Smith" "john@example.com" "123 Main St, London" data/sales.csv
```

### Spreadsheet Format

Your spreadsheet should include the following columns (some are optional):

**Required:**
- Address / Property Address
- Price / Sale Price
- Date / Sale Date

**Optional:**
- Bedrooms / Bed
- Bathrooms / Bath
- Square Footage / Sqft
- Distance (miles/km)
- URL / Property URL
- Image URL / Image

The system will automatically detect column names with variations (e.g., "Property Address", "Address", "Property").

## Project Structure

```
/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   ├── lib/              # Utilities and helpers
│   ├── types/            # TypeScript type definitions
│   └── styles/           # Global styles
├── data/
│   └── proposals/        # Generated proposal JSON files
├── scripts/              # Utility scripts
└── public/               # Static assets
```

## Deployment

This project is ready to deploy on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Deploy automatically

For other platforms, run `npm run build` and deploy the `.next` folder.

## Customization

### Branding

Edit `tailwind.config.js` to customize colors:

```javascript
colors: {
  primary: {
    // Your brand colors
  }
}
```

### Default Content

Edit the default sale process and marketing plan in `src/lib/spreadsheet-parser.ts`:

- `DEFAULT_SALE_PROCESS`
- `DEFAULT_MARKETING_PLAN`

## Environment Variables

Create a `.env.local` file (optional):

```
AGENCY_EMAIL=your-email@example.com
```

## PropertyIQ data (everypropertyAI)

Step 1 of the proposal wizard has a **"look up property from everyproperty"** panel that pulls
presentation-ready property data from PropertyIQ via the `everypropertyai` CLI and seeds the
proposal with it.

**Prerequisites**
- The `everypropertyai` CLI must be callable (`everypropertyai --version`). It's installed via
  `npm link` from the everypropertyAI repo. If it isn't on `PATH`, set `EVERYPROPERTY_CLI_BIN` to
  its built `dist/cli.js`.
- PropertyIQ must be reachable at `EVERYPROPERTY_API_URL`.

**Environment**

```
EVERYPROPERTY_API_URL=http://localhost:3007   # dev; set to the deployed PropertyIQ URL in prod
EVERYPROPERTY_API_TOKEN=                       # optional bearer if data routes get auth
# EVERYPROPERTY_CLI_BIN=                        # optional: absolute path to dist/cli.js
```

**Data access** — `src/lib/everyproperty.ts` shells out to the CLI (no PropertyIQ logic is
reimplemented) and exposes two functions, surfaced via `GET /api/everyproperty`:
- `getProposalData(address)` → presentation-ready property data (`?address=...`)
- `suggestAddresses(query)` → address suggestions for the search box (`?q=...`)

**Lookup flow** — search an address → pick a suggestion → fetch proposal data → preview
(estimate, beds/baths/land, hero photos, agency, description, confidence) → **use this data**,
which seeds the address, price guide, and hero image. Existing user-entered values are never
overwritten.

> **Latency:** `getProposalData` runs the full PropertyIQ pipeline. An **uncached address can take
> up to ~120s** (it triggers a live crawl); cached addresses return in <2s. The API route allows up
> to ~160s and the UI shows a loading state.

## License

Private - For GEA use only

