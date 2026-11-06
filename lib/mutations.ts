import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { isCurrency, DEFAULT_CURRENCY } from "./money";
import { dueOccurrences, isISODate, nowISO, todayISO } from "./dates";
import { isCategory, isGroupType } from "./categories";
import { getDb } from "./db";
import { formatMoney } from "./money";
import { getDestination } from "./destinations";
import { isDeliverable, queueMail } from "./email";
import { issueToken, consumeToken } from "./tokens";
import { isUpiId } from "./upi";
import {
  addNotification,
  ensureFriendship,
  insertExpense,
  notifyOthers,
  replaceExpense,
} from "./records";
import {
  areFriends,
  debtsForUser,
  findGroupByInvite,
  findUserByEmail,
  getExpense,
  getGroup,
  getPerson,
  isMember,
  listGroups,
  loadVisibleExpenses,
} from "./queries";
import { buildDebts, pairNet, userNet } from "./balances";
import type { ExpenseInput, SessionUser } from "./types";

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const MAX_MINOR = 100_000_000_00;

export type ActionError = { error: string };
export type ActionOk = { ok: true; id?: string; href?: string };

function fail(error: string): ActionError {
  return { error };
}

function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function newInviteCode(): string {
  return randomBytes(6).toString("base64url");
}

// ———————————————————————————————— accounts ————————————————————————————————

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  currency: string;
}): Promise<ActionError | { ok: true; userId: string } | { ok: true; pending: true }> {
  const name = cleanName(input.name);
  const email = input.email.trim().toLowerCase();
  if (name.length < 1 || name.length > 60) return fail("Use a name between 1 and 60 characters.");
  if (!EMAIL.test(email) || email.length > 120 || !isDeliverable(email)) return fail("Enter a valid email address.");
  if (input.password.length < 8 || input.password.length > 72) return fail("Use a password of 8 to 72 characters.");
  if (!isCurrency(input.currency)) return fail("Choose a currency from the list.");
  const db = getDb();
  const existing = findUserByEmail(email);
  if (existing?.status === "active") return fail("An account with that email already exists. Log in instead.");
  if (existing?.status === "invited") {
    // Someone already added this email and shared expenses with it. Prove you own the inbox first.
    const token = issueToken(existing.id, "invite");
    queueMail({
      to: email,
      subject: "Finish setting up SplitnDutch",
      heading: "Your friends are already splitting with you",
      lines: [
        "Someone added this email to SplitnDutch before you signed up, so your groups and balances are waiting.",
        "Open the link to choose your password and see them.",
      ],
      cta: { label: "Set my password", href: `/invite/${token}` },
      footer: "If you didn't try to sign up, ignore this email.",
    });
    return { ok: true, pending: true };
  }
  const id = crypto.randomUUID();
  const hash = await bcrypt.hash(input.password, 10);
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, currency, created_at, status) VALUES (?, ?, ?, ?, ?, ?, 'active')`,
  ).run(id, name, email, hash, input.currency, nowISO());
  sendVerification(id, email, name);
  return { ok: true, userId: id };
}

export function sendVerification(userId: string, email: string, name: string) {
  const token = issueToken(userId, "verify");
  queueMail({
    to: email,
    subject: "Confirm your email for SplitnDutch",
    heading: `Welcome, ${name.split(" ")[0]}!`,
    lines: [
      "Confirm this is your email so friends can find you and you can reset your password if you ever need to.",
      "Then add your UPI ID in Account so people can pay you back in one tap.",
    ],
    cta: { label: "Confirm email", href: `/verify/${token}` },
    footer: "If you didn't create this account, ignore this email.",
  });
}

export function verifyEmail(token: string): ActionError | { ok: true; userId: string } {
  const row = consumeToken(token, ["verify"]);
  if (!row) return fail("This link has expired or was already used.");
  getDb().prepare(`UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?`).run(nowISO(), row.userId);
  return { ok: true, userId: row.userId };
}

export async function authenticate(email: string, password: string): Promise<ActionError | { ok: true; userId: string }> {
  const user = findUserByEmail(email);
  if (!user || user.status === "deleted" || user.status === "guest") return fail("Email or password doesn't match.");
  if (user.status === "invited") {
    return fail("You were invited but haven't set a password yet. Use “Forgot password” and we'll email you a link.");
  }
  const row = getDb().prepare(`SELECT password_hash FROM users WHERE id = ?`).get(user.id) as { password_hash: string };
  const match = row.password_hash ? await bcrypt.compare(password, row.password_hash) : false;
  if (!match) return fail("Email or password doesn't match.");
  return { ok: true, userId: user.id };
}

/** Always "succeeds" so the form can't be used to find out who has an account. */
export function requestPasswordReset(email: string) {
  const user = findUserByEmail(email);
  if (!user || (user.status !== "active" && user.status !== "invited")) return;
  if (user.status === "invited") {
    const token = issueToken(user.id, "invite");
    queueMail({
      to: user.email,
      subject: "Set your SplitnDutch password",
      heading: "Set your password",
      lines: ["Your friends added you to SplitnDutch. Choose a password to see your groups and balances."],
      cta: { label: "Set my password", href: `/invite/${token}` },
    });
    return;
  }
  const token = issueToken(user.id, "reset");
  queueMail({
    to: user.email,
    subject: "Reset your SplitnDutch password",
    heading: "Reset your password",
    lines: ["Someone asked to reset the password for this account. The link works for 2 hours."],
    cta: { label: "Choose a new password", href: `/reset/${token}` },
    footer: "If this wasn't you, ignore this email. Your password stays the same.",
  });
}

/** Used by both reset links and invite links. Either one proves the person owns the inbox. */
export async function setPasswordWithToken(
  token: string,
  password: string,
  name?: string,
): Promise<ActionError | { ok: true; userId: string }> {
  if (password.length < 8 || password.length > 72) return fail("Use a password of 8 to 72 characters.");
  const clean = name !== undefined ? cleanName(name) : undefined;
  if (clean !== undefined && (clean.length < 1 || clean.length > 60)) return fail("Use a name between 1 and 60 characters.");
  const row = consumeToken(token, ["reset", "invite"]);
  if (!row) return fail("This link has expired or was already used. Ask for a new one.");
  const hash = await bcrypt.hash(password, 10);
  const db = getDb();
  db.prepare(
    `UPDATE users SET password_hash = ?, status = 'active', email_verified_at = COALESCE(email_verified_at, ?),
       name = COALESCE(?, name) WHERE id = ? AND status IN ('active', 'invited')`,
  ).run(hash, nowISO(), clean ?? null, row.userId);
  db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(row.userId);
  return { ok: true, userId: row.userId };
}

export async function updateProfile(
  user: SessionUser,
  input: { name: string; email: string; currency: string; upiId: string; emailPrefs: number; password: string },
): Promise<ActionError | { ok: true; emailChanged: boolean }> {
  const name = cleanName(input.name);
  const email = input.email.trim().toLowerCase();
  const upi = input.upiId.trim();
  if (name.length < 1 || name.length > 60) return fail("Use a name between 1 and 60 characters.");
  if (!EMAIL.test(email) || !isDeliverable(email)) return fail("Enter a valid email address.");
  if (!isCurrency(input.currency)) return fail("Choose a currency from the list.");
  if (upi && !isUpiId(upi)) return fail("That UPI ID doesn't look right. It should look like name@okhdfcbank or 98xxxxxx@ybl.");
  if (![0, 1, 2].includes(input.emailPrefs)) return fail("Choose an email setting.");
  const db = getDb();
  const emailChanged = email !== user.email.toLowerCase();
  if (emailChanged) {
    const row = db.prepare(`SELECT password_hash FROM users WHERE id = ?`).get(user.id) as { password_hash: string };
    if (!input.password || !(await bcrypt.compare(input.password, row.password_hash))) {
      return fail("Enter your current password to change your email.");
    }
    const taken = db.prepare(`SELECT id FROM users WHERE email = ? COLLATE NOCASE AND id != ?`).get(email, user.id);
    if (taken) return fail("Another account already uses that email.");
  }
  db.prepare(
    `UPDATE users SET name = ?, email = ?, currency = ?, upi_id = ?, email_prefs = ?,
       email_verified_at = CASE WHEN ? THEN NULL ELSE email_verified_at END WHERE id = ?`,
  ).run(name, email, input.currency, upi, input.emailPrefs, emailChanged ? 1 : 0, user.id);
  if (emailChanged) sendVerification(user.id, email, name);
  return { ok: true, emailChanged };
}

export async function updatePassword(
  user: SessionUser,
  current: string,
  next: string,
): Promise<ActionError | { ok: true }> {
  if (next.length < 8 || next.length > 72) return fail("Use a new password of 8 to 72 characters.");
  const row = getDb().prepare(`SELECT password_hash FROM users WHERE id = ?`).get(user.id) as { password_hash: string };
  const match = await bcrypt.compare(current, row.password_hash);
  if (!match) return fail("Current password doesn't match.");
  const hash = await bcrypt.hash(next, 10);
  getDb().prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hash, user.id);
  return { ok: true };
}

function openBalanceWith(userId: string, otherId?: string): boolean {
  const debts = debtsForUser(userId);
  return debts.some((d) =>
    otherId
      ? (d.fromId === userId && d.toId === otherId) || (d.toId === userId && d.fromId === otherId)
      : d.fromId === userId || d.toId === userId,
  );
}

/** DPDP-style erasure: personal data goes, the shared ledger stays balanced for everyone else. */
export async function deleteAccount(user: SessionUser, password: string): Promise<ActionError | { ok: true }> {
  const db = getDb();
  const row = db.prepare(`SELECT password_hash FROM users WHERE id = ?`).get(user.id) as { password_hash: string };
  if (!(await bcrypt.compare(password, row.password_hash))) return fail("Password doesn't match.");
  if (openBalanceWith(user.id)) return fail("Settle every balance first, so nobody is left owing a deleted account.");
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE users SET name = 'Deleted user', email = ?, password_hash = '', upi_id = '', status = 'deleted',
         email_prefs = 0, email_verified_at = NULL WHERE id = ?`,
    ).run(`deleted-${user.id}@deleted.invalid`, user.id);
    db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(user.id);
    db.prepare(`DELETE FROM tokens WHERE user_id = ?`).run(user.id);
    db.prepare(`DELETE FROM notifications WHERE user_id = ?`).run(user.id);
    db.prepare(`DELETE FROM friendships WHERE user_low = ? OR user_high = ?`).run(user.id, user.id);
    db.prepare(`DELETE FROM group_members WHERE user_id = ?`).run(user.id);
  });
  tx();
  return { ok: true };
}

