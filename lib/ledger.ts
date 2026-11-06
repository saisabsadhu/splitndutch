import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import type Database from "better-sqlite3";
import { config } from "./config";

const run = promisify(execFile);

/**
 * Tables mirrored to CSV, one sheet each. Amounts stay in minor units (paise/cents).
 * Sessions and one-time tokens are deliberately left out: they are short-lived secrets.
 */
export const LEDGER_TABLES = [
  "users",
  "friendships",
  "groups",
  "group_members",
  "expenses",
  "expense_payers",
  "expense_shares",
  "comments",
  "notifications",
  "reminders",
] as const;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function ledgerDir(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), config.ledgerDir);
}

/** Write every mirrored table to `<dir>/<table>.csv`. Files are written atomically. */
export function exportLedger(db: Database.Database, dir = ledgerDir()): { table: string; rows: number }[] {
  fs.mkdirSync(dir, { recursive: true });
  const out: { table: string; rows: number }[] = [];
  for (const table of LEDGER_TABLES) {
    const cols = (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);
    const rows = db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all() as Record<string, unknown>[];
    const body = [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n") + "\n";
    const file = path.join(dir, `${table}.csv`);
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, body);
    fs.renameSync(tmp, file);
    out.push({ table, rows: rows.length });
  }
  return out;
}

/** Minimal RFC 4180 parser: quoted fields, doubled quotes, newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/**
 * Load the CSV sheets into an empty database. Columns the database doesn't know are skipped,
 * columns the CSV lacks get their defaults, so older sheets restore into a newer schema.
 */
export function importLedger(db: Database.Database, dir = ledgerDir()): { table: string; rows: number }[] {
  const out: { table: string; rows: number }[] = [];
  const tx = db.transaction(() => {
    for (const table of LEDGER_TABLES) {
      const file = path.join(dir, `${table}.csv`);
      if (!fs.existsSync(file)) continue;
      const [header, ...rows] = parseCsv(fs.readFileSync(file, "utf8"));
      if (!header) continue;
      const info = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string; notnull: number; type: string }[];
      const known = new Map(info.map((c) => [c.name, c]));
      const cols = header.filter((h) => known.has(h));
      if (cols.length === 0) continue;
      const stmt = db.prepare(`INSERT OR REPLACE INTO ${table} (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`);
      let n = 0;
      for (const r of rows) {
        if (r.length === 1 && r[0] === "") continue;
        const values = cols.map((c) => {
          const raw = r[header.indexOf(c)] ?? "";
          const meta = known.get(c)!;
          if (raw === "" && !meta.notnull) return null;
          if (meta.type.toUpperCase() === "INTEGER" && /^-?\d+$/.test(raw)) return Number(raw);
          return raw;
        });
        stmt.run(...values);
        n++;
      }
      out.push({ table, rows: n });
    }
  });
  db.pragma("foreign_keys = OFF");
  try {
    tx();
  } finally {
    db.pragma("foreign_keys = ON");
  }
  return out;
}

/** Commit and push the sheets if LEDGER_DIR is a git checkout. Quietly does nothing otherwise. */
export async function pushLedger(dir = ledgerDir()): Promise<string> {
  if (!fs.existsSync(path.join(dir, ".git"))) return "skipped: ledger folder is not a git repository";
  await run("git", ["add", "-A", "."], { cwd: dir });
  const status = await run("git", ["status", "--porcelain"], { cwd: dir });
  if (!status.stdout.trim()) return "no changes";
  await run("git", ["commit", "-m", `Ledger snapshot ${new Date().toISOString()}`], { cwd: dir });
  await run("git", ["push"], { cwd: dir, timeout: 60_000 });
  return "pushed";
}

let timer: ReturnType<typeof setTimeout> | null = null;
let pushing = false;

/** Called after every change. Debounced so a burst of edits makes one snapshot. */
export function scheduleLedgerSync(getDb: () => Database.Database) {
  if (!config.ledgerAutosync) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    timer = null;
    try {
      exportLedger(getDb());
      if (config.ledgerGitPush && !pushing) {
        pushing = true;
        try {
          await pushLedger();
        } finally {
          pushing = false;
        }
      }
    } catch (err) {
      console.error("[ledger] sync failed:", err);
    }
  }, 5000);
}
