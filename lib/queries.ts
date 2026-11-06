import { buildDebts, owedTotals, pairNet, userNet, type Debt } from "./balances";
import { dueOccurrences, monthKey, todayISO } from "./dates";
import { getDb } from "./db";
import type {
  ActivityItem,
  ExpenseRecord,
  GroupRecord,
  MoneyLine,
  NotificationItem,
  Person,
  RecurringDue,
  SessionUser,
} from "./types";

type ExpenseJoin = {
  id: string;
  group_id: string | null;
  description: string;
  amount_minor: number;
  currency: string;
  category: string;
  expense_date: string;
  notes: string;
  split_type: ExpenseRecord["splitType"];
  repeat_interval: "weekly" | "monthly" | null;
  series_id: string | null;
  repeat_until: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function mapExpense(row: ExpenseJoin, payers: ExpenseRecord["payers"], shares: ExpenseRecord["shares"]): ExpenseRecord {
  return {
    id: row.id,
    groupId: row.group_id,
    description: row.description,
    amountMinor: row.amount_minor,
    currency: row.currency,
    category: row.category,
    expenseDate: row.expense_date,
    notes: row.notes,
    splitType: row.split_type,
    repeatInterval: row.repeat_interval,
    seriesId: row.series_id,
    repeatUntil: row.repeat_until,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    payers,
    shares,
  };
}

export function loadVisibleExpenses(userId: string): ExpenseRecord[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT e.* FROM expenses e
       WHERE e.deleted_at IS NULL
         AND (e.group_id IS NULL OR EXISTS (
           SELECT 1 FROM groups g WHERE g.id = e.group_id AND g.archived = 0
         ))
         AND (
           (e.group_id IS NOT NULL AND EXISTS (
             SELECT 1 FROM group_members gm WHERE gm.group_id = e.group_id AND gm.user_id = ?
           ))
           OR (e.group_id IS NULL AND (
             EXISTS (SELECT 1 FROM expense_payers p WHERE p.expense_id = e.id AND p.user_id = ?)
             OR EXISTS (SELECT 1 FROM expense_shares s WHERE s.expense_id = e.id AND s.user_id = ?)
           ))
         )
       ORDER BY e.expense_date DESC, e.created_at DESC`,
    )
    .all(userId, userId, userId) as ExpenseJoin[];
  return hydrate(rows);
}

function hydrate(rows: ExpenseJoin[]): ExpenseRecord[] {
  if (rows.length === 0) return [];
  const db = getDb();
  const ids = rows.map((r) => r.id);
  const payers = new Map<string, ExpenseRecord["payers"]>();
  const shares = new Map<string, ExpenseRecord["shares"]>();
  const chunk = 400;
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk);
    const marks = slice.map(() => "?").join(",");
    const pRows = db
      .prepare(`SELECT expense_id, user_id, amount_minor FROM expense_payers WHERE expense_id IN (${marks})`)
      .all(...slice) as { expense_id: string; user_id: string; amount_minor: number }[];
    for (const p of pRows) {
      const list = payers.get(p.expense_id) ?? [];
      list.push({ userId: p.user_id, minor: p.amount_minor });
      payers.set(p.expense_id, list);
    }
    const sRows = db
      .prepare(
        `SELECT expense_id, user_id, amount_minor, percent_bps, share_count FROM expense_shares WHERE expense_id IN (${marks})`,
      )
      .all(...slice) as {
      expense_id: string;
      user_id: string;
      amount_minor: number;
      percent_bps: number | null;
      share_count: number | null;
    }[];
    for (const s of sRows) {
      const list = shares.get(s.expense_id) ?? [];
      list.push({
        userId: s.user_id,
        minor: s.amount_minor,
        percentBps: s.percent_bps,
        shareCount: s.share_count,
      });
      shares.set(s.expense_id, list);
    }
  }
  return rows.map((row) => mapExpense(row, payers.get(row.id) ?? [], shares.get(row.id) ?? []));
}

export function getExpense(id: string): ExpenseRecord | null {
  const row = getDb().prepare(`SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL`).get(id) as ExpenseJoin | undefined;
  if (!row) return null;
  return hydrate([row])[0] ?? null;
}

export function canSeeExpense(userId: string, expense: ExpenseRecord): boolean {
  const db = getDb();
  if (expense.groupId) {
    const group = db.prepare(`SELECT archived FROM groups WHERE id = ?`).get(expense.groupId) as { archived: number } | undefined;
    if (!group || group.archived) return false;
    const member = db
      .prepare(`SELECT 1 AS ok FROM group_members WHERE group_id = ? AND user_id = ?`)
      .get(expense.groupId, userId) as { ok: number } | undefined;
    return Boolean(member);
  }
  return (
    expense.payers.some((p) => p.userId === userId) || expense.shares.some((s) => s.userId === userId)
  );
}

export function listPeople(ids: string[]): Person[] {
  if (ids.length === 0) return [];
  const unique = [...new Set(ids)];
  const marks = unique.map(() => "?").join(",");
  const rows = getDb()
    .prepare(`SELECT id, name, email, status, upi_id AS upiId FROM users WHERE id IN (${marks})`)
    .all(...unique) as Person[];
  const order = new Map(unique.map((id, i) => [id, i]));
  return rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export function getPerson(id: string): Person | null {
  return (
    (getDb().prepare(`SELECT id, name, email, status, upi_id AS upiId FROM users WHERE id = ?`).get(id) as Person | undefined) ?? null
  );
}

export function findUserByEmail(email: string): (Person & { currency: string; status: string }) | null {
  return (
    (getDb()
      .prepare(`SELECT id, name, email, currency, status, upi_id AS upiId FROM users WHERE email = ? COLLATE NOCASE`)
      .get(email.trim().toLowerCase()) as (Person & { currency: string; status: string }) | undefined) ?? null
  );
}

export function listFriends(userId: string): Person[] {
  const rows = getDb()
    .prepare(
      `SELECT u.id, u.name, u.email, u.status, u.upi_id AS upiId FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.user_low = ? THEN f.user_high ELSE f.user_low END
       WHERE (f.user_low = ? OR f.user_high = ?) AND u.status != 'deleted'
       ORDER BY u.name COLLATE NOCASE`,
    )
    .all(userId, userId, userId) as Person[];
  return rows;
}

export function areFriends(a: string, b: string): boolean {
  const [low, high] = a < b ? [a, b] : [b, a];
  const row = getDb()
    .prepare(`SELECT 1 AS ok FROM friendships WHERE user_low = ? AND user_high = ?`)
    .get(low, high) as { ok: number } | undefined;
  return Boolean(row);
}

type GroupRow = Omit<GroupRecord, "simplify" | "archived"> & { simplify: number; archived: number };

function mapGroup(g: GroupRow, memberIds: string[]): GroupRecord & { memberIds: string[] } {
  return { ...g, simplify: g.simplify === 1, archived: g.archived === 1, memberIds };
}

export function findGroupByInvite(code: string): (GroupRecord & { memberIds: string[] }) | null {
  const row = getDb().prepare(`SELECT id FROM groups WHERE invite_code = ? AND archived = 0`).get(code) as { id: string } | undefined;
  return row ? getGroup(row.id) : null;
}

export function listGroups(userId: string): (GroupRecord & { memberIds: string[] })[] {
  const db = getDb();
  const groups = db
    .prepare(
      `SELECT g.id, g.name, g.type, g.created_by AS createdBy, g.simplify, g.archived, g.created_at AS createdAt,
              g.currency, g.invite_code AS inviteCode, g.budget_minor AS budgetMinor, g.destination,
              g.start_date AS startDate, g.end_date AS endDate
       FROM groups g
       JOIN group_members me ON me.group_id = g.id AND me.user_id = ?
       WHERE g.archived = 0
       ORDER BY g.name COLLATE NOCASE`,
    )
    .all(userId) as GroupRow[];
  return groups.map((g) => {
    const members = db
      .prepare(`SELECT user_id FROM group_members WHERE group_id = ? ORDER BY created_at`)
      .all(g.id) as { user_id: string }[];
    return mapGroup(g, members.map((m) => m.user_id));
  });
}

export function getGroup(id: string): (GroupRecord & { memberIds: string[] }) | null {
  const db = getDb();
  const g = db
    .prepare(
      `SELECT g.id, g.name, g.type, g.created_by AS createdBy, g.simplify, g.archived, g.created_at AS createdAt,
              g.currency, g.invite_code AS inviteCode, g.budget_minor AS budgetMinor, g.destination,
              g.start_date AS startDate, g.end_date AS endDate
       FROM groups g WHERE g.id = ?`,
    )
    .get(id) as GroupRow | undefined;
  if (!g || g.archived) return null;
  const members = db
    .prepare(`SELECT user_id FROM group_members WHERE group_id = ? ORDER BY created_at`)
    .all(id) as { user_id: string }[];
  return mapGroup(g, members.map((m) => m.user_id));
}

export function isMember(groupId: string, userId: string): boolean {
  const row = getDb()
    .prepare(`SELECT 1 AS ok FROM group_members WHERE group_id = ? AND user_id = ?`)
    .get(groupId, userId) as { ok: number } | undefined;
  return Boolean(row);
}

function peopleMap(ids: string[]): Map<string, Person> {
  return new Map(listPeople(ids).map((p) => [p.id, p]));
}

export function debtsForUser(userId: string, expenses = loadVisibleExpenses(userId), groups = listGroups(userId)): Debt[] {
  const simplify = new Map(groups.map((g) => [g.id, g.simplify]));
  return buildDebts(expenses, (groupId) => simplify.get(groupId) ?? true);
}

export function toActivity(expense: ExpenseRecord, me: string, names: Map<string, Person>, groupName: Map<string, string>): ActivityItem {
  const paid = expense.payers.reduce((s, p) => s + (p.userId === me ? p.minor : 0), 0);
  const share = expense.shares.reduce((s, p) => s + (p.userId === me ? p.minor : 0), 0);
  return {
    id: expense.id,
    date: expense.expenseDate,
    createdAt: expense.createdAt,
    description: expense.description,
    category: expense.category,
    currency: expense.currency,
    minor: expense.amountMinor,
    group: expense.groupId ? { id: expense.groupId, name: groupName.get(expense.groupId) ?? "Group" } : null,
    payers: expense.payers.map((p) => ({
      id: p.userId,
      name: names.get(p.userId)?.name ?? "Someone",
      minor: p.minor,
    })),
    shares: expense.shares.map((s) => ({
      id: s.userId,
      name: names.get(s.userId)?.name ?? "Someone",
      minor: s.minor,
    })),
    isSettlement: expense.category === "settlement",
    myDelta: paid - share,
    splitType: expense.splitType,
  };
}

export function nameMapFor(expenses: ExpenseRecord[]): Map<string, Person> {
  const ids = new Set<string>();
  for (const e of expenses) {
    ids.add(e.createdBy);
    e.payers.forEach((p) => ids.add(p.userId));
    e.shares.forEach((s) => ids.add(s.userId));
  }
  return peopleMap([...ids]);
}

export type DashboardData = {
  totals: { currency: string; owedToYou: number; youOwe: number }[];
  friends: {
    person: Person;
    lines: MoneyLine[];
    isFriend: boolean;
  }[];
  groups: {
    id: string;
    name: string;
    type: string;
    destination: string;
    startDate: string | null;
    endDate: string | null;
    memberCount: number;
    lines: MoneyLine[];
    lastDate: string | null;
  }[];
  activity: ActivityItem[];
  spending: { category: string; minor: number }[];
  spendingCurrency: string;
  otherCurrencySpend: boolean;
  recurring: RecurringDue[];
};

export function loadDashboard(user: SessionUser): DashboardData {
  const expenses = loadVisibleExpenses(user.id);
  const groups = listGroups(user.id);
  const friends = listFriends(user.id);
  const debts = debtsForUser(user.id, expenses, groups);
  const names = nameMapFor(expenses);
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const friendIds = new Set(friends.map((f) => f.id));

  const counterparties = new Set<string>();
  for (const d of debts) {
    if (d.fromId === user.id) counterparties.add(d.toId);
    if (d.toId === user.id) counterparties.add(d.fromId);
  }
  for (const f of friends) counterparties.add(f.id);

  const friendRows = [...counterparties]
    .map((id) => {
      const person = names.get(id) ?? getPerson(id);
      if (!person) return null;
      return { person, lines: pairNet(debts, user.id, id), isFriend: friendIds.has(id) };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => {
      const aAbs = a.lines.reduce((s, l) => s + Math.abs(l.minor), 0);
      const bAbs = b.lines.reduce((s, l) => s + Math.abs(l.minor), 0);
      if (aAbs !== bAbs) return bAbs - aAbs;
      return a.person.name.localeCompare(b.person.name);
    });

  const groupRows = groups
    .map((g) => {
      const related = expenses.filter((e) => e.groupId === g.id);
      const lastDate = related.reduce<string | null>((acc, e) => (!acc || e.expenseDate > acc ? e.expenseDate : acc), null);
      return {
        id: g.id,
        name: g.name,
        type: g.type,
        destination: g.destination,
        startDate: g.startDate,
        endDate: g.endDate,
        memberCount: g.memberIds.length,
        lines: userNet(debts, user.id, `g:${g.id}:`),
        lastDate,
      };
    })
    .sort((a, b) => (b.lastDate ?? "").localeCompare(a.lastDate ?? "") || a.name.localeCompare(b.name));

  const month = monthKey(todayISO());
  const spendingMap = new Map<string, number>();
  let otherCurrencySpend = false;
  for (const e of expenses) {
    if (e.category === "settlement") continue;
    if (monthKey(e.expenseDate) !== month) continue;
    const mine = e.shares.find((s) => s.userId === user.id);
    if (!mine) continue;
    if (e.currency !== user.currency) {
      otherCurrencySpend = true;
      continue;
    }
    spendingMap.set(e.category, (spendingMap.get(e.category) ?? 0) + mine.minor);
  }

  return {
    totals: owedTotals(debts, user.id),
    friends: friendRows,
    groups: groupRows,
    activity: expenses.slice(0, 8).map((e) => toActivity(e, user.id, names, groupName)),
    spending: [...spendingMap.entries()]
      .map(([category, minor]) => ({ category, minor }))
      .sort((a, b) => b.minor - a.minor),
    spendingCurrency: user.currency,
    otherCurrencySpend,
    recurring: recurringDue(user.id, expenses, groupName),
  };
}

export function recurringDue(userId: string, expenses: ExpenseRecord[], groupName: Map<string, string>): RecurringDue[] {
  const today = todayISO();
  const templates = expenses.filter((e) => e.repeatInterval && !e.seriesId);
  const out: RecurringDue[] = [];
  for (const template of templates) {
    const involved =
      template.createdBy === userId ||
      template.payers.some((p) => p.userId === userId) ||
      template.shares.some((s) => s.userId === userId);
    if (!involved && template.groupId && !isMember(template.groupId, userId)) continue;
    const existing = new Set<string>([template.expenseDate]);
    for (const child of expenses) {
      if (child.seriesId === template.id) existing.add(child.expenseDate);
    }
    const until = template.repeatUntil && template.repeatUntil < today ? template.repeatUntil : today;
    const dates = dueOccurrences(template.expenseDate, template.repeatInterval!, until, existing);
    if (dates.length === 0) continue;
    out.push({
      templateId: template.id,
      description: template.description,
      currency: template.currency,
      minor: template.amountMinor,
      group: template.groupId ? { id: template.groupId, name: groupName.get(template.groupId) ?? "Group" } : null,
      nextDate: dates[0],
      waiting: dates.length,
    });
  }
  return out.sort((a, b) => a.nextDate.localeCompare(b.nextDate));
}

export function listNotifications(userId: string, limit = 12): NotificationItem[] {
  const rows = getDb()
    .prepare(
      `SELECT id, type, title, body, href, read_at AS readAt, created_at AS createdAt
       FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(userId, limit) as NotificationItem[];
  return rows;
}

export function unreadCount(userId: string): number {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL`)
    .get(userId) as { n: number };
  return row.n;
}

export function listComments(expenseId: string): { id: string; body: string; createdAt: string; user: Person }[] {
  const rows = getDb()
    .prepare(
      `SELECT c.id, c.body, c.created_at AS createdAt, u.id AS userId, u.name, u.email
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.expense_id = ? ORDER BY c.created_at ASC`,
    )
    .all(expenseId) as { id: string; body: string; createdAt: string; userId: string; name: string; email: string }[];
  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.createdAt,
    user: { id: r.userId, name: r.name, email: r.email },
  }));
}

export function groupBalance(userId: string, groupId: string): MoneyLine[] {
  const expenses = loadVisibleExpenses(userId).filter((e) => e.groupId === groupId);
  const group = getGroup(groupId);
  const debts = buildDebts(expenses, () => group?.simplify ?? true);
  return userNet(debts, userId, `g:${groupId}:`);
}

export function searchEverything(userId: string, q: string) {
  const query = q.trim().toLowerCase();
  const expenses = loadVisibleExpenses(userId);
  const groups = listGroups(userId);
  const friends = listFriends(userId);
  const names = nameMapFor(expenses);
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  if (!query) return { expenses: [] as ActivityItem[], groups, friends };
  const matched = expenses.filter((e) => {
    const blob = [
      e.description,
      e.notes,
      e.groupId ? groupName.get(e.groupId) : "",
      ...e.payers.map((p) => names.get(p.userId)?.name ?? ""),
      ...e.shares.map((s) => names.get(s.userId)?.name ?? ""),
    ]
      .join(" ")
      .toLowerCase();
    return blob.includes(query);
  });
  return {
    expenses: matched.slice(0, 40).map((e) => toActivity(e, userId, names, groupName)),
    groups: groups.filter((g) => g.name.toLowerCase().includes(query)),
    friends: friends.filter((f) => f.name.toLowerCase().includes(query) || f.email.toLowerCase().includes(query)),
  };
}

export function activityList(userId: string, kind: string, month: string) {
  const expenses = loadVisibleExpenses(userId);
  const groups = listGroups(userId);
  const names = nameMapFor(expenses);
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const months = [...new Set(expenses.map((e) => monthKey(e.expenseDate)))].sort().reverse();
  const items = expenses
    .filter((e) => (kind === "settlement" ? e.category === "settlement" : kind === "expense" ? e.category !== "settlement" : true))
    .filter((e) => (month ? monthKey(e.expenseDate) === month : true))
    .map((e) => toActivity(e, userId, names, groupName));
  return { items, months };
}

export function friendDetail(user: SessionUser, friendId: string) {
  const person = getPerson(friendId);
  if (!person || person.id === user.id) return null;
  const shared = loadVisibleExpenses(user.id).filter((e) => {
    const ids = new Set([...e.payers.map((p) => p.userId), ...e.shares.map((s) => s.userId)]);
    return ids.has(user.id) && ids.has(friendId);
  });
  const groups = listGroups(user.id).filter((g) => g.memberIds.includes(friendId));
  const all = loadVisibleExpenses(user.id);
  const debts = debtsForUser(user.id, all, listGroups(user.id));
  const names = nameMapFor(shared);
  const groupName = new Map(listGroups(user.id).map((g) => [g.id, g.name]));
  const byGroup = groups.map((g) => ({
    id: g.id,
    name: g.name,
    lines: pairNet(
      debts.filter((d) => d.scope.startsWith(`g:${g.id}:`)),
      user.id,
      friendId,
    ),
  }));
  const personal = pairNet(
    debts.filter((d) => d.scope.startsWith("p:")),
    user.id,
    friendId,
  );
  return {
    person,
    isFriend: areFriends(user.id, friendId),
    lines: pairNet(debts, user.id, friendId),
    byGroup,
    personal,
    activity: shared.map((e) => toActivity(e, user.id, names, groupName)),
    groups,
  };
}

export function groupDetail(userId: string, groupId: string) {
  const group = getGroup(groupId);
  if (!group || !group.memberIds.includes(userId)) return null;
  const members = listPeople(group.memberIds);
  const expenses = loadVisibleExpenses(userId).filter((e) => e.groupId === groupId);
  const debts = buildDebts(expenses, () => group.simplify);
  const names = nameMapFor(expenses);
  for (const m of members) names.set(m.id, m);
  const groupName = new Map([[group.id, group.name]]);
  const balances = members.map((m) => ({
    person: m,
    lines: userNet(debts, m.id, `g:${groupId}:`),
  }));
  const suggestions = debts.filter((d) => d.scope.startsWith(`g:${groupId}:`));
  const month = monthKey(todayISO());
  const spending = new Map<string, number>();
  const spendCurrency = group.currency || expenses.find((e) => e.category !== "settlement")?.currency || "INR";
  for (const e of expenses) {
    if (e.category === "settlement" || monthKey(e.expenseDate) !== month || e.currency !== spendCurrency) continue;
    spending.set(e.category, (spending.get(e.category) ?? 0) + e.amountMinor);
  }
  return {
    group,
    members,
    balances,
    suggestions,
    activity: expenses.map((e) => toActivity(e, userId, names, groupName)),
    spending: [...spending.entries()].map(([category, minor]) => ({ category, minor })).sort((a, b) => b.minor - a.minor),
    spendCurrency,
    recurring: recurringDue(userId, expenses, groupName),
    myLines: userNet(debts, userId, `g:${groupId}:`),
    stats: groupStats(expenses, members, spendCurrency),
  };
}

/** Whole-trip numbers in the group's main currency: total spent, and each person's paid vs. used. */
export function groupStats(expenses: ExpenseRecord[], members: Person[], currency: string) {
  const paid = new Map<string, number>();
  const used = new Map<string, number>();
  let total = 0;
  let count = 0;
  let otherCurrencies = false;
  for (const e of expenses) {
    if (e.category === "settlement") continue;
    if (e.currency !== currency) {
      otherCurrencies = true;
      continue;
    }
    total += e.amountMinor;
    count++;
    for (const p of e.payers) paid.set(p.userId, (paid.get(p.userId) ?? 0) + p.minor);
    for (const sh of e.shares) used.set(sh.userId, (used.get(sh.userId) ?? 0) + sh.minor);
  }
  return {
    currency,
    total,
    count,
    otherCurrencies,
    people: members
      .map((m) => ({ person: m, paid: paid.get(m.id) ?? 0, used: used.get(m.id) ?? 0 }))
      .sort((a, b) => b.paid - a.paid),
  };
}
