import type { PropertyType, SaleStep } from '@/types/proposal'
import { PROPERTY_TYPES } from '@/types/proposal'

// ─────────────────────────────────────────────────────────────────────────────
// Property-type content library
//
// Single source of truth for everything that varies by subject property type:
// section copy overrides, sale-method options, sale-process steps, comparables
// filter mapping, and section-visibility flags.
//
// Copy overrides are OPTIONAL: a type without an override renders the
// component's existing (residential house) copy. House therefore carries no
// overrides — today's output is the house baseline and stays byte-identical.
// ─────────────────────────────────────────────────────────────────────────────

export interface SaleMethodOption {
  value: string
  label?: string
  description: string
}

export interface PropertyTypeCopy {
  /** BrandStatement headline/body override. */
  brandStatement?: string
  /** MarketingStrategy fallback text (used when the agent writes no approach). */
  marketingApproach?: string
  /** AreaAnalysis framing line. */
  areaAnalysisIntro?: string
  /** ProcessJourney intro line. */
  processIntro?: string
  /** FeeStructureVisual framing line. */
  feeFraming?: string
  /** ClosingStatement body override. */
  closingStatement?: string
  /** Persisted databaseInfo default (buyer database explanation). */
  databaseInfo?: string
}

export interface PropertyTypeContent {
  type: PropertyType
  label: string
  /** One-line disambiguation shown under the wizard selector. */
  helper?: string
  copy: PropertyTypeCopy
  saleMethods: readonly SaleMethodOption[]
  /**
   * Sale-process steps keyed by lowercase method name, plus a required
   * 'default' entry. Resolve via resolveSaleProcess() — never index directly.
   */
  saleProcessSteps: Record<string, SaleStep[]>
  /** Local-DB property_type values to pre-filter comparables by; null = no filter (no local data). */
  comparablesFilter: string[] | null
  /** Whether Step 4 requires at least one selected sold comparable. */
  requiresComparables: boolean
  showsVipBuyers: boolean
  includesOpenHomes: boolean
  showsBedsBaths: boolean
}

// ── Sale-method option sets ──────────────────────────────────────────────────

const RESIDENTIAL_METHODS: readonly SaleMethodOption[] = [
  { value: 'Auction', description: 'competitive bidding on auction day' },
  { value: 'Private Sale', description: 'offers accepted directly by the vendor' },
  { value: 'Expressions of Interest', description: 'written offers by a closing date' },
  { value: '', label: 'n/a', description: 'method to be confirmed' },
] as const

const DEVELOPMENT_METHODS: readonly SaleMethodOption[] = [
  { value: 'Expressions of Interest', description: 'written offers by a closing date' },
  { value: 'Tender', description: 'sealed offers by a deadline' },
  { value: 'Auction', description: 'competitive bidding on auction day' },
  { value: 'Private Sale', description: 'offers accepted directly by the vendor' },
  { value: '', label: 'n/a', description: 'method to be confirmed' },
] as const

const COMMERCIAL_METHODS: readonly SaleMethodOption[] = [
  { value: 'Expressions of Interest', description: 'written offers by a closing date' },
  { value: 'Tender', description: 'sealed offers by a deadline' },
  { value: 'Auction', description: 'competitive bidding on auction day' },
  { value: 'Private Sale', description: 'offers accepted directly by the vendor' },
  { value: '', label: 'n/a', description: 'method to be confirmed' },
] as const

// ── Sale-process step sets ───────────────────────────────────────────────────
// House arrays are lifted VERBATIM from the current behaviour:
// auction steps from src/app/api/proposals/route.ts, default steps from
// DEFAULT_SALE_PROCESS in src/lib/spreadsheet-parser.ts.

