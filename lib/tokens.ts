import { createHash, randomBytes } from "crypto";
import { getDb } from "./db";
import { nowISO } from "./dates";

export type TokenKind = "reset" | "invite" | "verify";

const HOURS = 60 * 60 * 1000;
export const TOKEN_TTL: Record<TokenKind, number> = {
  reset: 2 * HOURS,
  invite: 30 * 24 * HOURS,
  verify: 7 * 24 * HOURS,
};

function hash(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Only the hash is stored, so a leaked database (or CSV mirror) can't be used to log in. */
export function issueToken(userId: string, kind: TokenKind, meta = ""): string {
  const raw = randomBytes(24).toString("base64url");
  const db = getDb();
  // One live link per purpose: a new reset link kills the old one.
  db.prepare(`UPDATE tokens SET used_at = ? WHERE user_id = ? AND kind = ? AND used_at IS NULL`).run(nowISO(), userId, kind);
  db.prepare(
    `INSERT INTO tokens (token_hash, user_id, kind, meta, expires_at, used_at, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)`,
  ).run(hash(raw), userId, kind, meta, new Date(Date.now() + TOKEN_TTL[kind]).toISOString(), nowISO());
  return raw;
}

export type TokenRow = { userId: string; kind: TokenKind; meta: string };

export function peekToken(raw: string, kinds: TokenKind[]): TokenRow | null {
  if (!raw || raw.length > 100) return null;
  const row = getDb()
    .prepare(`SELECT user_id AS userId, kind, meta, expires_at AS expiresAt, used_at AS usedAt FROM tokens WHERE token_hash = ?`)
    .get(hash(raw)) as (TokenRow & { expiresAt: string; usedAt: string | null }) | undefined;
  if (!row || row.usedAt || row.expiresAt <= nowISO() || !kinds.includes(row.kind)) return null;
  return { userId: row.userId, kind: row.kind, meta: row.meta };
}

export function consumeToken(raw: string, kinds: TokenKind[]): TokenRow | null {
  const row = peekToken(raw, kinds);
  if (!row) return null;
  const res = getDb().prepare(`UPDATE tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL`).run(nowISO(), hash(raw));
  return res.changes === 1 ? row : null;
}
