import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { addDays, nowISO } from "./dates";
import { getDb } from "./db";
import type { SessionUser } from "./types";

const COOKIE = "sd_session";
const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;

export function createSession(userId: string) {
  const token = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
  const expires = new Date(Date.now() + THIRTY_DAYS_MS).toISOString();
  getDb().prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`).run(token, userId, expires);
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSession() {
  const token = cookies().get(COOKIE)?.value;
  if (token) getDb().prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
  cookies().delete(COOKIE);
}

export function getCurrentUser(): SessionUser | null {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.currency, u.created_at AS createdAt, s.expires_at AS expiresAt
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
    )
    .get(token) as
    | { id: string; name: string; email: string; currency: string; createdAt: string; expiresAt: string }
    | undefined;
  if (!row) return null;
  if (row.expiresAt <= nowISO()) {
    db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
    return null;
  }
  if (row.expiresAt < addDays(nowISO().slice(0, 10), 7) + "T00:00:00.000Z") {
    db.prepare(`UPDATE sessions SET expires_at = ? WHERE token = ?`).run(
      new Date(Date.now() + THIRTY_DAYS_MS).toISOString(),
      token,
    );
  }
  return { id: row.id, name: row.name, email: row.email, currency: row.currency, createdAt: row.createdAt };
}

export function requireUser(): SessionUser {
  const user = getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
