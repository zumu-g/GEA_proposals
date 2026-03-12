import { promises as fs } from 'fs'
import path from 'path'
import { Proposal, AgencyConfig } from '@/types/proposal'
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
      name: 'Grant Estate Agents',
      primaryColor: '#1A1A1A',
      accentColor: '#C4A962',
      defaultCommissionRate: 1.5,
      contactEmail: 'info@grantestate.com.au',
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
      sale_process, marketing_plan, recent_sales, fees, agency, status,
      sent_at, viewed_at, approved_at)
    VALUES (@id, @client_name, @client_email, @property_address, @proposal_date,
      @hero_image, @property_images, @price_guide_min, @price_guide_max, @method_of_sale,
      @sale_process, @marketing_plan, @recent_sales, @fees, @agency, @status,
      @sent_at, @viewed_at, @approved_at)
    ON CONFLICT(id) DO UPDATE SET
      client_name=@client_name, client_email=@client_email, property_address=@property_address,
      proposal_date=@proposal_date, hero_image=@hero_image, property_images=@property_images,
      price_guide_min=@price_guide_min, price_guide_max=@price_guide_max, method_of_sale=@method_of_sale,
      sale_process=@sale_process, marketing_plan=@marketing_plan, recent_sales=@recent_sales,
      fees=@fees, agency=@agency, status=@status,
      sent_at=@sent_at, viewed_at=@viewed_at, approved_at=@approved_at,
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
