"use client";

import { useFormState } from "react-dom";
import { settlementSave } from "@/lib/actions";
import { CURRENCIES } from "@/lib/money";
import { todayISO } from "@/lib/dates";

type Person = { id: string; name: string };

export function SettleForm({
  me,
  people,
  groupId,
  groups,
  defaultFrom,
  defaultTo,
  currency,
}: {
  me: Person;
  people: Person[];
  groupId?: string | null;
  groups?: { id: string; name: string }[];
  defaultFrom?: string;
  defaultTo?: string;
  currency: string;
}) {
  const [state, action] = useFormState(settlementSave, { error: "" });
  const options = people.some((p) => p.id === me.id) ? people : [me, ...people];
  return (
    <form action={action} className="stack">
      {groups ? (
        <label className="field">
          <span>Apply this payment to</span>
          <select name="groupId" defaultValue={groupId ?? "none"}>
            <option value="none">Outside a group</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="groupId" value={groupId ?? "none"} />
      )}
      <div className="grid-2">
        <label className="field">
          <span>Who paid</span>
          <select name="fromId" defaultValue={defaultFrom ?? me.id}>
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id === me.id ? "You" : p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Who received it</span>
          <select name="toId" defaultValue={defaultTo ?? options.find((p) => p.id !== (defaultFrom ?? me.id))?.id ?? me.id}>
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id === me.id ? "You" : p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid-2">
        <label className="field">
          <span>Amount</span>
          <input name="amount" inputMode="decimal" placeholder="0.00" required />
        </label>
        <label className="field">
          <span>Currency</span>
          <select name="currency" defaultValue={currency}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>Date</span>
        <input type="date" name="date" defaultValue={todayISO()} required />
      </label>
      <label className="field">
        <span>Note</span>
        <input name="note" placeholder="Venmo, cash, bank transfer" maxLength={2000} />
      </label>
      {state.error ? (
        <p className="alert" role="alert">
          {state.error}
        </p>
      ) : null}
      <button className="btn" type="submit">
        Record payment
      </button>
    </form>
  );
}