export function exportAccount(user: SessionUser) {
  const expenses = loadVisibleExpenses(user.id).filter(
    (e) => e.createdBy === user.id || e.payers.some((p) => p.userId === user.id) || e.shares.some((s) => s.userId === user.id),
  );
  return {
    exportedAt: nowISO(),
    note: "Amounts are in minor units (paise for INR, cents for USD).",
    profile: { id: user.id, name: user.name, email: user.email, currency: user.currency, upiId: user.upiId, createdAt: user.createdAt },
    groups: listGroups(user.id).map((g) => ({ id: g.id, name: g.name, type: g.type, destination: g.destination, currency: g.currency })),
    expenses,
  };
}

// ———————————————————————————————— people & invites ————————————————————————————————

type Inviter = Pick<SessionUser, "id" | "name" | "email">;

function sendInvite(inviter: Inviter, inviteeId: string, email: string, context: string) {
  const token = issueToken(inviteeId, "invite");
  queueMail({
    to: email,
    subject: `${inviter.name} added you on SplitnDutch`,
    heading: `${inviter.name.split(" ")[0]} wants to split expenses with you`,
    lines: [
      `${inviter.name} (${inviter.email}) added you ${context} on SplitnDutch, a free, open-source app for splitting bills.`,
      "Your balance is already there. Set a password to see it, add expenses, and settle up by UPI.",
    ],
    cta: { label: "See what's owed", href: `/invite/${token}` },
    footer: `This invite link works for 30 days. If you don't know ${inviter.name}, ignore this email.`,
  });
}

