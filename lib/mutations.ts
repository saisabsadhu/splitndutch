import bcrypt from "bcryptjs";
import { isCurrency } from "./money";
import { dueOccurrences, isISODate, nowISO, todayISO } from "./dates";
import { isCategory, isGroupType } from "./categories";
import { getDb } from "./db";
import { formatMoney } from "./money";
import {
  addNotification,
  ensureFriendship,
  insertExpense,
  notifyOthers,
  replaceExpense,
} from "./records";
import {
  areFriends,
  findUserByEmail,
  getExpense,
  getGroup,
  getPerson,
  isMember,
  listGroups,
  loadVisibleExpenses,
} from "./queries";
import { buildDebts, userNet } from "./balances";
import type { ExpenseInput, SessionUser } from "./types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MINOR = 100_000_000_00;

export type ActionError = { error: string };
export type ActionOk = { ok: true; id?: string; href?: string };

function fail(error: string): ActionError {
  return { error };
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  currency: string;
}): Promise<ActionError | { ok: true; userId: string }> {
  const name = input.name.trim().replace(/\s+/g, " ");
  const email = input.email.trim().toLowerCase();
  if (name.length < 1 || name.length > 60) return fail("Use a name between 1 and 60 characters.");
  if (!EMAIL.test(email) || email.length > 120) return fail("Enter a valid email address.");
  if (input.password.length < 8 || input.password.length > 72) return fail("Use a password of 8 to 72 characters.");
  if (!isCurrency(input.currency)) return fail("Choose a currency from the list.");
  const db = getDb();
  const existing = db.prepare(`SELECT id FROM users WHERE email = ? COLLATE NOCASE`).get(email);
  if (existing) return fail("An account with that email already exists. Log in instead.");
  const id = crypto.randomUUID();
  const hash = await bcrypt.hash(input.password, 10);
  db.prepare(`INSERT INTO users (id, name, email, password_hash, currency, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(
    id,
    name,
    email,
    hash,
    input.currency,
    nowISO(),
  );
  return { ok: true, userId: id };
}

export async function authenticate(email: string, password: string): Promise<ActionError | { ok: true; userId: string }> {
  const user = findUserByEmail(email);
  if (!user) return fail("Email or password doesn't match.");
  const row = getDb().prepare(`SELECT password_hash FROM users WHERE id = ?`).get(user.id) as { password_hash: string };
  const match = await bcrypt.compare(password, row.password_hash);
  if (!match) return fail("Email or password doesn't match.");
  return { ok: true, userId: user.id };
}

export async function updateProfile(
  user: SessionUser,
  input: { name: string; email: string; currency: string },
): Promise<ActionError | { ok: true }> {
  const name = input.name.trim().replace(/\s+/g, " ");
  const email = input.email.trim().toLowerCase();
  if (name.length < 1 || name.length > 60) return fail("Use a name between 1 and 60 characters.");
  if (!EMAIL.test(email)) return fail("Enter a valid email address.");
  if (!isCurrency(input.currency)) return fail("Choose a currency from the list.");
  const db = getDb();
  const taken = db.prepare(`SELECT id FROM users WHERE email = ? COLLATE NOCASE AND id != ?`).get(email, user.id) as
    | { id: string }
    | undefined;
  if (taken) return fail("Another account already uses that email.");
  db.prepare(`UPDATE users SET name = ?, email = ?, currency = ? WHERE id = ?`).run(name, email, input.currency, user.id);
  return { ok: true };
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

export function addFriend(user: SessionUser, email: string): ActionError | { ok: true; friendId: string } {
  const found = findUserByEmail(email);
  if (!found) return fail("No account with that email yet. Ask them to sign up, then add them.");
  if (found.id === user.id) return fail("That's your own email.");
  if (areFriends(user.id, found.id)) return { ok: true, friendId: found.id };
  ensureFriendship(getDb(), user.id, found.id);
  addNotification(getDb(), {
    userId: found.id,
    type: "friend",
    title: `${user.name} added you`,
    body: "You can now split expenses together.",
    href: `/friends/${user.id}`,
  });
  return { ok: true, friendId: found.id };
}

export function removeFriend(user: SessionUser, friendId: string): ActionError | { ok: true } {
  if (!areFriends(user.id, friendId)) return fail("You aren't friends with that person.");
  const expenses = loadVisibleExpenses(user.id);
  const groups = listGroups(user.id);
  const debts = buildDebts(expenses, (id) => groups.find((g) => g.id === id)?.simplify ?? true);
  const open = debts.some(
    (d) =>
      (d.fromId === user.id && d.toId === friendId) || (d.toId === user.id && d.fromId === friendId),
  );
  if (open) return fail("Settle up with them before removing the friendship.");
  const [low, high] = user.id < friendId ? [user.id, friendId] : [friendId, user.id];
  getDb().prepare(`DELETE FROM friendships WHERE user_low = ? AND user_high = ?`).run(low, high);
  return { ok: true };
}

function parseEmails(raw: string): string[] {
  return [...new Set(raw.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

export function createGroup(
  user: SessionUser,
  input: { name: string; type: string; emails: string },
): ActionError | { ok: true; id: string } {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 60) return fail("Give the group a name, up to 60 characters.");
  if (!isGroupType(input.type)) return fail("Choose a group type.");
  const emails = parseEmails(input.emails);
  const memberIds = new Set<string>([user.id]);
  for (const email of emails) {
    if (email === user.email.toLowerCase()) continue;
    const found = findUserByEmail(email);
    if (!found) return fail(`No account for ${email}. They need to sign up before you can add them.`);
    memberIds.add(found.id);
  }
  const db = getDb();
  const id = crypto.randomUUID();
  const now = nowISO();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO groups (id, name, type, created_by, simplify, archived, created_at) VALUES (?, ?, ?, ?, 1, 0, ?)`,
    ).run(id, name, input.type, user.id, now);
    const add = db.prepare(`INSERT INTO group_members (group_id, user_id, created_at) VALUES (?, ?, ?)`);
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
  tx();
  return { ok: true, id };
}

export function updateGroup(
  user: SessionUser,
  groupId: string,
  input: { name: string; type: string; simplify: boolean },
): ActionError | { ok: true } {
  const group = getGroup(groupId);
  if (!group || !group.memberIds.includes(user.id)) return fail("You don't have access to that group.");
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 60) return fail("Give the group a name, up to 60 characters.");
  if (!isGroupType(input.type)) return fail("Choose a group type.");
  getDb()
    .prepare(`UPDATE groups SET name = ?, type = ?, simplify = ? WHERE id = ?`)
    .run(name, input.type, input.simplify ? 1 : 0, groupId);
  return { ok: true };
}

export function addGroupMember(user: SessionUser, groupId: string, email: string): ActionError | { ok: true } {
  const group = getGroup(groupId);
  if (!group || !group.memberIds.includes(user.id)) return fail("You don't have access to that group.");
  const found = findUserByEmail(email);
  if (!found) return fail("No account with that email yet. Ask them to sign up first.");
  if (group.memberIds.includes(found.id)) return fail(`${found.name} is already in this group.`);
  const db = getDb();
  db.prepare(`INSERT INTO group_members (group_id, user_id, created_at) VALUES (?, ?, ?)`).run(groupId, found.id, nowISO());
  ensureFriendship(db, user.id, found.id);
  addNotification(db, {
    userId: found.id,
    type: "group",
    title: `${user.name} added you to ${group.name}`,
    body: "Open the group to see expenses and balances.",
    href: `/groups/${groupId}`,
  });
  return { ok: true };
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
