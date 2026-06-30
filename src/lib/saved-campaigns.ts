// ─────────────────────────────────────────────────────────────────────────────
// Saved marketing campaigns — per-agent reusable sets of marketing items.
//
// Owned by the agent (owner_email), mirroring proposal ownership: an agent sees
// only their own campaigns; the principal sees all. Loading a campaign onto a
// property re-resolves the premiere line to that property's suburb (done at the
// UI/call site), so a reused campaign stays correctly priced.
// ─────────────────────────────────────────────────────────────────────────────

import { getDb } from '@/lib/db'
import type { MarketingCostItem } from '@/types/proposal'

export interface SavedCampaign {
  id: number
  ownerEmail: string
  name: string
  items: MarketingCostItem[]
  createdAt: string
}

interface CampaignRow {
  id: number
  owner_email: string
  name: string
  items: string
  created_at: string
}

function rowToCampaign(row: CampaignRow): SavedCampaign {
  let items: MarketingCostItem[] = []
  try {
    const parsed = JSON.parse(row.items)
    if (Array.isArray(parsed)) items = parsed
  } catch {
    items = []
  }
  return { id: row.id, ownerEmail: row.owner_email, name: row.name, items, createdAt: row.created_at }
}

/** List campaigns for an agent, or all when `all` is true (principal). */
export function listCampaigns(email: string, opts?: { all?: boolean }): SavedCampaign[] {
  const db = getDb()
  const rows = opts?.all
    ? (db.prepare('SELECT * FROM saved_campaigns ORDER BY created_at DESC').all() as CampaignRow[])
    : (db
        .prepare('SELECT * FROM saved_campaigns WHERE lower(owner_email) = ? ORDER BY created_at DESC')
        .all(email.trim().toLowerCase()) as CampaignRow[])
  return rows.map(rowToCampaign)
}

export function saveCampaign(email: string, name: string, items: MarketingCostItem[]): SavedCampaign {
  const db = getDb()
  const info = db
    .prepare('INSERT INTO saved_campaigns (owner_email, name, items) VALUES (?, ?, ?)')
    .run(email.trim().toLowerCase(), name.trim(), JSON.stringify(items ?? []))
  const row = db
    .prepare('SELECT * FROM saved_campaigns WHERE id = ?')
    .get(info.lastInsertRowid) as CampaignRow
  return rowToCampaign(row)
}

/** Delete a campaign the caller owns (principal may delete any). Returns true if removed. */
export function deleteCampaign(email: string, id: number, opts?: { all?: boolean }): boolean {
  const db = getDb()
  const result = opts?.all
    ? db.prepare('DELETE FROM saved_campaigns WHERE id = ?').run(id)
    : db
        .prepare('DELETE FROM saved_campaigns WHERE id = ? AND lower(owner_email) = ?')
        .run(id, email.trim().toLowerCase())
  return result.changes > 0
}