/**
 * Find or create the person behind an email or a bare name.
 * Unknown email → an "invited" account that gets an invite link. Name only → a "guest".
 */
function resolvePerson(
  inviter: Inviter,
  entry: { email?: string; name?: string },
  context: string,
): ActionError | { id: string; created: boolean } {
  const email = entry.email?.trim().toLowerCase() ?? "";
  const name = cleanName(entry.name ?? "");
  const db = getDb();
  if (email) {
    if (!EMAIL.test(email) || email.length > 120 || !isDeliverable(email)) return fail(`“${email}” isn't a valid email.`);
    const found = findUserByEmail(email);
    if (found && found.status !== "deleted") return { id: found.id, created: false };
    const id = crypto.randomUUID();
    const display = name || email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    db.prepare(
      `INSERT INTO users (id, name, email, password_hash, currency, created_at, status, invited_by) VALUES (?, ?, ?, '', ?, ?, 'invited', ?)`,
    ).run(id, display.slice(0, 60), email, DEFAULT_CURRENCY, nowISO(), inviter.id);
    sendInvite(inviter, id, email, context);
    return { id, created: true };
  }
  if (name.length < 1 || name.length > 60) return fail("Enter a name or an email.");
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, currency, created_at, status, invited_by) VALUES (?, ?, ?, '', ?, ?, 'guest', ?)`,
  ).run(id, name, `guest-${id}@guest.invalid`, DEFAULT_CURRENCY, nowISO(), inviter.id);
  return { id, created: true };
}

/** "Riya <riya@x.com>", "riya@x.com" or just "Riya" — one per line or comma. */
export function parseEntries(raw: string): { email?: string; name?: string }[] {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const angle = /^(.*)<([^>]+)>$/.exec(s);
      if (angle) return { name: angle[1].trim(), email: angle[2].trim() };
      if (s.includes("@")) return { email: s };
      return { name: s };
    });
}

export function addFriend(user: SessionUser, input: { email: string; name: string }): ActionError | { ok: true; friendId: string; invited: boolean } {
  const email = input.email.trim().toLowerCase();
  if (email === user.email.toLowerCase()) return fail("That's your own email.");
  const db = getDb();
  let result: ActionError | { id: string; created: boolean } = fail("Something went wrong.");
  db.transaction(() => {
    result = resolvePerson(user, { email, name: input.name }, "as a friend");
    if ("error" in result) return;
    if (!areFriends(user.id, result.id)) {
      ensureFriendship(db, user.id, result.id);
      if (!result.created) {
        addNotification(db, {
          userId: result.id,
          type: "friend",
          title: `${user.name} added you as a friend`,
          body: "You can now split expenses together.",
          href: `/friends/${user.id}`,
        });
      }
    }
  })();
  const r = result as ActionError | { id: string; created: boolean };
  if ("error" in r) return r;
  return { ok: true, friendId: r.id, invited: r.created && Boolean(email) };
}

export function removeFriend(user: SessionUser, friendId: string): ActionError | { ok: true } {
  if (!areFriends(user.id, friendId)) return fail("You aren't friends with that person.");
  if (openBalanceWith(user.id, friendId)) return fail("Settle up with them before removing the friendship.");
  const [low, high] = user.id < friendId ? [user.id, friendId] : [friendId, user.id];
  getDb().prepare(`DELETE FROM friendships WHERE user_low = ? AND user_high = ?`).run(low, high);
  return { ok: true };
}

/** Give a name-only guest an email. If that email already has an account, the guest is merged into it. */
export function inviteGuest(user: SessionUser, guestId: string, rawEmail: string): ActionError | { ok: true; mergedInto?: string } {
  const guest = getPerson(guestId);
  if (!guest || guest.status !== "guest") return fail("That person already has an email.");
  const sharesGroup = listGroups(user.id).some((g) => g.memberIds.includes(guestId));
  if (!sharesGroup && !areFriends(user.id, guestId)) return fail("You can only invite people you share a group with.");
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL.test(email) || !isDeliverable(email)) return fail("Enter a valid email address.");
  const existing = findUserByEmail(email);
  if (existing && existing.status !== "deleted") {
    mergeUsers(guestId, existing.id);
    addNotification(getDb(), {
      userId: existing.id,
      type: "group",
      title: `${user.name} linked ${guest.name}'s expenses to you`,
      body: "Expenses recorded for you before you joined are now on your account.",
      href: "/dashboard",
    });
    return { ok: true, mergedInto: existing.id };
  }
  getDb().prepare(`UPDATE users SET email = ?, status = 'invited' WHERE id = ?`).run(email, guestId);
  sendInvite(user, guestId, email, "to a shared group");
  return { ok: true };
}

