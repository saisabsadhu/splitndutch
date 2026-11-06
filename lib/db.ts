import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { config } from "./config";
import { seedIfEmpty } from "./seed";

const globalForDb = globalThis as unknown as { splitndutch?: Database.Database };

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS friendships (
  user_low TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_high TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_low, user_high)
);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  simplify INTEGER NOT NULL DEFAULT 1,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS group_members_user ON group_members(user_id);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  group_id TEXT,
  description TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL,
  category TEXT NOT NULL,
  expense_date TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  split_type TEXT NOT NULL,
  repeat_interval TEXT,
  series_id TEXT,
  repeat_until TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS expenses_group ON expenses(group_id);
CREATE INDEX IF NOT EXISTS expenses_series ON expenses(series_id);

CREATE TABLE IF NOT EXISTS expense_payers (
  expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount_minor INTEGER NOT NULL,
  PRIMARY KEY (expense_id, user_id)
);

CREATE TABLE IF NOT EXISTS expense_shares (
  expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount_minor INTEGER NOT NULL,
  percent_bps INTEGER,
  share_count INTEGER,
  PRIMARY KEY (expense_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS comments_expense ON comments(expense_id);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  href TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id, created_at);

CREATE TABLE IF NOT EXISTS tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  meta TEXT NOT NULL DEFAULT '',
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS tokens_user ON tokens(user_id, kind);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  from_user TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS reminders_pair ON reminders(from_user, to_user, created_at);
`;

/** Columns added after the first release. Each runs once, only if the column is missing. */
const COLUMNS: [table: string, column: string, definition: string][] = [
  // active: normal account · invited: has an email, hasn't set a password yet
  // guest: name only, added to a group without an email · deleted: anonymised account
  ["users", "status", "TEXT NOT NULL DEFAULT 'active'"],
  ["users", "upi_id", "TEXT NOT NULL DEFAULT ''"],
  ["users", "email_verified_at", "TEXT"],
  // 0 = no email, 1 = important only (invites, reminders, payments), 2 = every change
  ["users", "email_prefs", "INTEGER NOT NULL DEFAULT 1"],
  ["users", "invited_by", "TEXT"],
  ["groups", "currency", "TEXT NOT NULL DEFAULT 'INR'"],
  ["groups", "invite_code", "TEXT"],
  ["groups", "budget_minor", "INTEGER"],
  ["groups", "destination", "TEXT NOT NULL DEFAULT ''"],
  ["groups", "start_date", "TEXT"],
  ["groups", "end_date", "TEXT"],
];

function migrate(db: Database.Database) {
  for (const [table, column, definition] of COLUMNS) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS groups_invite_code ON groups(invite_code) WHERE invite_code IS NOT NULL`);
}

/** Create every table and apply column migrations. Safe to run on every start. */
export function initSchema(db: Database.Database) {
  db.exec(SCHEMA);
  migrate(db);
}

export function dataPath(...parts: string[]): string {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), config.dataDir, ...parts);
}

export function getDb(): Database.Database {
  if (!globalForDb.splitndutch) {
    fs.mkdirSync(dataPath(), { recursive: true });
    const db = new Database(dataPath("splitndutch.db"));
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");
    initSchema(db);
    if (config.demoMode) seedIfEmpty(db);
    globalForDb.splitndutch = db;
  }
  return globalForDb.splitndutch;
}
