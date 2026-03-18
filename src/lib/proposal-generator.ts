import { promises as fs } from 'fs'
import path from 'path'
import { Proposal, AgencyConfig, AdvertisingWeek } from '@/types/proposal'
import { isValidProposalId } from '@/lib/utils'
import { getDb } from '@/lib/db'

const AGENCY_CONFIG_PATH = path.join(process.cwd(), 'data', 'agency-config.json')

// --- Agency config (still file-based — single config, rarely changes) ---

export async function getAgencyConfig(): Promise<AgencyConfig & { defaultInclusions?: string[] }> {
  try {
    const fileContents = await fs.readFile(AGENCY_CONFIG_PATH, 'utf-8')
    return JSON.parse(fileContents)
  } catch (error) {
    return {
      name: "Grant's Estate Agents",
      primaryColor: '#C41E2A',
      accentColor: '#C41E2A',
      defaultCommissionRate: 1.45,
      contactEmail: 'info@grantsea.com.au',
      contactPhone: '',
    }
  }
}

// --- Helpers: row <-> Proposal ---

interface ProposalRow {
  id: string
  client_name: string
  client_email: string
  property_address: string
  proposal_date: string
  hero_image: string | null
  property_images: string | null
  price_guide_min: number | null
  price_guide_max: number | null
  method_of_sale: string | null
  sale_process: string
  marketing_plan: string
  recent_sales: string
  fees: string | null
  agency: string | null
  status: string
  sent_at: string | null
  viewed_at: string | null
  approved_at: string | null
  advertising_schedule: string | null
  total_advertising_cost: number | null
  area_analysis: string | null
  team_members: string | null
  marketing_approach: string | null
  database_info: string | null
  internet_listings: string | null
  created_at: string
  updated_at: string
}

function rowToProposal(row: ProposalRow): Proposal {
  return {
    id: row.id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    propertyAddress: row.property_address,
    proposalDate: row.proposal_date,
    heroImage: row.hero_image || undefined,
    propertyImages: row.property_images ? JSON.parse(row.property_images) : undefined,
    priceGuide:
      row.price_guide_min != null && row.price_guide_max != null
        ? { min: row.price_guide_min, max: row.price_guide_max }
        : undefined,
    methodOfSale: row.method_of_sale || undefined,
    saleProcess: JSON.parse(row.sale_process),
    marketingPlan: JSON.parse(row.marketing_plan),
    recentSales: JSON.parse(row.recent_sales),
    fees: row.fees ? JSON.parse(row.fees) : undefined,
    agency: row.agency ? JSON.parse(row.agency) : undefined,
    advertisingSchedule: row.advertising_schedule ? JSON.parse(row.advertising_schedule) : undefined,
    totalAdvertisingCost: row.total_advertising_cost ?? undefined,
    areaAnalysis: row.area_analysis ? JSON.parse(row.area_analysis) : undefined,
    teamMembers: row.team_members ? JSON.parse(row.team_members) : undefined,
    marketingApproach: row.marketing_approach || undefined,
    databaseInfo: row.database_info || undefined,
    internetListings: row.internet_listings ? JSON.parse(row.internet_listings) : undefined,
    status: row.status as Proposal['status'],
    sentAt: row.sent_at || undefined,
    viewedAt: row.viewed_at || undefined,
    approvedAt: row.approved_at || undefined,
  }
}