export function resendInvite(user: SessionUser, personId: string): ActionError | { ok: true } {
  const person = getPerson(personId);
  if (!person || person.status !== "invited") return fail("They've already joined.");
  const connected = areFriends(user.id, personId) || listGroups(user.id).some((g) => g.memberIds.includes(personId));
  if (!connected) return fail("You can only re-invite people you share a group with.");
  const recent = getDb()
    .prepare(`SELECT 1 FROM tokens WHERE user_id = ? AND kind = 'invite' AND created_at > ?`)
    .get(personId, new Date(Date.now() - 6 * 3600_000).toISOString());
  if (recent) return fail("An invite went out in the last few hours. Give them a little time.");
  sendInvite(user, personId, person.email, "");
  return { ok: true };
}

/** Move everything recorded for `fromId` onto `toId`, then remove `fromId`. */
export function mergeUsers(fromId: string, toId: string) {
  if (fromId === toId) return;
  const db = getDb();
  db.transaction(() => {
    for (const table of ["expense_payers", "expense_shares"] as const) {
      const rows = db.prepare(`SELECT * FROM ${table} WHERE user_id = ?`).all(fromId) as {
        expense_id: string;
        amount_minor: number;
        percent_bps?: number | null;
        share_count?: number | null;
      }[];
      for (const r of rows) {
        const clash = db.prepare(`SELECT 1 FROM ${table} WHERE expense_id = ? AND user_id = ?`).get(r.expense_id, toId);
        if (clash) {
          if (table === "expense_shares") {
            db.prepare(
              `UPDATE expense_shares SET amount_minor = amount_minor + ?,
                 percent_bps = CASE WHEN percent_bps IS NULL THEN NULL ELSE percent_bps + COALESCE(?, 0) END,
                 share_count = CASE WHEN share_count IS NULL THEN NULL ELSE share_count + COALESCE(?, 0) END
               WHERE expense_id = ? AND user_id = ?`,
            ).run(r.amount_minor, r.percent_bps ?? null, r.share_count ?? null, r.expense_id, toId);
          } else {
            db.prepare(`UPDATE expense_payers SET amount_minor = amount_minor + ? WHERE expense_id = ? AND user_id = ?`).run(
              r.amount_minor,
              r.expense_id,
              toId,
            );
          }
          db.prepare(`DELETE FROM ${table} WHERE expense_id = ? AND user_id = ?`).run(r.expense_id, fromId);
        } else {
          db.prepare(`UPDATE ${table} SET user_id = ? WHERE expense_id = ? AND user_id = ?`).run(toId, r.expense_id, fromId);
        }
      }
    }
    db.prepare(
      `INSERT OR IGNORE INTO group_members (group_id, user_id, created_at) SELECT group_id, ?, created_at FROM group_members WHERE user_id = ?`,
    ).run(toId, fromId);
    const friends = db
      .prepare(`SELECT CASE WHEN user_low = ? THEN user_high ELSE user_low END AS id FROM friendships WHERE user_low = ? OR user_high = ?`)
      .all(fromId, fromId, fromId) as { id: string }[];
    for (const f of friends) if (f.id !== toId) ensureFriendship(db, toId, f.id);
    db.prepare(`UPDATE expenses SET created_by = ? WHERE created_by = ?`).run(toId, fromId);
    db.prepare(`UPDATE comments SET user_id = ? WHERE user_id = ?`).run(toId, fromId);
    db.prepare(`UPDATE groups SET created_by = ? WHERE created_by = ?`).run(toId, fromId);
    db.prepare(`UPDATE reminders SET to_user = ? WHERE to_user = ?`).run(toId, fromId);
    db.prepare(`UPDATE reminders SET from_user = ? WHERE from_user = ?`).run(toId, fromId);
    db.prepare(`DELETE FROM users WHERE id = ?`).run(fromId);
  })();
}

// ———————————————————————————————— groups ————————————————————————————————

type GroupInput = {
  name: string;
  type: string;
  currency: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number | null;
};

function validateGroup(input: GroupInput): ActionError | null {
  const name = cleanName(input.name);
  if (name.length < 1 || name.length > 60) return fail("Give the group a name, up to 60 characters.");
  if (!isGroupType(input.type)) return fail("Choose a group type.");
  if (!isCurrency(input.currency)) return fail("Choose a currency.");
  if (input.destination && !getDestination(input.destination)) return fail("Choose a destination from the list.");
  if (input.startDate && !isISODate(input.startDate)) return fail("Choose a valid start date.");
  if (input.endDate && !isISODate(input.endDate)) return fail("Choose a valid end date.");
  if (input.startDate && input.endDate && input.endDate < input.startDate) return fail("The trip can't end before it starts.");
  if (input.budget !== null && (!Number.isInteger(input.budget) || input.budget < 0 || input.budget > MAX_MINOR)) {
    return fail("Enter a budget as a plain number.");
  }
  return null;
}

