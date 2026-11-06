import { allocate } from "./money";

export type SharePart = { userId: string; minor: number };
export type PayerPart = { userId: string; minor: number };

export type ExpenseSlice = {
  id: string;
  groupId: string | null;
  currency: string;
  payers: PayerPart[];
  shares: SharePart[];
};

export type Debt = {
  fromId: string;
  toId: string;
  currency: string;
  minor: number;
  scope: string;
};

export function expenseDeltas(payers: PayerPart[], shares: SharePart[]): { userId: string; minor: number }[] {
  const map = new Map<string, number>();
  for (const p of payers) map.set(p.userId, (map.get(p.userId) ?? 0) + p.minor);
  for (const s of shares) map.set(s.userId, (map.get(s.userId) ?? 0) - s.minor);
  return [...map.entries()]
    .map(([userId, minor]) => ({ userId, minor }))
    .filter((d) => d.minor !== 0);
}

/** Each debtor pays creditors in proportion to what those creditors fronted. */
export function proportionalDebts(
  deltas: { userId: string; minor: number }[],
  currency: string,
  scope: string,
): Debt[] {
  const creditors = deltas.filter((d) => d.minor > 0);
  const debtors = deltas.filter((d) => d.minor < 0);
  if (creditors.length === 0 || debtors.length === 0) return [];
  const debts: Debt[] = [];
  for (const debtor of debtors) {
    const parts = allocate(
      -debtor.minor,
      creditors.map((c) => c.minor),
    );
    creditors.forEach((c, i) => {
      if (parts[i] > 0) {
        debts.push({ fromId: debtor.userId, toId: c.userId, minor: parts[i], currency, scope });
      }
    });
  }
  return debts;
}

export function netDebts(debts: Debt[]): Debt[] {
  const map = new Map<string, Debt>();
  for (const d of debts) {
    if (d.minor <= 0 || d.fromId === d.toId) continue;
    const forward = `${d.scope}|${d.fromId}|${d.toId}`;
    const backward = `${d.scope}|${d.toId}|${d.fromId}`;
    const back = map.get(backward);
    if (back) {
      if (back.minor > d.minor) back.minor -= d.minor;
      else if (back.minor < d.minor) {
        map.delete(backward);
        map.set(forward, { ...d, minor: d.minor - back.minor });
      } else map.delete(backward);
      continue;
    }
    const existing = map.get(forward);
    if (existing) existing.minor += d.minor;
    else map.set(forward, { ...d });
  }
  return [...map.values()].filter((d) => d.minor > 0);
}

export function simplifyNets(
  nets: Map<string, number>,
  currency: string,
  scope: string,
): Debt[] {
  const debtors = [...nets.entries()]
    .filter(([, minor]) => minor < 0)
    .map(([id, minor]) => ({ id, minor: -minor }))
    .sort((a, b) => b.minor - a.minor || a.id.localeCompare(b.id));
  const creditors = [...nets.entries()]
    .filter(([, minor]) => minor > 0)
    .map(([id, minor]) => ({ id, minor }))
    .sort((a, b) => b.minor - a.minor || a.id.localeCompare(b.id));
  const out: Debt[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].minor, creditors[j].minor);
    if (pay > 0) {
      out.push({ fromId: debtors[i].id, toId: creditors[j].id, minor: pay, currency, scope });
    }
    debtors[i].minor -= pay;
    creditors[j].minor -= pay;
    if (debtors[i].minor === 0) i++;
    if (creditors[j].minor === 0) j++;
  }
  return out;
}

export function scopeOf(expense: ExpenseSlice): string {
  return expense.groupId ? `g:${expense.groupId}:${expense.currency}` : `p:${expense.currency}`;
}

/**
 * Build who-should-pay-whom.
 * `simplifyGroup` is consulted per group. Personal expenses are always simplified
 * inside the personal bucket for that currency.
 */
export function buildDebts(
  expenses: ExpenseSlice[],
  simplifyGroup: (groupId: string) => boolean,
): Debt[] {
  const buckets = new Map<string, ExpenseSlice[]>();
  for (const expense of expenses) {
    const key = scopeOf(expense);
    const list = buckets.get(key);
    if (list) list.push(expense);
    else buckets.set(key, [expense]);
  }

  const debts: Debt[] = [];
  for (const [scope, list] of buckets) {
    const groupId = list[0].groupId;
    const currency = list[0].currency;
    const simplify = groupId ? simplifyGroup(groupId) : true;
    if (simplify) {
      const nets = new Map<string, number>();
      for (const expense of list) {
        for (const delta of expenseDeltas(expense.payers, expense.shares)) {
          nets.set(delta.userId, (nets.get(delta.userId) ?? 0) + delta.minor);
        }
      }
      debts.push(...simplifyNets(nets, currency, scope));
    } else {
      const raw: Debt[] = [];
      for (const expense of list) {
        raw.push(...proportionalDebts(expenseDeltas(expense.payers, expense.shares), currency, scope));
      }
      debts.push(...netDebts(raw));
    }
  }
  return debts;
}

export function currenciesOf(debts: Debt[]): string[] {
  return [...new Set(debts.map((d) => d.currency))].sort();
}

/** Positive means `them` owes `me`. */
export function pairNet(debts: Debt[], me: string, them: string, currency?: string): { currency: string; minor: number }[] {
  const map = new Map<string, number>();
  for (const d of debts) {
    if (currency && d.currency !== currency) continue;
    if (d.toId === me && d.fromId === them) map.set(d.currency, (map.get(d.currency) ?? 0) + d.minor);
    if (d.fromId === me && d.toId === them) map.set(d.currency, (map.get(d.currency) ?? 0) - d.minor);
  }
  return [...map.entries()]
    .map(([cur, minor]) => ({ currency: cur, minor }))
    .filter((l) => l.minor !== 0)
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

export function userNet(debts: Debt[], userId: string, scopePrefix?: string): { currency: string; minor: number }[] {
  const map = new Map<string, number>();
  for (const d of debts) {
    if (scopePrefix && !d.scope.startsWith(scopePrefix)) continue;
    if (d.toId === userId) map.set(d.currency, (map.get(d.currency) ?? 0) + d.minor);
    if (d.fromId === userId) map.set(d.currency, (map.get(d.currency) ?? 0) - d.minor);
  }
  return [...map.entries()]
    .map(([currency, minor]) => ({ currency, minor }))
    .filter((l) => l.minor !== 0)
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

export function owedTotals(debts: Debt[], userId: string): { currency: string; owedToYou: number; youOwe: number }[] {
  const map = new Map<string, { owedToYou: number; youOwe: number }>();
  for (const d of debts) {
    const row = map.get(d.currency) ?? { owedToYou: 0, youOwe: 0 };
    if (d.toId === userId) row.owedToYou += d.minor;
    if (d.fromId === userId) row.youOwe += d.minor;
    map.set(d.currency, row);
  }
  return [...map.entries()]
    .map(([currency, row]) => ({ currency, ...row }))
    .filter((r) => r.owedToYou !== 0 || r.youOwe !== 0)
    .sort((a, b) => a.currency.localeCompare(b.currency));
}
