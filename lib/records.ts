import type Database from "better-sqlite3";
import { nowISO } from "./dates";
import { queueMail } from "./email";
import type { ExpenseInput } from "./types";

export function pairKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function ensureFriendship(db: Database.Database, a: string, b: string) {
  if (a === b) return;
  const [low, high] = pairKey(a, b);
  db.prepare(
    `INSERT INTO friendships (user_low, user_high, created_at) VALUES (?, ?, ?)
     ON CONFLICT DO NOTHING`,
  ).run(low, high, nowISO());
}

/** Types worth an email for people on the default "important only" setting. */
const IMPORTANT = new Set(["friend", "group", "settlement", "reminder"]);

export function addNotification(
  db: Database.Database,
  note: { userId: string; type: string; title: string; body: string; href: string },
) {
  db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, body, href, read_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
  ).run(crypto.randomUUID(), note.userId, note.type, note.title, note.body, note.href, nowISO());
  const to = db
    .prepare(`SELECT email, status, email_prefs AS prefs FROM users WHERE id = ?`)
    .get(note.userId) as { email: string; status: string; prefs: number } | undefined;
  // Invited people get their own invite email instead; guests have no inbox.
  if (!to || to.status !== "active") return;
  if (to.prefs === 0 || (to.prefs === 1 && !IMPORTANT.has(note.type))) return;
  queueMail({
    to: to.email,
    subject: note.title,
    heading: note.title,
    lines: [note.body],
    cta: { label: "Open SplitnDutch", href: note.href },
  });
}

export function notifyOthers(
  db: Database.Database,
  userIds: string[],
  actorId: string,
  note: { type: string; title: string; body: string; href: string },
) {
  for (const userId of new Set(userIds)) {
    if (userId === actorId) continue;
    addNotification(db, { userId, ...note });
  }
}

type ExpenseRow = ExpenseInput & { id: string; createdBy: string; seriesId?: string | null; repeatInterval?: "weekly" | "monthly" | null };

export function insertExpense(db: Database.Database, row: ExpenseRow) {
  const now = nowISO();
  const repeat = row.repeat === "none" ? null : row.repeat;
  const run = db.transaction(() => {
    db.prepare(
      `INSERT INTO expenses (
        id, group_id, description, amount_minor, currency, category, expense_date, notes, split_type,
        repeat_interval, series_id, repeat_until, created_by, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    ).run(
      row.id,
      row.groupId,
      row.description,
      row.amountMinor,
      row.currency,
      row.category,
      row.date,
      row.notes,
      row.splitType,
      row.repeatInterval === undefined ? repeat : row.repeatInterval,
      row.seriesId ?? null,
      row.repeatUntil,
      row.createdBy,
      now,
      now,
    );
    const pay = db.prepare(
      `INSERT INTO expense_payers (expense_id, user_id, amount_minor) VALUES (?, ?, ?)`,
    );
    for (const p of row.payers) pay.run(row.id, p.userId, p.minor);
    const share = db.prepare(
      `INSERT INTO expense_shares (expense_id, user_id, amount_minor, percent_bps, share_count) VALUES (?, ?, ?, ?, ?)`,
    );
    for (const s of row.shares) share.run(row.id, s.userId, s.minor, s.percentBps ?? null, s.shareCount ?? null);
  });
  run();
}

export function replaceExpense(db: Database.Database, id: string, row: ExpenseInput) {
  const now = nowISO();
  const run = db.transaction(() => {
    db.prepare(
      `UPDATE expenses SET
        group_id = ?, description = ?, amount_minor = ?, currency = ?, category = ?, expense_date = ?,
        notes = ?, split_type = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      row.groupId,
      row.description,
      row.amountMinor,
      row.currency,
      row.category,
      row.date,
      row.notes,
      row.splitType,
      now,
      id,
    );
    db.prepare(`DELETE FROM expense_payers WHERE expense_id = ?`).run(id);
    db.prepare(`DELETE FROM expense_shares WHERE expense_id = ?`).run(id);
    const pay = db.prepare(`INSERT INTO expense_payers (expense_id, user_id, amount_minor) VALUES (?, ?, ?)`);
    for (const p of row.payers) pay.run(id, p.userId, p.minor);
    const share = db.prepare(
      `INSERT INTO expense_shares (expense_id, user_id, amount_minor, percent_bps, share_count) VALUES (?, ?, ?, ?, ?)`,
    );
    for (const s of row.shares) share.run(id, s.userId, s.minor, s.percentBps ?? null, s.shareCount ?? null);
  });
  run();
}