const HOUSE_DEFAULT_STEPS: SaleStep[] = [
  {
    step: 1,
    title: 'Initial Consultation',
    description: "We'll visit your property to assess its condition and market value.",
    duration: '1-2 hours',
    imageUrl: '/images/stocksy/consultation.jpg',
  },
  {
    step: 2,
    title: 'Property Valuation',
    description: 'Comprehensive market analysis to determine the optimal listing price.',
    duration: '2-3 days',
    imageUrl: '/images/stocksy/valuation.jpg',
  },
  {
    step: 3,
    title: 'Marketing Preparation',
    description: 'Professional photography, floor plans, and marketing materials creation.',
    duration: '5-7 days',
    imageUrl: '/images/stocksy/marketing-prep.jpg',
  },
  {
    step: 4,
    title: 'Launch & Promotion',
    description: 'Your property goes live across all major platforms with targeted marketing.',
    duration: 'Ongoing',
    imageUrl: '/images/stocksy/launch.jpg',
  },
  {
    step: 5,
    title: 'Viewings & Offers',
    description: 'We arrange and conduct viewings, managing all inquiries and negotiations.',
    duration: '2-8 weeks',
    imageUrl: '/images/stocksy/viewings.jpg',
  },
  {
    step: 6,
    title: 'Sale Completion',
    description: 'Once an offer is accepted, we manage the entire process through to completion.',
    duration: '8-12 weeks',
    imageUrl: '/images/stocksy/completion.jpg',
  },
]

const HOUSE_AUCTION_STEPS: SaleStep[] = [
  {
    step: 1,
    title: 'Auction Strategy Meeting',
    description: 'We meet to discuss your auction strategy, reserve price, and 4-week campaign plan. Together we align on expectations and set a clear path to auction day.',
    duration: '1–2 hours',
    imageUrl: '/images/stocksy/consultation.jpg',
  },
  {
    step: 2,
    title: 'Property Preparation',
    description: 'Professional photography, floor plans, and all marketing materials are produced and signed off before the campaign goes live.',
    duration: '5–7 days',
    imageUrl: '/images/stocksy/marketing-prep.jpg',
  },
  {
    step: 3,
    title: 'Campaign Launch',
    description: 'Your property goes live with a Premiere listing across realestate.com.au, Domain, and all major platforms. Maximum exposure from day one.',
    duration: 'Week 1',
    imageUrl: '/images/stocksy/launch.jpg',
  },
  {
    step: 4,
    title: 'Open Homes & Buyer Management',
    description: 'Weekly open homes throughout the campaign. We identify and qualify serious buyers, gather market feedback, and build competitive tension heading into auction day.',
    duration: 'Weeks 1–3',
    imageUrl: '/images/stocksy/viewings.jpg',
  },
  {
    step: 5,
    title: 'Auction Day',
    description: 'Competitive bidding in a transparent, public forum. Buyers compete openly — the highest bid above reserve secures the property and contracts are exchanged on the day.',
    duration: 'Week 4',
    imageUrl: '/images/stocksy/completion.jpg',
  },
  {
    step: 6,
    title: 'Post-Auction & Settlement',
    description: 'If sold under the hammer, contracts are exchanged immediately. If passed in, we negotiate directly with the highest bidder. We manage the full process through to settlement.',
    duration: '30–60 days',
    imageUrl: '/images/stocksy/valuation.jpg',
  },
]

const LAND_DEFAULT_STEPS: SaleStep[] = [
  {
    step: 1,
    title: 'Site Appraisal',
    description: 'We assess your land — dimensions, orientation, zoning, and services — and benchmark recent land sales to establish its market value.',
    duration: '1-2 hours',
    imageUrl: '/images/stocksy/consultation.jpg',
  },
  {
    step: 2,
    title: 'Pricing Strategy',
    description: 'Comprehensive analysis of comparable land sales and current demand from builders, developers, and owner-builders to set the optimal asking price.',
    duration: '2-3 days',
    imageUrl: '/images/stocksy/valuation.jpg',
  },
  {
    step: 3,
    title: 'Marketing Preparation',
    description: 'Aerial photography, site plans, and boundary overlays that show buyers exactly what the land offers and what could be built on it.',
    duration: '5-7 days',
    imageUrl: '/images/stocksy/marketing-prep.jpg',
  },
  {
    step: 4,
    title: 'Launch & Promotion',
    description: 'Your land goes live across all major platforms, targeted at builders, developers, and buyers searching for land in this corridor.',
    duration: 'Ongoing',
    imageUrl: '/images/stocksy/launch.jpg',
  },
  {
    step: 5,
    title: 'Inspections & Offers',
    description: 'We conduct on-site inspections and walk serious buyers through the block, managing all enquiries and negotiating every offer.',
    duration: '2-8 weeks',
    imageUrl: '/images/stocksy/viewings.jpg',
  },
  {
    step: 6,
    title: 'Sale Completion',
    description: 'Once an offer is accepted, we manage contracts and conditions through to settlement.',
    duration: '8-12 weeks',
    imageUrl: '/images/stocksy/completion.jpg',
  },
]

