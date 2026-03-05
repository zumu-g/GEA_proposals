import { promises as fs } from 'fs'
import path from 'path'
import { Proposal, AgencyConfig } from '@/types/proposal'
import { isValidProposalId } from '@/lib/utils'

const DATA_DIR = path.join(process.cwd(), 'data', 'proposals')
const AGENCY_CONFIG_PATH = path.join(process.cwd(), 'data', 'agency-config.json')

export async function ensureDataDirectory() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    console.error('Error creating data directory:', error)
  }
}

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
      contactEmail: 'info@grantestate.co.uk',
      contactPhone: '',
    }
  }
}

export async function saveProposal(proposal: Proposal): Promise<void> {
  await ensureDataDirectory()
  const filePath = path.join(DATA_DIR, `${proposal.id}.json`)
  await fs.writeFile(filePath, JSON.stringify(proposal, null, 2), 'utf-8')
}

export async function getProposal(id: string): Promise<Proposal | null> {
  if (!isValidProposalId(id)) return null
  try {
    const filePath = path.join(DATA_DIR, `${id}.json`)
    const fileContents = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(fileContents) as Proposal
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    throw error
  }
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
  try {
    const filePath = path.join(DATA_DIR, `${id}.json`)
    await fs.unlink(filePath)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false
    }
    throw error
  }
}

export async function listProposals(): Promise<Proposal[]> {
  await ensureDataDirectory()
  try {
    const files = await fs.readdir(DATA_DIR)
    const jsonFiles = files.filter(f => f.endsWith('.json'))

    const results = await Promise.allSettled(
      jsonFiles.map(async (file) => {
        const filePath = path.join(DATA_DIR, file)
        const contents = await fs.readFile(filePath, 'utf-8')
        return JSON.parse(contents) as Proposal
      })
    )

    const proposals = results
      .filter((r): r is PromiseFulfilledResult<Proposal> => r.status === 'fulfilled')
      .map(r => r.value)

    const failures = results.filter(r => r.status === 'rejected')
    if (failures.length > 0) {
      console.error(`Failed to read ${failures.length} proposal file(s)`)
    }

    return proposals.sort((a, b) =>
      new Date(b.proposalDate).getTime() - new Date(a.proposalDate).getTime()
    )
  } catch (error) {
    console.error('Error listing proposals:', error)
    return []
  }
}