export function createGroup(
  user: SessionUser,
  input: GroupInput & { members: string },
): ActionError | { ok: true; id: string; invited: number } {
  const problem = validateGroup(input);
  if (problem) return problem;
  const entries = parseEntries(input.members);
  if (entries.length > 50) return fail("Add up to 50 people at a time.");
  const db = getDb();
  const id = crypto.randomUUID();
  const name = cleanName(input.name);
  const now = nowISO();
  let error: ActionError | null = null;
  let invited = 0;
  const run = db.transaction(() => {
    db.prepare(
      `INSERT INTO groups (id, name, type, created_by, simplify, archived, created_at, currency, invite_code, destination, start_date, end_date, budget_minor)
       VALUES (?, ?, ?, ?, 1, 0, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id, name, input.type, user.id, now, input.currency, newInviteCode(),
      input.type === "trip" ? input.destination : "", input.startDate || null, input.endDate || null, input.budget,
    );
    const memberIds = new Set<string>([user.id]);
    for (const entry of entries) {
      if (entry.email && entry.email.toLowerCase() === user.email.toLowerCase()) continue;
      const r = resolvePerson(user, entry, `to “${name}”`);
      if ("error" in r) {
        error = r;
        throw new Error("rollback");
      }
      if (r.created && entry.email) invited++;
      memberIds.add(r.id);
    }
    const add = db.prepare(`INSERT OR IGNORE INTO group_members (group_id, user_id, created_at) VALUES (?, ?, ?)`);
    for (const memberId of memberIds) {
      add.run(id, memberId, now);
      ensureFriendship(db, user.id, memberId);
    }
    notifyOthers(db, [...memberIds], user.id, {
      type: "group",
      title: `${user.name} added you to ${name}`,
      body: "Open the group to see expenses and balances.",
      href: `/groups/${id}`,
    });
  });
  try {
    run();
  } catch (err) {
    if (error) return error;
    throw err;
  }
  return { ok: true, id, invited };
}

export function updateGroup(
  user: SessionUser,
  groupId: string,
  input: GroupInput & { simplify: boolean },
): ActionError | { ok: true } {
  const group = getGroup(groupId);
  if (!group || !group.memberIds.includes(user.id)) return fail("You don't have access to that group.");
  const problem = validateGroup(input);
  if (problem) return problem;
  getDb()
    .prepare(
      `UPDATE groups SET name = ?, type = ?, simplify = ?, currency = ?, destination = ?, start_date = ?, end_date = ?, budget_minor = ?
       WHERE id = ?`,
    )
    .run(
      cleanName(input.name), input.type, input.simplify ? 1 : 0, input.currency,
      input.type === "trip" ? input.destination : "", input.startDate || null, input.endDate || null, input.budget, groupId,
    );
  return { ok: true };
}

export function addGroupMember(
  user: SessionUser,
  groupId: string,
  entry: { email: string; name: string },
): ActionError | { ok: true; invited: boolean; name: string } {
  const group = getGroup(groupId);
  if (!group || !group.memberIds.includes(user.id)) return fail("You don't have access to that group.");
  if (group.memberIds.length >= 100) return fail("Groups can have up to 100 people.");
  const db = getDb();
  let out: ActionError | { ok: true; invited: boolean; name: string } = fail("Something went wrong.");
  db.transaction(() => {
    const r = resolvePerson(user, { email: entry.email || undefined, name: entry.name }, `to “${group.name}”`);
    if ("error" in r) {
      out = r;
      return;
    }
    if (group.memberIds.includes(r.id)) {
      out = fail(`${getPerson(r.id)?.name ?? "They"} is already in this group.`);
      return;
    }
    db.prepare(`INSERT INTO group_members (group_id, user_id, created_at) VALUES (?, ?, ?)`).run(groupId, r.id, nowISO());
    ensureFriendship(db, user.id, r.id);
    if (!r.created) {
      addNotification(db, {
        userId: r.id,
        type: "group",
        title: `${user.name} added you to ${group.name}`,
        body: "Open the group to see expenses and balances.",
        href: `/groups/${groupId}`,
      });
    }
    out = { ok: true, invited: r.created && Boolean(entry.email), name: getPerson(r.id)?.name ?? "" };
  })();
  return out;
}

export function regenerateInviteCode(user: SessionUser, groupId: string): ActionError | { ok: true } {
  const group = getGroup(groupId);
  if (!group || !group.memberIds.includes(user.id)) return fail("You don't have access to that group.");
  getDb().prepare(`UPDATE groups SET invite_code = ? WHERE id = ?`).run(newInviteCode(), groupId);
  return { ok: true };
}

export function ensureInviteCode(groupId: string): string {
  const db = getDb();
  const row = db.prepare(`SELECT invite_code FROM groups WHERE id = ?`).get(groupId) as { invite_code: string | null } | undefined;
  if (row?.invite_code) return row.invite_code;
  const code = newInviteCode();
  db.prepare(`UPDATE groups SET invite_code = ? WHERE id = ?`).run(code, groupId);
  return code;
}

export function joinGroupByCode(user: SessionUser, code: string): ActionError | { ok: true; id: string } {
  const group = findGroupByInvite(code);
  if (!group) return fail("This invite link has expired or was reset. Ask for a new one.");
  if (group.memberIds.includes(user.id)) return { ok: true, id: group.id };
  if (group.memberIds.length >= 100) return fail("This group is full.");
  const db = getDb();
  db.transaction(() => {
    db.prepare(`INSERT INTO group_members (group_id, user_id, created_at) VALUES (?, ?, ?)`).run(group.id, user.id, nowISO());
    for (const m of group.memberIds) ensureFriendship(db, user.id, m);
    notifyOthers(db, group.memberIds, user.id, {
      type: "group",
      title: `${user.name} joined ${group.name}`,
      body: "They joined with the group's invite link.",
      href: `/groups/${group.id}`,
    });
  })();
  return { ok: true, id: group.id };
}

// ———————————————————————————————— reminders ————————————————————————————————

export function remindPayment(user: SessionUser, debtorId: string, groupId: string | null): ActionError | { ok: true; name: string } {
  const debtor = getPerson(debtorId);
  if (!debtor || debtorId === user.id) return fail("Choose who to remind.");
  if (debtor.status === "guest") return fail(`${debtor.name} has no email yet. Send a WhatsApp reminder, or add their email.`);
  if (debtor.status === "deleted") return fail("That account was deleted.");
  const debts = debtsForUser(user.id).filter((d) => (groupId ? d.scope.startsWith(`g:${groupId}:`) : true));
  const lines = pairNet(debts, user.id, debtorId).filter((l) => l.minor > 0);
  if (lines.length === 0) return fail(`${debtor.name} doesn't owe you anything${groupId ? " here" : ""}.`);
  const db = getDb();
  const recent = db
    .prepare(`SELECT 1 FROM reminders WHERE from_user = ? AND to_user = ? AND created_at > ?`)
    .get(user.id, debtorId, new Date(Date.now() - 20 * 3600_000).toISOString());
  if (recent) return fail(`You already reminded ${debtor.name} today. Try again tomorrow.`);
  db.prepare(`INSERT INTO reminders (id, from_user, to_user, group_id, created_at) VALUES (?, ?, ?, ?, ?)`).run(
    crypto.randomUUID(), user.id, debtorId, groupId, nowISO(),
  );
  const amount = lines.map((l) => formatMoney(l.minor, l.currency)).join(" + ");
  const group = groupId ? getGroup(groupId) : null;
  const where = group ? ` for ${group.name}` : "";
  const upiLine = user.upiId ? `Pay by UPI to ${user.upiId}, or open the app for a one-tap UPI link.` : "Open the app to settle up.";
  if (debtor.status === "invited") {
    const token = issueToken(debtorId, "invite");
    queueMail({
      to: debtor.email,
      subject: `${user.name} sent a reminder: ${amount}`,
      heading: `You owe ${user.name.split(" ")[0]} ${amount}${where}`,
      lines: [`${user.name} is using SplitnDutch to keep track of shared expenses.`, upiLine],
      cta: { label: "See the details", href: `/invite/${token}` },
    });
  } else {
    addNotification(db, {
      userId: debtorId,
      type: "reminder",
      title: `${user.name} sent a reminder: you owe ${amount}${where}`,
      body: upiLine,
      href: group ? `/groups/${group.id}` : `/friends/${user.id}`,
    });
  }
  return { ok: true, name: debtor.name };
}

function memberNets(groupId: string, simplify: boolean) {
  const rows = getDb()
    .prepare(`SELECT id FROM expenses WHERE group_id = ? AND deleted_at IS NULL`)
    .all(groupId) as { id: string }[];
  const expenses = rows
    .map((r) => getExpense(r.id))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));
  return buildDebts(expenses, () => simplify);
}

export function removeGroupMember(user: SessionUser, groupId: string, memberId: string): ActionError | { ok: true } {
  const group = getGroup(groupId);
  if (!group || !group.memberIds.includes(user.id)) return fail("You don't have access to that group.");
  if (!group.memberIds.includes(memberId)) return fail("That person isn't in the group.");
  if (group.memberIds.length === 1) return fail("You're the last person here. Delete the group instead.");
  const debts = memberNets(groupId, group.simplify);
  const lines = userNet(debts, memberId, `g:${groupId}:`);
  if (lines.length > 0) {
    const person = getPerson(memberId);
    return fail(`${person?.name ?? "This person"} still has a balance here. Settle up first.`);
  }
  getDb().prepare(`DELETE FROM group_members WHERE group_id = ? AND user_id = ?`).run(groupId, memberId);
  return { ok: true };
}

export function archiveGroup(user: SessionUser, groupId: string): ActionError | { ok: true } {
  const group = getGroup(groupId);
  if (!group || !group.memberIds.includes(user.id)) return fail("You don't have access to that group.");
  const debts = memberNets(groupId, group.simplify);
  for (const memberId of group.memberIds) {
    if (userNet(debts, memberId, `g:${groupId}:`).length > 0) {
      return fail("Everyone needs to be settled before this group can be deleted.");
    }
  }
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(`UPDATE expenses SET deleted_at = ? WHERE group_id = ? AND deleted_at IS NULL`).run(nowISO(), groupId);
    db.prepare(`UPDATE groups SET archived = 1 WHERE id = ?`).run(groupId);
  });
  tx();
  return { ok: true };
}