const LAND_AUCTION_STEPS: SaleStep[] = [
  {
    step: 1,
    title: 'Auction Strategy Meeting',
    description: 'We meet to discuss your auction strategy, reserve price, and 4-week campaign plan for the land, and set a clear path to auction day.',
    duration: '1–2 hours',
    imageUrl: '/images/stocksy/consultation.jpg',
  },
  {
    step: 2,
    title: 'Site Preparation',
    description: 'Aerial photography, site plans, and all marketing materials are produced and signed off before the campaign goes live.',
    duration: '5–7 days',
    imageUrl: '/images/stocksy/marketing-prep.jpg',
  },
  {
    step: 3,
    title: 'Campaign Launch',
    description: 'Your land goes live with a Premiere listing across realestate.com.au, Domain, and all major platforms. Maximum exposure from day one.',
    duration: 'Week 1',
    imageUrl: '/images/stocksy/launch.jpg',
  },
  {
    step: 4,
    title: 'Inspections & Buyer Management',
    description: 'On-site inspections throughout the campaign. We qualify serious buyers — builders, developers, and owner-builders — and build competitive tension heading into auction day.',
    duration: 'Weeks 1–3',
    imageUrl: '/images/stocksy/viewings.jpg',
  },
  {
    step: 5,
    title: 'Auction Day',
    description: 'Competitive bidding in a transparent, public forum. Buyers compete openly — the highest bid above reserve secures the land and contracts are exchanged on the day.',
    duration: 'Week 4',
    imageUrl: '/images/stocksy/completion.jpg',
  },
  {
    step: 6,
    title: 'Post-Auction & Settlement',
    description: 'If sold under the hammer, contracts are exchanged immediately. If passed in, we negotiate directly with the highest bidder. We manage the full process through to settlement.',
    duration: '30–60 days',
    imageUrl: '/images/stocksy/valuation.jpg',
  },
]

const DEVELOPMENT_DEFAULT_STEPS: SaleStep[] = [
  {
    step: 1,
    title: 'Development Potential Review',
    description: 'We assess the site\'s zoning, overlays, and realistic development yield, and identify the developer and builder audiences most likely to compete for it.',
    duration: '1-2 hours',
    imageUrl: '/images/stocksy/consultation.jpg',
  },
  {
    step: 2,
    title: 'Pricing & Campaign Strategy',
    description: 'Comparable development site sales and current developer demand inform the price strategy and the campaign structure — typically expressions of interest with a set closing date.',
    duration: '2-3 days',
    imageUrl: '/images/stocksy/valuation.jpg',
  },
  {
    step: 3,
    title: 'Information Pack Preparation',
    description: 'Site plans, aerial photography, zoning details, and any planning information are compiled into a professional information pack for qualified enquiries.',
    duration: '5-7 days',
    imageUrl: '/images/stocksy/marketing-prep.jpg',
  },
  {
    step: 4,
    title: 'Targeted Launch',
    description: 'The site is marketed across major platforms and directly to our database of developers, builders, and investors active in this corridor.',
    duration: 'Ongoing',
    imageUrl: '/images/stocksy/launch.jpg',
  },
  {
    step: 5,
    title: 'Enquiry & Offer Management',
    description: 'We manage due-diligence enquiries, conduct site inspections, and drive all interested parties toward the closing date to maximise competitive tension.',
    duration: '4-6 weeks',
    imageUrl: '/images/stocksy/viewings.jpg',
  },
  {
    step: 6,
    title: 'Negotiation & Settlement',
    description: 'We negotiate the strongest terms — price, deposit, and settlement conditions — and manage the contract through to completion.',
    duration: '8-12 weeks',
    imageUrl: '/images/stocksy/completion.jpg',
  },
]

