/**
 * Migration script: JSON files → SQLite
 * Run with: npx tsx scripts/migrate-to-sqlite.ts
 */

import { promises as fs } from 'fs'
import path from 'path'
import Database from 'better-sqlite3'

const DATA_DIR = path.join(process.cwd(), 'data')
const PROPOSALS_DIR = path.join(DATA_DIR, 'proposals')
const DB_PATH = path.join(DATA_DIR, 'gea.db')

interface Proposal {
  id: string
  clientName: string
  clientEmail: string
  propertyAddress: string
  proposalDate: string
  heroImage?: string
  propertyImages?: string[]
  priceGuide?: { min: number; max: number }
  methodOfSale?: string
  saleProcess: unknown[]
  marketingPlan: unknown[]
  recentSales: unknown[]
  fees?: Record<string, unknown>
  agency?: Record<string, unknown>
  status: string
  sentAt?: string
  viewedAt?: string
  approvedAt?: string
}

async function migrate() {
  console.log('Starting migration: JSON → SQLite')
  console.log(`Database path: ${DB_PATH}`)

  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      client_email TEXT NOT NULL,
      property_address TEXT NOT NULL,
      proposal_date TEXT NOT NULL,
      hero_image TEXT,
      property_images TEXT,
      price_guide_min INTEGER,
      price_guide_max INTEGER,
      method_of_sale TEXT,
      sale_process TEXT NOT NULL,
      marketing_plan TEXT NOT NULL,
      recent_sales TEXT NOT NULL,
      fees TEXT,
      agency TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      sent_at TEXT,
      viewed_at TEXT,
      approved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proposal_id TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS nurture_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proposal_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS nurture_touchpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      subject TEXT,
      content TEXT,
      scheduled_for TEXT NOT NULL,
      completed_at TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (plan_id) REFERENCES nurture_plans(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
    CREATE INDEX IF NOT EXISTS idx_activities_proposal ON activities(proposal_id);
    CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at);
    CREATE INDEX IF NOT EXISTS idx_nurture_touchpoints_scheduled ON nurture_touchpoints(scheduled_for);
    CREATE INDEX IF NOT EXISTS idx_nurture_touchpoints_status ON nurture_touchpoints(status);
  `)

  // Read all JSON proposal files
  let files: string[]
  try {
    files = (await fs.readdir(PROPOSALS_DIR)).filter(f => f.endsWith('.json'))
  } catch {
    console.log('No proposals directory found. Creating empty database.')
    db.close()
    return
  }

  console.log(`Found ${files.length} JSON proposal file(s)`)

  const insert = db.prepare(`
    INSERT OR REPLACE INTO proposals (id, client_name, client_email, property_address, proposal_date,
      hero_image, property_images, price_guide_min, price_guide_max, method_of_sale,
      sale_process, marketing_plan, recent_sales, fees, agency, status,
      sent_at, viewed_at, approved_at)
    VALUES (@id, @client_name, @client_email, @property_address, @proposal_date,
      @hero_image, @property_images, @price_guide_min, @price_guide_max, @method_of_sale,
      @sale_process, @marketing_plan, @recent_sales, @fees, @agency, @status,
      @sent_at, @viewed_at, @approved_at)
  `)

  const insertActivity = db.prepare(`
    INSERT INTO activities (proposal_id, type, description)
    VALUES (?, ?, ?)
  `)

  const migrateAll = db.transaction(() => {
    let migrated = 0
    for (const file of files) {
      try {
        const raw = require(path.join(PROPOSALS_DIR, file))
        const p = raw as Proposal

        insert.run({
          id: p.id,
          client_name: p.clientName,
          client_email: p.clientEmail,
          property_address: p.propertyAddress,
          proposal_date: p.proposalDate,
          hero_image: p.heroImage || null,
          property_images: p.propertyImages ? JSON.stringify(p.propertyImages) : null,
          price_guide_min: p.priceGuide?.min ?? null,
          price_guide_max: p.priceGuide?.max ?? null,
          method_of_sale: p.methodOfSale || null,
          sale_process: JSON.stringify(p.saleProcess),
          marketing_plan: JSON.stringify(p.marketingPlan),
          recent_sales: JSON.stringify(p.recentSales),
          fees: p.fees ? JSON.stringify(p.fees) : null,
          agency: p.agency ? JSON.stringify(p.agency) : null,
          status: p.status,
          sent_at: p.sentAt || null,
          viewed_at: p.viewedAt || null,
          approved_at: p.approvedAt || null,
        })

        // Create a migration activity record
        insertActivity.run(p.id, 'migrated', `Migrated from JSON file: ${file}`)

        migrated++
        console.log(`  ✓ ${p.propertyAddress} (${p.status})`)
      } catch (err) {
        console.error(`  ✗ Failed to migrate ${file}:`, err)
      }
    }
    return migrated
  })

  const count = migrateAll()
  console.log(`\nMigration complete: ${count}/${files.length} proposals migrated`)

  // Verify
  const total = db.prepare('SELECT COUNT(*) as count FROM proposals').get() as { count: number }
  console.log(`Database now has ${total.count} proposal(s)`)

  db.close()
}

migrate().catch(console.error)