function validateExpense(user: SessionUser, input: ExpenseInput, existingGroupId?: string | null): ActionError | null {
  const description = input.description.trim();
  if (description.length < 1 || description.length > 80) return fail("Add a description, up to 80 characters.");
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0 || input.amountMinor > MAX_MINOR) {
    return fail("Enter an amount greater than zero.");
  }
  if (!isCurrency(input.currency)) return fail("Choose a currency.");
  if (!isCategory(input.category)) return fail("Choose a category.");
  if (!isISODate(input.date)) return fail("Choose a valid date.");
  if (input.notes.length > 2000) return fail("Keep notes under 2,000 characters.");
  if (!["equal", "exact", "percent", "shares"].includes(input.splitType)) return fail("Choose how to split this.");
  if (input.payers.length === 0) return fail("Choose who paid.");
  if (input.shares.length === 0) return fail("Choose who is splitting this.");
  if (new Set(input.payers.map((p) => p.userId)).size !== input.payers.length) return fail("Each payer should be listed once.");
  if (new Set(input.shares.map((s) => s.userId)).size !== input.shares.length) return fail("Each person should be listed once.");
  const payerSum = input.payers.reduce((s, p) => s + p.minor, 0);
  const shareSum = input.shares.reduce((s, p) => s + p.minor, 0);
  if (payerSum !== input.amountMinor) return fail("The amounts paid need to add up to the total.");
  if (shareSum !== input.amountMinor) return fail("The shares need to add up to the total.");
  if (input.payers.some((p) => p.minor < 0) || input.shares.some((s) => s.minor <= 0)) {
    return fail("Every share needs to be more than zero.");
  }
  const ids = new Set<string>();
  for (const p of input.payers) ids.add(p.userId);
  for (const s of input.shares) ids.add(s.userId);
  if (input.groupId) {
    const group = getGroup(input.groupId);
    if (!group || !isMember(input.groupId, user.id)) return fail("You don't have access to that group.");
    for (const id of ids) {
      if (!group.memberIds.includes(id)) return fail("Everyone on the expense needs to be in the group.");
    }
  } else {
    if (![...ids].includes(user.id)) return fail("A personal expense needs to include you.");
    for (const id of ids) {
      if (id !== user.id && !areFriends(user.id, id)) return fail("Add someone as a friend before splitting a personal expense with them.");
    }
  }
  if (existingGroupId !== undefined && existingGroupId !== input.groupId) {
    return fail("Move expenses by editing them inside the original group.");
  }
  if (input.category === "settlement") {
    if (input.payers.length !== 1 || input.shares.length !== 1) return fail("A payment is from one person to one person.");
    if (input.payers[0].userId === input.shares[0].userId) return fail("Choose two different people for a payment.");
  }
  return null;
}

