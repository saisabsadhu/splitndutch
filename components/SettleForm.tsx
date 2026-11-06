"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { settlementSave, type FormState } from "@/lib/actions";
import { CURRENCIES } from "@/lib/money";
import { todayISO } from "@/lib/dates";

type Person = { id: string; name: string };

export function Submit({ children, className = "btn", pendingLabel = "Saving…" }: { children: React.ReactNode; className?: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function RecordPaidButton({
  action,
  fields,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  fields: Record<string, string>;
}) {
  const [state, run] = useActionState(action, { error: "" });
  return (
    <form action={run}>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Submit className="btn soft full small" pendingLabel="Recording…">
        I've paid, record it
      </Submit>
      {state.error ? (
        <p className="alert" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function SettleForm({
  me,
  people,
  groupId,
  groups,
  defaultFrom,
  defaultTo,
  defaultAmount,
  currency,
}: {
  me: Person;
  people: Person[];
  groupId?: string | null;
  groups?: { id: string; name: string }[];
  defaultFrom?: string;
  defaultTo?: string;
  defaultAmount?: string;
  currency: string;
}) {
  const [state, action] = useActionState(settlementSave, { error: "" });
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
      <div className="amount-row">
        <label className="field">
          <span>Amount</span>
          <input name="amount" inputMode="decimal" placeholder="0" defaultValue={defaultAmount} required />
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
      <div className="grid-2">
        <label className="field">
          <span>Date</span>
          <input type="date" name="date" defaultValue={todayISO()} required />
        </label>
        <label className="field">
          <span>Paid via</span>
          <input name="note" placeholder="UPI, cash, bank transfer" maxLength={2000} list="pay-methods" />
          <datalist id="pay-methods">
            <option value="UPI" />
            <option value="Cash" />
            <option value="Bank transfer" />
            <option value="Card" />
          </datalist>
        </label>
      </div>
      {state.error ? (
        <p className="alert" role="alert">
          {state.error}
        </p>
      ) : null}
      <Submit>Record payment</Submit>
    </form>
  );
}