function proposalToParams(proposal: Proposal) {
  return {
    id: proposal.id,
    client_name: proposal.clientName,
    client_email: proposal.clientEmail,
    property_address: proposal.propertyAddress,
    proposal_date: proposal.proposalDate,
    hero_image: proposal.heroImage || null,
    property_images: proposal.propertyImages ? JSON.stringify(proposal.propertyImages) : null,
    price_guide_min: proposal.priceGuide?.min ?? null,
    price_guide_max: proposal.priceGuide?.max ?? null,
    method_of_sale: proposal.methodOfSale || null,
    sale_process: JSON.stringify(proposal.saleProcess),
    marketing_plan: JSON.stringify(proposal.marketingPlan),
    recent_sales: JSON.stringify(proposal.recentSales),
    fees: proposal.fees ? JSON.stringify(proposal.fees) : null,
    agency: proposal.agency ? JSON.stringify(proposal.agency) : null,
    advertising_schedule: proposal.advertisingSchedule ? JSON.stringify(proposal.advertisingSchedule) : null,
    total_advertising_cost: proposal.totalAdvertisingCost ?? null,
    area_analysis: proposal.areaAnalysis ? JSON.stringify(proposal.areaAnalysis) : null,
    team_members: proposal.teamMembers ? JSON.stringify(proposal.teamMembers) : null,
    marketing_approach: proposal.marketingApproach || null,
    database_info: proposal.databaseInfo || null,
    internet_listings: proposal.internetListings ? JSON.stringify(proposal.internetListings) : null,
    status: proposal.status,
    sent_at: proposal.sentAt || null,
    viewed_at: proposal.viewedAt || null,
    approved_at: proposal.approvedAt || null,
  }
}

// --- CRUD ---

export async function saveProposal(proposal: Proposal): Promise<void> {
  const db = getDb()
  const params = proposalToParams(proposal)

  const stmt = db.prepare(`
    INSERT INTO proposals (id, client_name, client_email, property_address, proposal_date,
      hero_image, property_images, price_guide_min, price_guide_max, method_of_sale,
      sale_process, marketing_plan, recent_sales, fees, agency,
      advertising_schedule, total_advertising_cost, area_analysis, team_members,
      marketing_approach, database_info, internet_listings,
      status, sent_at, viewed_at, approved_at)
    VALUES (@id, @client_name, @client_email, @property_address, @proposal_date,
      @hero_image, @property_images, @price_guide_min, @price_guide_max, @method_of_sale,
      @sale_process, @marketing_plan, @recent_sales, @fees, @agency,
      @advertising_schedule, @total_advertising_cost, @area_analysis, @team_members,
      @marketing_approach, @database_info, @internet_listings,
      @status, @sent_at, @viewed_at, @approved_at)
    ON CONFLICT(id) DO UPDATE SET
      client_name=@client_name, client_email=@client_email, property_address=@property_address,
      proposal_date=@proposal_date, hero_image=@hero_image, property_images=@property_images,
      price_guide_min=@price_guide_min, price_guide_max=@price_guide_max, method_of_sale=@method_of_sale,
      sale_process=@sale_process, marketing_plan=@marketing_plan, recent_sales=@recent_sales,
      fees=@fees, agency=@agency,
      advertising_schedule=@advertising_schedule, total_advertising_cost=@total_advertising_cost,
      area_analysis=@area_analysis, team_members=@team_members,
      marketing_approach=@marketing_approach, database_info=@database_info,
      internet_listings=@internet_listings,
      status=@status, sent_at=@sent_at, viewed_at=@viewed_at, approved_at=@approved_at,
      updated_at=datetime('now')
  `)

  stmt.run(params)
}

export async function getProposal(id: string): Promise<Proposal | null> {
  if (!isValidProposalId(id)) return null
  const db = getDb()
  const row = db.prepare('SELECT * FROM proposals WHERE id = ?').get(id) as ProposalRow | undefined
  return row ? rowToProposal(row) : null
}

export async function updateProposal(id: string, updates: Partial<Proposal>): Promise<Proposal | null> {
  const proposal = await getProposal(id)
  if (!proposal) return null

  Object.assign(proposal, updates)
  await saveProposal(proposal)
  return proposal
}

export async function updateProposalStatus(
  id: string,
  status: Proposal['status']
): Promise<Proposal | null> {
  const proposal = await getProposal(id)
  if (!proposal) return null

  proposal.status = status
  if (status === 'approved' && !proposal.approvedAt) {
    proposal.approvedAt = new Date().toISOString()
  }
  if (status === 'viewed' && !proposal.viewedAt) {
    proposal.viewedAt = new Date().toISOString()
  }
  if (status === 'sent' && !proposal.sentAt) {
    proposal.sentAt = new Date().toISOString()
  }

  await saveProposal(proposal)
  return proposal
}

export async function deleteProposal(id: string): Promise<boolean> {
  if (!isValidProposalId(id)) return false
  const db = getDb()
  const result = db.prepare('DELETE FROM proposals WHERE id = ?').run(id)
  return result.changes > 0
}