export function saveExpense(
  user: SessionUser,
  input: ExpenseInput,
  expenseId?: string,
): ActionError | { ok: true; id: string; href: string } {
  const description = input.description.trim().replace(/\s+/g, " ");
  const notes = input.notes.trim();
  const next: ExpenseInput = { ...input, description, notes, groupId: input.groupId || null };
  if (expenseId) {
    const existing = getExpense(expenseId);
    if (!existing || !canEdit(user.id, existing)) return fail("You can't edit that expense.");
    const problem = validateExpense(user, next, existing.groupId);
    if (problem) return problem;
    replaceExpense(getDb(), expenseId, next);
    const involved = [...next.payers.map((p) => p.userId), ...next.shares.map((s) => s.userId)];
    notifyOthers(getDb(), involved, user.id, {
      type: "expense",
      title: `${user.name} updated ${description}`,
      body: next.groupId ? groupLabel(next.groupId) : "Personal expense",
      href: `/expenses/${expenseId}`,
    });
    return { ok: true, id: expenseId, href: next.groupId ? `/groups/${next.groupId}` : `/expenses/${expenseId}` };
  }
  const problem = validateExpense(user, next);
  if (problem) return problem;
  if (next.repeat !== "none" && next.repeat !== "weekly" && next.repeat !== "monthly") {
    return fail("Choose how often this repeats.");
  }
  if (next.repeatUntil && !isISODate(next.repeatUntil)) return fail("Choose a valid end date.");
  const id = crypto.randomUUID();
  const db = getDb();
  insertExpense(db, { ...next, id, createdBy: user.id });
  const involved = [...next.payers.map((p) => p.userId), ...next.shares.map((s) => s.userId)];
  notifyOthers(db, involved, user.id, {
    type: next.category === "settlement" ? "settlement" : "expense",
    title:
      next.category === "settlement"
        ? `${user.name} recorded a payment`
        : `${user.name} added ${description}`,
    body: `${formatMoney(next.amountMinor, next.currency)}${next.groupId ? ` · ${groupLabel(next.groupId)}` : ""}`,
    href: `/expenses/${id}`,
  });
  return { ok: true, id, href: next.groupId ? `/groups/${next.groupId}` : `/expenses/${id}` };
}

function groupLabel(groupId: string): string {
  return getGroup(groupId)?.name ?? "Group";
}

function canEdit(userId: string, expense: NonNullable<ReturnType<typeof getExpense>>): boolean {
  if (expense.groupId) return isMember(expense.groupId, userId);
  return (
    expense.createdBy === userId ||
    expense.payers.some((p) => p.userId === userId) ||
    expense.shares.some((s) => s.userId === userId)
  );
}