const COMMERCIAL_DEFAULT_STEPS: SaleStep[] = [
  {
    step: 1,
    title: 'Commercial Appraisal',
    description: 'We assess the property\'s income profile, lease covenants, zoning, and position, benchmarked against recent commercial transactions in the area.',
    duration: '1-2 hours',
    imageUrl: '/images/stocksy/consultation.jpg',
  },
  {
    step: 2,
    title: 'Campaign Strategy',
    description: 'The sale method and price strategy are set around the property\'s buyer profile — investors, owner-occupiers, or developers — typically via expressions of interest.',
    duration: '2-3 days',
    imageUrl: '/images/stocksy/valuation.jpg',
  },
  {
    step: 3,
    title: 'Information Memorandum',
    description: 'A professional information memorandum is prepared covering income, outgoings, lease terms, zoning, and improvements, ready for qualified buyers.',
    duration: '5-7 days',
    imageUrl: '/images/stocksy/marketing-prep.jpg',
  },
  {
    step: 4,
    title: 'Targeted Launch',
    description: 'The property is marketed across commercial platforms and directly to our database of investors and owner-occupiers active in this market.',
    duration: 'Ongoing',
    imageUrl: '/images/stocksy/launch.jpg',
  },
  {
    step: 5,
    title: 'Inspections & Offers',
    description: 'We conduct private inspections, manage due-diligence enquiries, and drive all parties toward the closing date to maximise competitive tension.',
    duration: '4-8 weeks',
    imageUrl: '/images/stocksy/viewings.jpg',
  },
  {
    step: 6,
    title: 'Negotiation & Settlement',
    description: 'We negotiate the strongest terms — price, deposit, leaseback or vacant possession — and manage the contract through to settlement.',
    duration: '8-12 weeks',
    imageUrl: '/images/stocksy/completion.jpg',
  },
]

// ── Content records ──────────────────────────────────────────────────────────

const LAND_COPY: PropertyTypeCopy = {
  brandStatement: 'land is the one thing they aren\'t making more of. Selling yours well means reaching the builders, developers, and owner-builders competing for blocks in this corridor — and making them compete for yours.',
  marketingApproach: 'We are currently seeing consistent demand for land from builders, developers, and owner-builders across this corridor. The advertising campaign will target these buyers locally and out of area, with the majority searching on realestate.com.au and domain.com.au. The campaign is approved by you prior to launch and the results reviewed with you each week — a cost-effective, structured campaign that puts your land in front of every active land buyer in the market.',
  areaAnalysisIntro: 'Recent land sales in the area set the benchmark for your block.',
  processIntro: 'a clear, structured path from appraisal to settlement, built for land.',
  feeFraming: 'a single success fee, payable only when your land sells.',
  closingStatement: 'Your land deserves a campaign that shows buyers what it could become. We\'d be proud to run it.',
  databaseInfo: 'Our database gives your land instant exposure to active buyers the moment it is listed. Builders, developers, and owner-builders specifically seeking land in your area will be notified immediately.',
}

const DEVELOPMENT_COPY: PropertyTypeCopy = {
  brandStatement: 'development sites trade on potential — zoning, yield, and position. Selling yours well means presenting that potential professionally and putting it in front of every developer and builder active in this corridor.',
  marketingApproach: 'Developer and builder demand for well-positioned sites remains strong across this corridor. The campaign presents your site\'s development potential professionally — zoning, dimensions, and yield — and targets developers, builders, and investors directly through our database alongside the major platforms. The campaign is approved by you prior to launch and the results reviewed with you each week, driving all interested parties toward a competitive closing date.',
  areaAnalysisIntro: 'Recent site and land transactions in the area set the benchmark for your property.',
  processIntro: 'a structured campaign built to make developers compete — from information pack to closing date.',
  feeFraming: 'a single success fee, payable only when your site sells.',
  closingStatement: 'Your site\'s value lies in what can be built on it. We\'d be proud to run the campaign that makes developers compete for that opportunity.',
  databaseInfo: 'Our database gives your site instant exposure to active developers, builders, and investors the moment it is listed. Parties specifically seeking development opportunities in your area will be notified immediately.',
}

