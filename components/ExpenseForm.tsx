"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { expenseSave } from "@/lib/actions";
import { expenseDeltas } from "@/lib/balances";
import { CATEGORIES } from "@/lib/categories";
import { todayISO } from "@/lib/dates";
import { CURRENCIES, allocate, formatMoney, getCurrency, parseMoney } from "@/lib/money";
import { balanceLabel } from "@/lib/phrases";
import type { ExpenseInput } from "@/lib/types";
import { CategoryDot } from "./ui";

type Person = { id: string; name: string };
type GroupOpt = { id: string; name: string; memberIds: string[] };

type Initial = {
  id: string;
  description: string;
  amountMinor: number;
  currency: string;
  category: string;
  date: string;
  notes: string;
  groupId: string | null;
  splitType: ExpenseInput["splitType"];
  payers: { userId: string; minor: number }[];
  shares: { userId: string; minor: number; percentBps: number | null; shareCount: number | null }[];
};

function moneyMap(parts: { userId: string; minor: number }[], currency: string) {
  return Object.fromEntries(parts.map((p) => [p.userId, (p.minor / 10 ** getCurrency(currency).decimals).toFixed(getCurrency(currency).decimals)]));
}

export function ExpenseForm({
  me,
  friends,
  groups,
  people,
  initial,
  presetGroupId,
  presetFriendId,
}: {
  me: Person;
  friends: Person[];
  groups: GroupOpt[];
  people: Person[];
  initial?: Initial;
  presetGroupId?: string;
  presetFriendId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "USD");
  const [amount, setAmount] = useState(initial ? moneyMap([{ userId: "x", minor: initial.amountMinor }], initial.currency).x : "");
  const [category, setCategory] = useState(initial?.category ?? "general");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [groupId, setGroupId] = useState(initial?.groupId ?? presetGroupId ?? "none");
  const [splitType, setSplitType] = useState<ExpenseInput["splitType"]>(initial?.splitType ?? "equal");
  const [repeat, setRepeat] = useState<"none" | "weekly" | "monthly">("none");
  const [multi, setMulti] = useState((initial?.payers.length ?? 0) > 1);
  const [singlePayer, setSinglePayer] = useState(initial?.payers[0]?.userId ?? me.id);
  const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>(initial ? moneyMap(initial.payers, initial.currency) : {});
  const [shareOn, setShareOn] = useState<Record<string, boolean>>(() => {
    if (initial) return Object.fromEntries(initial.shares.map((s) => [s.userId, true]));
    if (presetGroupId) {
      const group = groups.find((g) => g.id === presetGroupId);
      return Object.fromEntries((group?.memberIds ?? [me.id]).map((id) => [id, true]));
    }
    if (presetFriendId) return { [me.id]: true, [presetFriendId]: true };
    return { [me.id]: true };
  });
  const [exact, setExact] = useState<Record<string, string>>(initial ? moneyMap(initial.shares, initial.currency) : {});
  const [percents, setPercents] = useState<Record<string, string>>(
    initial
      ? Object.fromEntries(initial.shares.map((s) => [s.userId, s.percentBps != null ? String(s.percentBps / 100) : ""]))
      : {},
  );
  const [shareCounts, setShareCounts] = useState<Record<string, string>>(
    initial
      ? Object.fromEntries(initial.shares.map((s) => [s.userId, s.shareCount != null ? String(s.shareCount) : "1"]))
      : {},
  );

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const universe = useMemo(() => {
    if (groupId === "none") return [me, ...friends.filter((f) => f.id !== me.id)];
    const group = groups.find((g) => g.id === groupId);
    return (group?.memberIds ?? []).map((id) => byId.get(id)).filter((p): p is Person => Boolean(p));
  }, [groupId, groups, friends, me, byId]);

  const nameOf = (id: string) => (id === me.id ? "You" : byId.get(id)?.name ?? "Someone");
  const total = parseMoney(amount, currency);
  const selectedShares = universe.filter((p) => shareOn[p.id]).map((p) => p.id);

  function onGroup(next: string) {
    setGroupId(next);
    if (initial) return;
    const members = next === "none" ? [me.id] : groups.find((g) => g.id === next)?.memberIds ?? [me.id];
    setShareOn(Object.fromEntries(members.map((id) => [id, true])));
    if (!members.includes(singlePayer)) setSinglePayer(members.includes(me.id) ? me.id : members[0]);
  }

  function shareParts(): { error: string } | { shares: ExpenseInput["shares"] } {
    if (total === null) return { error: "Enter an amount like 24.50." };
    if (selectedShares.length === 0) return { error: "Choose at least one person to split with." };
    if (splitType === "equal") {
      const parts = allocate(total, selectedShares.map(() => 1));
      return { shares: selectedShares.map((userId, i) => ({ userId, minor: parts[i] })) };
    }
    if (splitType === "exact") {
      const shares = [];
      for (const userId of selectedShares) {
        const minor = parseMoney(exact[userId] ?? "", currency);
        if (minor === null || minor <= 0) return { error: `Enter ${nameOf(userId)}'s exact share.` };
        shares.push({ userId, minor });
      }
      if (shares.reduce((s, p) => s + p.minor, 0) !== total) return { error: "Exact shares need to add up to the total." };
      return { shares };
    }
    if (splitType === "percent") {
      const bps: number[] = [];
      for (const userId of selectedShares) {
        const raw = (percents[userId] ?? "").trim();
        if (!/^\d+(\.\d{1,2})?$/.test(raw)) return { error: `Enter ${nameOf(userId)}'s percent.` };
        bps.push(Math.round(Number(raw) * 100));
      }
      if (bps.reduce((s, n) => s + n, 0) !== 10000) return { error: "Percents need to add up to 100." };
      const parts = allocate(total, bps);
      return { shares: selectedShares.map((userId, i) => ({ userId, minor: parts[i], percentBps: bps[i] })) };
    }
    const weights: number[] = [];
    for (const userId of selectedShares) {
      const raw = (shareCounts[userId] ?? "1").trim();
      if (!/^\d+$/.test(raw) || Number(raw) <= 0) return { error: `Enter how many shares ${nameOf(userId)} has.` };
      weights.push(Number(raw));
    }
    const parts = allocate(total, weights);
    return { shares: selectedShares.map((userId, i) => ({ userId, minor: parts[i], shareCount: weights[i] })) };
  }

  function payerParts(bill: number): { error: string } | { payers: ExpenseInput["payers"] } {
    if (!multi) {
      if (!universe.some((p) => p.id === singlePayer)) return { error: "Choose who paid." };
      return { payers: [{ userId: singlePayer, minor: bill }] };
    }
    const chosen = universe.filter((p) => (payerAmounts[p.id] ?? "").trim() !== "");
    if (chosen.length === 0) return { error: "Enter how much each person paid." };
    const payers = [];
    for (const person of chosen) {
      const minor = parseMoney(payerAmounts[person.id] ?? "", currency);
      if (minor === null) return { error: `Check the amount paid by ${nameOf(person.id)}.` };
      if (minor > 0) payers.push({ userId: person.id, minor });
    }
    if (payers.length === 0) return { error: "Someone needs to have paid." };
    if (payers.reduce((s, p) => s + p.minor, 0) !== bill) return { error: "Payments need to add up to the total." };
    return { payers };
  }

  const preview = (() => {
    if (total === null || total <= 0) return { error: "Enter an amount to see who owes what.", lines: [] as string[] };
    const shares = shareParts();
    if ("error" in shares) return { error: shares.error, lines: [] as string[] };
    const payers = payerParts(total);
    if ("error" in payers) return { error: payers.error, lines: [] as string[] };
    const deltas = expenseDeltas(payers.payers, shares.shares);
    const lines = deltas
      .filter((d) => d.userId !== me.id && d.minor !== 0)
      .map((d) => balanceLabel(-d.minor, currency, nameOf(d.userId)));
    const mine = deltas.find((d) => d.userId === me.id)?.minor ?? 0;
    if (mine > 0) lines.unshift(`You get back ${formatMoney(mine, currency)}`);
    if (mine < 0) lines.unshift(`You borrowed ${formatMoney(-mine, currency)}`);
    if (lines.length === 0) lines.push("This stays even. Nobody owes anyone.");
    return { error: "", lines, payers: payers.payers, shares: shares.shares };
  })();

  function submit() {
    setError("");
    if (!description.trim()) {
      setError("Add a short description.");
      return;
    }
    if (total === null || total <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    const shares = shareParts();
    const payers = payerParts(total);
    if ("error" in shares || "error" in payers) {
      setError("error" in shares ? shares.error : "error" in payers ? payers.error : "Check the split.");
      return;
    }
    const payload: ExpenseInput & { id?: string } = {
      id: initial?.id,
      description,
      amountMinor: total,
      currency,
      category: category === "settlement" ? "settlement" : category,
      date,
      notes,
      groupId: groupId === "none" ? null : groupId,
      splitType,
      payers: payers.payers,
      shares: shares.shares,
      repeat: initial ? "none" : repeat,
      repeatUntil: null,
    };
    startTransition(async () => {
      const result = await expenseSave(payload);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(result.href || "/dashboard");
      router.refresh();
    });
  }

  const settlement = category === "settlement";

  return (
    <div className="composer">
      <div className="card pad stack">
        <label className="field">
          <span>Description</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={80} placeholder="Dinner, rent, taxi" autoFocus />
        </label>
        <div className="amount-row">
          <label className="field">
            <span>Amount</span>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </label>
          <label className="field">
            <span>Currency</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <div className="label">Category</div>
          {settlement ? (
            <p>Payment</p>
          ) : (
            <div className="cat-grid" role="listbox" aria-label="Category">
              {CATEGORIES.filter((c) => c.pickable).map((c) => (
                <button key={c.id} type="button" className={category === c.id ? "cat on" : "cat"} onClick={() => setCategory(c.id)}>
                  <CategoryDot id={c.id} /> {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="grid-2">
          <label className="field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span>Group</span>
            <select value={groupId} onChange={(e) => onGroup(e.target.value)} disabled={Boolean(initial)}>
              <option value="none">No group, just friends</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="spread">
          <strong>Paid by</strong>
          <label className="tiny">
            <input className="check" type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} /> Multiple people
          </label>
        </div>
        {multi ? (
          <div className="people">
            {universe.map((person) => (
              <label key={person.id} className="person-line">
                <span>{nameOf(person.id)}</span>
                <input
                  inputMode="decimal"
                  placeholder="0.00"
                  value={payerAmounts[person.id] ?? ""}
                  onChange={(e) => setPayerAmounts({ ...payerAmounts, [person.id]: e.target.value })}
                />
              </label>
            ))}
          </div>
        ) : (
          <select aria-label="Paid by" value={singlePayer} onChange={(e) => setSinglePayer(e.target.value)}>
            {universe.map((person) => (
              <option key={person.id} value={person.id}>
                {nameOf(person.id)}
              </option>
            ))}
          </select>
        )}
        <div>
          <div className="label">Split</div>
          <div className="split-switch">
            {(
              [
                ["equal", "Equally"],
                ["exact", "Exact amounts"],
                ["percent", "Percent"],
                ["shares", "Shares"],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" className={splitType === id ? "chip on" : "chip"} onClick={() => setSplitType(id)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="people">
          {universe.map((person) => (
            <div key={person.id} className="person-line">
              <input
                className="check"
                type="checkbox"
                checked={Boolean(shareOn[person.id])}
                onChange={(e) => setShareOn({ ...shareOn, [person.id]: e.target.checked })}
                aria-label={`Split with ${nameOf(person.id)}`}
              />
              <span>{nameOf(person.id)}</span>
              {splitType === "exact" ? (
                <input
                  inputMode="decimal"
                  placeholder="0.00"
                  disabled={!shareOn[person.id]}
                  value={exact[person.id] ?? ""}
                  onChange={(e) => setExact({ ...exact, [person.id]: e.target.value })}
                  aria-label={`${nameOf(person.id)} exact share`}
                />
              ) : null}
              {splitType === "percent" ? (
                <input
                  inputMode="decimal"
                  placeholder="0"
                  disabled={!shareOn[person.id]}
                  value={percents[person.id] ?? ""}
                  onChange={(e) => setPercents({ ...percents, [person.id]: e.target.value })}
                  aria-label={`${nameOf(person.id)} percent`}
                />
              ) : null}
              {splitType === "shares" ? (
                <input
                  inputMode="numeric"
                  placeholder="1"
                  disabled={!shareOn[person.id]}
                  value={shareCounts[person.id] ?? "1"}
                  onChange={(e) => setShareCounts({ ...shareCounts, [person.id]: e.target.value })}
                  aria-label={`${nameOf(person.id)} shares`}
                />
              ) : null}
              {splitType === "equal" ? <span /> : null}
            </div>
          ))}
        </div>
        <label className="field">
          <span>Notes</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="Optional" />
        </label>
        {initial ? null : (
          <label className="field">
            <span>Repeat</span>
            <select value={repeat} onChange={(e) => setRepeat(e.target.value as "none" | "weekly" | "monthly")}>
              <option value="none">Does not repeat</option>
              <option value="weekly">Every week</option>
              <option value="monthly">Every month</option>
            </select>
          </label>
        )}
        {error ? (
          <p className="alert" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn" type="button" disabled={pending} onClick={submit}>
          {pending ? "Saving…" : initial ? "Save changes" : "Save expense"}
        </button>
      </div>
      <aside className="card pad stack">
        <p className="kicker">This expense</p>
        <h2>{total && total > 0 ? formatMoney(total, currency) : "—"}</h2>
        {preview.error ? <p className="muted">{preview.error}</p> : null}
        {preview.lines.map((line) => (
          <p key={line} className="preview-line">
            {line}
          </p>
        ))}
        <p className="tiny muted">A payment record is a settle-up, not a new bill. Use Settle up when someone pays a friend back.</p>
      </aside>
    </div>
  );
}
