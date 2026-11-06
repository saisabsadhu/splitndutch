import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { nowISO } from "./dates";
import { getDb } from "./db";
import type { SessionUser } from "./types";

const COOKIE = "sd_session";
const DAY_MS = 1000 * 60 * 60 * 24;
const SESSION_DAYS = 60;

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * DAY_MS).toISOString();
  getDb().prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`).run(token, userId, expires);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && (process.env.APP_URL ?? "").startsWith("https://"),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) getDb().prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
  jar.delete(COOKIE);
}

export function endAllSessions(userId: string) {
  getDb().prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId);
}

type Row = {
  id: string;
  name: string;
  email: string;
  currency: string;
  createdAt: string;
  expiresAt: string;
  status: string;
  upiId: string;
  emailPrefs: number;
  verifiedAt: string | null;
};

/** One lookup per request, however many components ask. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.currency, u.created_at AS createdAt, s.expires_at AS expiresAt,
              u.status, u.upi_id AS upiId, u.email_prefs AS emailPrefs, u.email_verified_at AS verifiedAt
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
    )
    .get(token) as Row | undefined;
  if (!row || row.status !== "active") return null;
  if (row.expiresAt <= nowISO()) {
    db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
    return null;
  }
  // Sliding expiry: anyone who opens the app at least every few weeks stays logged in.
  if (new Date(row.expiresAt).getTime() - Date.now() < (SESSION_DAYS - 7) * DAY_MS) {
    db.prepare(`UPDATE sessions SET expires_at = ? WHERE token = ?`).run(
      new Date(Date.now() + SESSION_DAYS * DAY_MS).toISOString(),
      token,
    );
  }
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    currency: row.currency,
    createdAt: row.createdAt,
    upiId: row.upiId,
    emailPrefs: row.emailPrefs,
    verified: Boolean(row.verifiedAt),
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const h = await headers();
    const path = h.get("x-pathname");
    redirect(path ? `/login?next=${encodeURIComponent(path)}` : "/login");
  }
  return user;
}

export async function clientKey(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local";
}