const COMMERCIAL_PROPERTY_COPY: PropertyTypeCopy = {
  brandStatement: 'commercial property is bought on numbers and sold on confidence. A professional campaign — clear information, qualified buyers, competitive tension — is what turns a good asset into a strong result.',
  marketingApproach: 'We are seeing steady demand from investors and owner-occupiers for well-positioned commercial property in this area. The campaign presents your property professionally — income, lease terms, and position — through a detailed information memorandum, marketed across the major commercial platforms and directly to our database of qualified buyers. The campaign is approved by you prior to launch and the results reviewed with you each week.',
  areaAnalysisIntro: 'Recent commercial transactions in the area provide context for your property\'s value.',
  processIntro: 'a professional commercial campaign — information memorandum, qualified buyers, competitive closing.',
  feeFraming: 'a single success fee, payable only when your property sells.',
  closingStatement: 'Your asset deserves a campaign run with the same rigour a buyer will apply to it. We\'d be proud to deliver that.',
  databaseInfo: 'Our database gives your property instant exposure to qualified commercial buyers the moment it is listed. Investors and owner-occupiers specifically seeking commercial property in your area will be notified immediately.',
}

const COMMERCIAL_LAND_COPY: PropertyTypeCopy = {
  brandStatement: 'commercial land trades on zoning, position, and possibility. Selling yours well means reaching the developers, investors, and owner-occupiers who can see what it could become.',
  marketingApproach: 'Demand for well-zoned commercial land remains steady from developers, investors, and owner-occupiers planning their next move. The campaign presents your land\'s zoning, dimensions, and potential professionally, marketed across the major commercial platforms and directly to our database of qualified buyers. The campaign is approved by you prior to launch and the results reviewed with you each week.',
  areaAnalysisIntro: 'Recent commercial land transactions in the area provide context for your property\'s value.',
  processIntro: 'a professional commercial campaign — clear information, qualified buyers, competitive closing.',
  feeFraming: 'a single success fee, payable only when your land sells.',
  closingStatement: 'Your land\'s value lies in what it makes possible. We\'d be proud to run the campaign that proves it.',
  databaseInfo: 'Our database gives your land instant exposure to qualified commercial buyers the moment it is listed. Developers, investors, and owner-occupiers seeking commercial land in your area will be notified immediately.',
}