export async function listProposals(): Promise<Proposal[]> {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM proposals ORDER BY proposal_date DESC').all() as ProposalRow[]
  return rows.map(rowToProposal)
}

// --- Activity logging ---

export function logActivity(
  proposalId: string,
  type: string,
  description?: string,
  metadata?: Record<string, unknown>
) {
  const db = getDb()
  db.prepare(
    'INSERT INTO activities (proposal_id, type, description, metadata) VALUES (?, ?, ?, ?)'
  ).run(proposalId, type, description || null, metadata ? JSON.stringify(metadata) : null)
}

export function getActivities(proposalId: string) {
  const db = getDb()
  return db
    .prepare('SELECT * FROM activities WHERE proposal_id = ? ORDER BY created_at DESC')
    .all(proposalId)
}

// --- Ensure data directory exists (for agency config file) ---

export async function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data')
  try {
    await fs.mkdir(dataDir, { recursive: true })
  } catch (error) {
    console.error('Error creating data directory:', error)
  }
}

// --- Default data for new proposal sections ---

export function getDefaultAdvertisingSchedule(): AdvertisingWeek[] {
  return [
    {
      week: 1,
      activities: [
        { category: 'Professional Photography', description: 'Professional property photography session', cost: 450 },
        { category: 'Signboard', description: 'Premium property signboard installed', cost: 375 },
        { category: 'Floor Plan', description: 'Detailed floor plan preparation', cost: 100 },
        { category: 'Internet advertising', description: 'Premiere listing across all major platforms', cost: 1840 },
        { category: 'Open Home', description: 'First open home inspection', included: true },
      ],
    },
    {
      week: 2,
      activities: [
        { category: 'Internet advertising', description: 'Continued online listing exposure', included: true },
        { category: 'Open Home', description: 'Open home inspection', included: true },
      ],
    },
    {
      week: 3,
      activities: [
        { category: 'Internet advertising', description: 'Continued online listing exposure', included: true },
        { category: 'Open Home', description: 'Open home inspection', included: true },
      ],
    },
    {
      week: 4,
      activities: [
        { category: 'Internet advertising', description: 'Continued online listing exposure', included: true },
        { category: 'Open Home', description: 'Open home inspection', included: true },
      ],
    },
  ]
}

export function getDefaultExtraAdvertisingItems(): AdvertisingWeek {
  return {
    week: 0, // 0 indicates extras / campaign-wide items
    activities: [
      { category: 'Social Media', description: 'Targeted social media campaign across Facebook and Instagram', included: true },
      { category: 'Brochures', description: 'Premium property brochures for open homes and letterbox drops', cost: 150 },
      { category: 'Window Cards', description: 'Office window card display', included: true },
      { category: 'Drone Photography', description: 'Aerial drone photography and video', cost: 280 },
      { category: 'Auctioneer Fees', description: 'Professional auctioneer services', cost: 700 },
    ],
  }
}

export const DEFAULT_TOTAL_ADVERTISING_COST = 3895

export const DEFAULT_DATABASE_INFO =
  'Our database system provides you with the benefit of accessing hundreds of buyers instantly as soon as your property is listed. VIP buyers who are specifically seeking properties in your area will be notified immediately.'

export const DEFAULT_INTERNET_LISTINGS = [
  'realestate.com.au (Premiere listing)',
  'domain.com.au',
  'homely.com.au',
  'realestate.com',
  'grantsea.com.au',
]

/**
 * Returns default values for the new proposal sections.
 * Merge these into a Proposal when creating a new one.
 */
export function getDefaultProposalExtras(): Pick<
  Proposal,
  'advertisingSchedule' | 'totalAdvertisingCost' | 'databaseInfo' | 'internetListings'
> {
  return {
    advertisingSchedule: [
      ...getDefaultAdvertisingSchedule(),
      getDefaultExtraAdvertisingItems(),
    ],
    totalAdvertisingCost: DEFAULT_TOTAL_ADVERTISING_COST,
    databaseInfo: DEFAULT_DATABASE_INFO,
    internetListings: DEFAULT_INTERNET_LISTINGS,
  }
}
