import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Proposal, PropertySale, SaleStep, MarketingItem, FeeInfo, AgencyConfig } from '@/types/proposal'
import { getDefaultProposalExtras } from '@/lib/proposal-generator'
import { generateId } from './utils'

export interface SpreadsheetRow {
  [key: string]: string | number | undefined
}

export interface ParsedSpreadsheetData {
  propertyAddress?: string
  salePrice?: string
  saleDate?: string
  bedrooms?: string | number
  bathrooms?: string | number
  squareFootage?: string | number
  distance?: string | number
  propertyUrl?: string
  imageUrl?: string
}

const DEFAULT_SALE_PROCESS: SaleStep[] = [
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

const DEFAULT_MARKETING_PLAN: MarketingItem[] = [
  {
    channel: 'Online Listings',
    description: 'Listings on Rightmove, Zoopla, OnTheMarket, and our website',
  },
  {
    channel: 'Social Media',
    description: 'Promoted posts on Facebook, Instagram, and LinkedIn targeting local buyers',
  },
  {
    channel: 'Photography',
    description: 'Professional photography and 360° virtual tour',
  },
  {
    channel: 'Email Marketing',
    description: 'Targeted email campaigns to our database of active buyers',
  },
  {
    channel: 'Signage',
    description: "Eye-catching 'For Sale' board positioned for maximum visibility",
  },
]

export function parseCSV(fileContent: string): SpreadsheetRow[] {
  const result = Papa.parse<SpreadsheetRow>(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  })

  if (result.errors.length > 0) {
    console.warn('CSV parsing errors:', result.errors)
  }

  return result.data
}

export function parseExcel(fileBuffer: Buffer): SpreadsheetRow[] {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
  const firstSheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[firstSheetName]
  const data = XLSX.utils.sheet_to_json<SpreadsheetRow>(worksheet)
  return data
}

function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim().replace(/[_\s]+/g, ' ')
}

function findColumn(rows: SpreadsheetRow[], possibleNames: string[]): string | null {
  if (rows.length === 0) return null

  const headers = Object.keys(rows[0])
  for (const header of headers) {
    const normalized = normalizeColumnName(header)
    if (possibleNames.some(name => normalized.includes(name))) {
      return header
    }
  }
  return null
}

export function extractPropertySales(rows: SpreadsheetRow[]): PropertySale[] {
  const addressCol = findColumn(rows, ['address', 'property'])
  const priceCol = findColumn(rows, ['price', 'sale price', 'amount'])
  const dateCol = findColumn(rows, ['date', 'sale date', 'sold date'])
  const bedroomsCol = findColumn(rows, ['bedroom', 'bed', 'beds'])
  const bathroomsCol = findColumn(rows, ['bathroom', 'bath', 'baths'])
  const sqftCol = findColumn(rows, ['sqft', 'square feet', 'square footage', 'size'])
  const distanceCol = findColumn(rows, ['distance', 'miles', 'km'])
  const urlCol = findColumn(rows, ['url', 'link', 'property url'])
  const imageCol = findColumn(rows, ['image', 'image url', 'photo'])

  if (!addressCol || !priceCol || !dateCol) {
    throw new Error('Required columns not found. Need at least: Address, Price, Date')
  }

  return rows
    .filter(row => row[addressCol] && row[priceCol])
    .map((row, index) => {
      const price = typeof row[priceCol] === 'string'
        ? parseFloat(row[priceCol].replace(/[£,\s]/g, ''))
        : Number(row[priceCol]) || 0

      return {
        address: String(row[addressCol] || `Property ${index + 1}`),
        price,
        date: String(row[dateCol] || new Date().toISOString()),
        bedrooms: bedroomsCol ? Number(row[bedroomsCol]) || 0 : 0,
        bathrooms: bathroomsCol ? Number(row[bathroomsCol]) || 0 : 0,
        sqft: sqftCol ? Number(row[sqftCol]) || 0 : 0,
        distance: distanceCol ? Number(row[distanceCol]) || 0 : 0,
        url: urlCol ? String(row[urlCol] || '') : '',
        imageUrl: imageCol && row[imageCol] ? String(row[imageCol]) : undefined,
      }
    })
}

export interface CreateProposalInput {
  clientName: string
  clientEmail: string
  propertyAddress: string
  heroImage?: string
  propertyImages?: string[]
  spreadsheetRows?: SpreadsheetRow[]
  saleProcess?: SaleStep[]
  marketingPlan?: MarketingItem[]
  fees?: FeeInfo
  agency?: AgencyConfig
}

export function createProposal(input: CreateProposalInput): Proposal {
  const recentSales = input.spreadsheetRows?.length
    ? extractPropertySales(input.spreadsheetRows)
    : []

  const defaults = getDefaultProposalExtras()

  return {
    id: generateId(),
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    propertyAddress: input.propertyAddress,
    heroImage: input.heroImage,
    propertyImages: input.propertyImages,
    proposalDate: new Date().toISOString(),
    saleProcess: input.saleProcess || DEFAULT_SALE_PROCESS,
    marketingPlan: input.marketingPlan || DEFAULT_MARKETING_PLAN,
    recentSales,
    fees: input.fees,
    agency: input.agency,
    status: 'draft',
    ...defaults,
  }
}