export const PROPERTY_TYPE_CONTENT: Record<PropertyType, PropertyTypeContent> = {
  house: {
    type: 'house',
    label: 'house',
    copy: {}, // house is the baseline — components render their existing copy
    saleMethods: RESIDENTIAL_METHODS,
    saleProcessSteps: { default: HOUSE_DEFAULT_STEPS, auction: HOUSE_AUCTION_STEPS },
    comparablesFilter: ['house'],
    requiresComparables: true,
    showsVipBuyers: true,
    includesOpenHomes: true,
    showsBedsBaths: true,
  },
  unit: {
    type: 'unit',
    label: 'unit',
    helper: 'unit or townhouse in a small development',
    copy: {
      brandStatement: 'units and townhouses attract a wide field — first-home buyers, downsizers, and investors alike. Selling yours well means a campaign that reaches all three and makes them compete.',
    },
    saleMethods: RESIDENTIAL_METHODS,
    saleProcessSteps: { default: HOUSE_DEFAULT_STEPS, auction: HOUSE_AUCTION_STEPS },
    comparablesFilter: ['unit', 'apartment'],
    requiresComparables: true,
    showsVipBuyers: true,
    includesOpenHomes: true,
    showsBedsBaths: true,
  },
  apartment: {
    type: 'apartment',
    label: 'apartment',
    helper: 'apartment in a larger complex or high-rise',
    copy: {
      brandStatement: 'apartments sell on lifestyle and position. The right campaign puts yours in front of the first-home buyers, downsizers, and investors actively searching this area — and makes them compete.',
    },
    saleMethods: RESIDENTIAL_METHODS,
    saleProcessSteps: { default: HOUSE_DEFAULT_STEPS, auction: HOUSE_AUCTION_STEPS },
    comparablesFilter: ['unit', 'apartment'],
    requiresComparables: true,
    showsVipBuyers: true,
    includesOpenHomes: true,
    showsBedsBaths: true,
  },
  land: {
    type: 'land',
    label: 'land',
    helper: 'vacant residential block',
    copy: LAND_COPY,
    saleMethods: RESIDENTIAL_METHODS,
    saleProcessSteps: { default: LAND_DEFAULT_STEPS, auction: LAND_AUCTION_STEPS },
    comparablesFilter: ['land'],
    requiresComparables: false, // local sold DB has no land-typed rows — never hard-block
    showsVipBuyers: false,
    includesOpenHomes: false,
    showsBedsBaths: false,
  },
  'residential-development': {
    type: 'residential-development',
    label: 'development site',
    helper: 'land or property marketed for its development potential',
    copy: DEVELOPMENT_COPY,
    saleMethods: DEVELOPMENT_METHODS,
    saleProcessSteps: {
      default: DEVELOPMENT_DEFAULT_STEPS,
      'expressions of interest': DEVELOPMENT_DEFAULT_STEPS,
      tender: DEVELOPMENT_DEFAULT_STEPS,
      auction: LAND_AUCTION_STEPS,
    },
    comparablesFilter: ['land'],
    requiresComparables: false,
    showsVipBuyers: false,
    includesOpenHomes: false,
    showsBedsBaths: false,
  },
  'commercial-property': {
    type: 'commercial-property',
    label: 'commercial property',
    helper: 'offices, retail, industrial, or mixed-use buildings',
    copy: COMMERCIAL_PROPERTY_COPY,
    saleMethods: COMMERCIAL_METHODS,
    saleProcessSteps: {
      default: COMMERCIAL_DEFAULT_STEPS,
      'expressions of interest': COMMERCIAL_DEFAULT_STEPS,
      tender: COMMERCIAL_DEFAULT_STEPS,
    },
    comparablesFilter: null, // no local commercial data
    requiresComparables: false,
    showsVipBuyers: false,
    includesOpenHomes: false,
    showsBedsBaths: false,
  },
  'commercial-land': {
    type: 'commercial-land',
    label: 'commercial land',
    helper: 'vacant land zoned for commercial or industrial use',
    copy: COMMERCIAL_LAND_COPY,
    saleMethods: COMMERCIAL_METHODS,
    saleProcessSteps: {
      default: COMMERCIAL_DEFAULT_STEPS,
      'expressions of interest': COMMERCIAL_DEFAULT_STEPS,
      tender: COMMERCIAL_DEFAULT_STEPS,
    },
    comparablesFilter: null,
    requiresComparables: false,
    showsVipBuyers: false,
    includesOpenHomes: false,
    showsBedsBaths: false,
  },
}

/** Resolve a type's content with a house fallback for unknown/legacy values. */
export function getPropertyTypeContent(type?: string | null): PropertyTypeContent {
  if (type && (PROPERTY_TYPES as readonly string[]).includes(type)) {
    return PROPERTY_TYPE_CONTENT[type as PropertyType]
  }
  return PROPERTY_TYPE_CONTENT.house
}

/**
 * Resolve the sale-process steps for a (type, method) pair.
 * Method keys match case-insensitively; unknown or empty methods fall back to
 * the type's default steps. Rental proposals are handled upstream and never
 * reach this lookup.
 */
export function resolveSaleProcess(type: string | null | undefined, methodOfSale: string | null | undefined): SaleStep[] {
  const content = getPropertyTypeContent(type)
  const key = (methodOfSale || '').trim().toLowerCase()
  return content.saleProcessSteps[key] ?? content.saleProcessSteps.default
}

export { PROPERTY_TYPES }