export function removeExpense(user: SessionUser, expenseId: string): ActionError | { ok: true; href: string } {
  const expense = getExpense(expenseId);
  if (!expense || !canEdit(user.id, expense)) return fail("You can't delete that expense.");
  getDb().prepare(`UPDATE expenses SET deleted_at = ?, updated_at = ? WHERE id = ?`).run(nowISO(), nowISO(), expenseId);
  const involved = [...expense.payers.map((p) => p.userId), ...expense.shares.map((s) => s.userId)];
  notifyOthers(getDb(), involved, user.id, {
    type: "expense",
    title: `${user.name} deleted ${expense.description}`,
    body: formatMoney(expense.amountMinor, expense.currency),
    href: expense.groupId ? `/groups/${expense.groupId}` : "/activity",
  });
  return { ok: true, href: expense.groupId ? `/groups/${expense.groupId}` : "/dashboard" };
}

export function postNextOccurrence(user: SessionUser, templateId: string): ActionError | { ok: true; id: string } {
  const template = getExpense(templateId);
  if (!template || !template.repeatInterval || template.seriesId) return fail("That expense doesn't repeat.");
  if (!canEdit(user.id, template)) return fail("You can't post that bill.");
  const children = getDb()
    .prepare(`SELECT expense_date FROM expenses WHERE series_id = ? AND deleted_at IS NULL`)
    .all(templateId) as { expense_date: string }[];
  const existing = new Set([template.expenseDate, ...children.map((c) => c.expense_date)]);
  const until = template.repeatUntil && template.repeatUntil < todayISO() ? template.repeatUntil : todayISO();
  const dates = dueOccurrences(template.expenseDate, template.repeatInterval, until, existing);
  if (dates.length === 0) return fail("Nothing is due yet.");
  const id = crypto.randomUUID();
  insertExpense(getDb(), {
    id,
    groupId: template.groupId,
    description: template.description,
    amountMinor: template.amountMinor,
    currency: template.currency,
    category: template.category,
    date: dates[0],
    notes: template.notes,
    splitType: template.splitType,
    payers: template.payers,
    shares: template.shares.map((s) => ({
      userId: s.userId,
      minor: s.minor,
      percentBps: s.percentBps,
      shareCount: s.shareCount,
    })),
    repeat: "none",
    repeatUntil: null,
    createdBy: user.id,
    seriesId: template.id,
    repeatInterval: null,
  });
  return { ok: true, id };
}

export function stopRecurring(user: SessionUser, templateId: string): ActionError | { ok: true } {
  const template = getExpense(templateId);
  if (!template || !canEdit(user.id, template)) return fail("You can't change that expense.");
  getDb().prepare(`UPDATE expenses SET repeat_interval = NULL, updated_at = ? WHERE id = ?`).run(nowISO(), templateId);
  return { ok: true };
}

export function addComment(user: SessionUser, expenseId: string, body: string): ActionError | { ok: true } {
  const expense = getExpense(expenseId);
  if (!expense || !canEdit(user.id, expense)) return fail("You can't comment on that expense.");
  const text = body.trim();
  if (text.length < 1 || text.length > 1000) return fail("Write a comment, up to 1,000 characters.");
  const db = getDb();
  db.prepare(`INSERT INTO comments (id, expense_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)`).run(
    crypto.randomUUID(),
    expenseId,
    user.id,
    text,
    nowISO(),
  );
  const involved = [...expense.payers.map((p) => p.userId), ...expense.shares.map((s) => s.userId), expense.createdBy];
  notifyOthers(db, involved, user.id, {
    type: "comment",
    title: `${user.name} commented on ${expense.description}`,
    body: text.length > 140 ? `${text.slice(0, 137)}...` : text,
    href: `/expenses/${expenseId}`,
  });
  return { ok: true };
}

export function removeComment(user: SessionUser, commentId: string): ActionError | { ok: true } {
  const row = getDb()
    .prepare(`SELECT id, user_id, expense_id FROM comments WHERE id = ?`)
    .get(commentId) as { id: string; user_id: string; expense_id: string } | undefined;
  if (!row || row.user_id !== user.id) return fail("You can delete your own comments.");
  getDb().prepare(`DELETE FROM comments WHERE id = ?`).run(commentId);
  return { ok: true };
}

export function markNotification(user: SessionUser, id: string): { href: string } | ActionError {
  const row = getDb()
    .prepare(`SELECT href FROM notifications WHERE id = ? AND user_id = ?`)
    .get(id, user.id) as { href: string } | undefined;
  if (!row) return fail("That notification is gone.");
  getDb().prepare(`UPDATE notifications SET read_at = ? WHERE id = ? AND read_at IS NULL`).run(nowISO(), id);
  return { href: row.href };
}

export function markAllNotifications(user: SessionUser) {
  getDb().prepare(`UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL`).run(nowISO(), user.id);
}

export function settleUp(
  user: SessionUser,
  input: { fromId: string; toId: string; amountMinor: number; currency: string; date: string; groupId: string | null; note: string },
): ActionError | { ok: true; id: string; href: string } {
  if (input.fromId === input.toId) return fail("Choose two different people.");
  const from = getPerson(input.fromId);
  const to = getPerson(input.toId);
  if (!from || !to) return fail("Choose who paid and who received it.");
  return saveExpense(user, {
    description: `${from.name} paid ${to.name}`,
    amountMinor: input.amountMinor,
    currency: input.currency,
    category: "settlement",
    date: input.date,
    notes: input.note,
    groupId: input.groupId,
    splitType: "exact",
    payers: [{ userId: input.fromId, minor: input.amountMinor }],
    shares: [{ userId: input.toId, minor: input.amountMinor }],
    repeat: "none",
    repeatUntil: null,
  });
}
