import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'gea.db')

// The principal account — sees the whole team's pipeline, and owns all pre-rollout
// proposals + the legacy hardcoded agency/agent profile. Overridable via env.
export const PRINCIPAL_EMAIL = (process.env.PRINCIPAL_EMAIL || 'stuart_grant@me.com')
  .trim()
  .toLowerCase()

// Uploaded hero photos live alongside the SQLite DB on the persistent volume so
// they survive redeploys (public/ is ephemeral on Railway). Served via
// /api/uploads/[filename].
export function uploadsDir(): string {
  const dir = path.join(path.dirname(DB_PATH), 'uploads')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
    // Ensure the data directory exists
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
    initSchema(_db)
  }
  return _db
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      client_email TEXT NOT NULL,
      property_address TEXT NOT NULL,
      proposal_date TEXT NOT NULL,
      hero_image TEXT,
      property_images TEXT, -- JSON array
      price_guide_min INTEGER,
      price_guide_max INTEGER,
      show_price_range INTEGER DEFAULT 1,
      show_commission INTEGER DEFAULT 1,
      method_of_sale TEXT,
      sale_process TEXT NOT NULL, -- JSON array
      marketing_plan TEXT NOT NULL, -- JSON array
      recent_sales TEXT NOT NULL, -- JSON array
      fees TEXT, -- JSON object
      agency TEXT, -- JSON object
      status TEXT NOT NULL DEFAULT 'draft',
      sent_at TEXT,
      viewed_at TEXT,
      approved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      email TEXT PRIMARY KEY,              -- FK to users.email (lowercase)
      agent_name TEXT,
      agent_title TEXT,
      agent_phone TEXT,
      agent_email TEXT,
      agent_photo TEXT,
      agent_bio TEXT,
      default_commission_rate REAL,
      branding TEXT,                       -- JSON: per-agent format/branding preference overrides
      onboarding_progress TEXT,            -- JSON: { stepKey: true, ... }
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS saved_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_email TEXT NOT NULL,            -- owning agent (lowercase)
      name TEXT NOT NULL,
      items TEXT NOT NULL,                  -- JSON array of MarketingCostItem
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_saved_campaigns_owner ON saved_campaigns(owner_email);

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proposal_id TEXT NOT NULL,
      type TEXT NOT NULL, -- created, sent, viewed, approved, rejected, email_sent, call_logged, note_added
      description TEXT,
      metadata TEXT, -- JSON object for extra data
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS nurture_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proposal_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active', -- active, paused, completed, cancelled
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS nurture_touchpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- email, call, sms
      day_number INTEGER NOT NULL DEFAULT 0,
      subject TEXT,
      content TEXT,
      talking_points TEXT, -- JSON array of talking points for call touchpoints
      scheduled_for TEXT NOT NULL,
      completed_at TEXT,
      status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, completed, skipped, pending_call
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (plan_id) REFERENCES nurture_plans(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
    CREATE INDEX IF NOT EXISTS idx_activities_proposal ON activities(proposal_id);
    CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at);
    CREATE INDEX IF NOT EXISTS idx_nurture_touchpoints_scheduled ON nurture_touchpoints(scheduled_for);
    CREATE INDEX IF NOT EXISTS idx_nurture_touchpoints_status ON nurture_touchpoints(status);

    CREATE TABLE IF NOT EXISTS notification_dismissals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notification_key TEXT NOT NULL UNIQUE, -- unique key like "call_due:proposal_id:touchpoint_id"
      dismissed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notification_reads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notification_key TEXT NOT NULL UNIQUE,
      read_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_notification_dismissals_key ON notification_dismissals(notification_key);
    CREATE INDEX IF NOT EXISTS idx_notification_reads_key ON notification_reads(notification_key);

    CREATE TABLE IF NOT EXISTS cron_runs (
      job TEXT PRIMARY KEY,
      last_run_at TEXT NOT NULL,
      last_result TEXT
    );

    CREATE TABLE IF NOT EXISTS uploaded_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      url TEXT NOT NULL,
      original_name TEXT,
      mime TEXT,
      size INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_uploaded_images_created ON uploaded_images(created_at DESC);
  `)

  // Add new columns for expanded proposal sections (safe to re-run)
  const newColumns = [
    'ALTER TABLE proposals ADD COLUMN advertising_schedule TEXT',   // JSON
    'ALTER TABLE proposals ADD COLUMN total_advertising_cost REAL',
    'ALTER TABLE proposals ADD COLUMN area_analysis TEXT',          // JSON
    'ALTER TABLE proposals ADD COLUMN team_members TEXT',           // JSON
    'ALTER TABLE proposals ADD COLUMN marketing_approach TEXT',
    'ALTER TABLE proposals ADD COLUMN marketing_costs TEXT',         // JSON — raw wizard marketing items
    'ALTER TABLE proposals ADD COLUMN database_info TEXT',
    'ALTER TABLE proposals ADD COLUMN internet_listings TEXT',      // JSON
    'ALTER TABLE proposals ADD COLUMN on_market_listings TEXT',     // JSON
    'ALTER TABLE proposals ADD COLUMN show_price_range INTEGER DEFAULT 1',
    'ALTER TABLE proposals ADD COLUMN show_commission INTEGER DEFAULT 1',
    'ALTER TABLE proposals ADD COLUMN hidden_sections TEXT',          // JSON — sidebar page toggles excluded from the client proposal
    'ALTER TABLE proposals ADD COLUMN proposal_type TEXT DEFAULT \'sale\'',
    'ALTER TABLE proposals ADD COLUMN asking_rent INTEGER',
    'ALTER TABLE proposals ADD COLUMN lease_type TEXT',
    'ALTER TABLE proposals ADD COLUMN available_date TEXT',
    'ALTER TABLE proposals ADD COLUMN management_fee REAL',
    'ALTER TABLE proposals ADD COLUMN letting_fee TEXT',
    // Nurture touchpoints — new columns for AI-generated plans
    'ALTER TABLE nurture_touchpoints ADD COLUMN day_number INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE nurture_touchpoints ADD COLUMN talking_points TEXT',
    // Dual target campaign (residential + development site)
    'ALTER TABLE proposals ADD COLUMN dual_campaign INTEGER DEFAULT 0',
    'ALTER TABLE proposals ADD COLUMN off_market_campaign INTEGER DEFAULT 0',
    'ALTER TABLE proposals ADD COLUMN dev_method_of_sale TEXT',
    'ALTER TABLE proposals ADD COLUMN dev_price_guide_min REAL',
    'ALTER TABLE proposals ADD COLUMN dev_price_guide_max REAL',
    'ALTER TABLE proposals ADD COLUMN dev_show_price_range INTEGER DEFAULT 1',
    'ALTER TABLE proposals ADD COLUMN dev_marketing_costs TEXT',      // JSON — raw dev campaign wizard items
    'ALTER TABLE proposals ADD COLUMN dev_marketing_plan TEXT',       // JSON — email/display channel rows
    'ALTER TABLE proposals ADD COLUMN dev_advertising_schedule TEXT', // JSON
    'ALTER TABLE proposals ADD COLUMN dev_total_advertising_cost REAL',
    // Simple/full client-facing proposal template
    "ALTER TABLE proposals ADD COLUMN template TEXT DEFAULT 'full'",
    // Subject property type (house/land/unit/apartment/development/commercial)
    "ALTER TABLE proposals ADD COLUMN property_type TEXT DEFAULT 'house'",
    // Multi-tenant rollout: proposal ownership + principal role
    'ALTER TABLE proposals ADD COLUMN owner_email TEXT',
    'ALTER TABLE users ADD COLUMN is_principal INTEGER NOT NULL DEFAULT 0',
  ]

  for (const sql of newColumns) {
    try {
      db.exec(sql)
    } catch {
      // Column already exists — ignore
    }
  }

  // Property data now lives in everypropertyAI — drop the legacy scraped
  // tables so existing volumes (e.g. Railway) shed the stale copies. Idempotent.
  db.exec(`
    DROP TABLE IF EXISTS cached_properties;
    DROP TABLE IF EXISTS cache_metadata;
    DROP TABLE IF EXISTS sold_properties;
    DROP TABLE IF EXISTS leased_properties;
    DROP TABLE IF EXISTS for_rent_properties;
  `)

  // Idempotent rollout backfill: assign pre-existing proposals to the principal,
  // and mark the principal account. Safe to re-run — guarded by NULL / value checks.
  try {
    db.prepare('UPDATE proposals SET owner_email = ? WHERE owner_email IS NULL')
      .run(PRINCIPAL_EMAIL)
    db.prepare('UPDATE users SET is_principal = 1 WHERE lower(email) = ?')
      .run(PRINCIPAL_EMAIL)
  } catch {
    // Columns may not exist yet on a partially-migrated DB mid-deploy — next init retries.
  }
}
