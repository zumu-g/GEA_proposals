import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'gea.db')

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
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
      subject TEXT,
      content TEXT,
      scheduled_for TEXT NOT NULL,
      completed_at TEXT,
      status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, completed, skipped
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (plan_id) REFERENCES nurture_plans(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
    CREATE INDEX IF NOT EXISTS idx_activities_proposal ON activities(proposal_id);
    CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at);
    CREATE INDEX IF NOT EXISTS idx_nurture_touchpoints_scheduled ON nurture_touchpoints(scheduled_for);
    CREATE INDEX IF NOT EXISTS idx_nurture_touchpoints_status ON nurture_touchpoints(status);
  `)
}
