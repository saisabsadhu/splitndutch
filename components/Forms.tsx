"use client";

import { useActionState, useState } from "react";
import {
  accountDelete,
  commentAdd,
  forgotPassword,
  friendAdd,
  groupAddMember,
  groupCreate,
  groupSave,
  guestInvite,
  login,
  savePassword,
  saveProfile,
  setPassword,
  signup,
  type FormState,
} from "@/lib/actions";
import { CURRENCIES, moneyToInput } from "@/lib/money";
import { GROUP_TYPES } from "@/lib/categories";
import { DESTINATIONS, VIBES, getDestination } from "@/lib/destinations";
import { PasswordField } from "./Fields";
import { Submit } from "./SettleForm";

const initial: FormState = { error: "" };

function Feedback({ state }: { state: FormState }) {
  if (state.notice) {
    return (
      <p className="banner good" role="status">
        {state.notice}
      </p>
    );
  }
  if (!state.error) return null;
  return (
    <p className="alert" role="alert">
      {state.error}
    </p>
  );
}

// ———————————————— auth ————————————————

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, initial);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="next" value={next ?? ""} />
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required autoFocus />
      </label>
      <PasswordField name="password" label="Password" autoComplete="current-password" minLength={1} />
      <div className="spread tiny">
        <span />
        <a href="/forgot">Forgot password?</a>
      </div>
      <Feedback state={state} />
      <Submit className="btn full" pendingLabel="Logging in…">
        Log in
      </Submit>
    </form>
  );
}

export function SignupForm({ next, email }: { next?: string; email?: string }) {
  const [state, action] = useActionState(signup, initial);
  if (state.notice) return <Feedback state={state} />;
  return (
    <form action={action} className="stack">
      <input type="hidden" name="next" value={next ?? ""} />
      <label className="field">
        <span>Your name</span>
        <input name="name" autoComplete="name" required maxLength={60} placeholder="Ananya Iyer" />
      </label>
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required defaultValue={email} />
      </label>
      <PasswordField name="password" label="Password (8+ characters)" autoComplete="new-password" />
      <label className="field">
        <span>Home currency</span>
        <select name="currency" defaultValue="INR">
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} · {c.name}
            </option>
          ))}
        </select>
      </label>
      <Feedback state={state} />
      <Submit className="btn full" pendingLabel="Creating…">
        Create free account
      </Submit>
      <p className="tiny muted">
        By signing up you agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
      </p>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(forgotPassword, initial);
  return (
    <form action={action} className="stack">
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required autoFocus />
      </label>
      <Feedback state={state} />
      <Submit className="btn full" pendingLabel="Sending…">
        Email me a link
      </Submit>
    </form>
  );
}

export function SetPasswordForm({ token, name, askName, next, cta }: { token: string; name?: string; askName?: boolean; next?: string; cta: string }) {
  const [state, action] = useActionState(setPassword, initial);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="next" value={next ?? ""} />
      {askName ? (
        <label className="field">
          <span>Your name</span>
          <input name="name" defaultValue={name} required maxLength={60} autoComplete="name" />
        </label>
      ) : null}
      <PasswordField name="password" label="New password (8+ characters)" autoComplete="new-password" />
      <Feedback state={state} />
      <Submit className="btn full">{cta}</Submit>
    </form>
  );
}

// ———————————————— people ————————————————

export function FriendAddForm() {
  const [state, action] = useActionState(friendAdd, initial);
  return (
    <form action={action} className="stack">
      <label className="field">
        <span>Name</span>
        <input name="name" placeholder="Riya" maxLength={60} />
      </label>
      <label className="field">
        <span>Email (we'll send them an invite)</span>
        <input name="email" type="email" placeholder="riya@gmail.com" />
      </label>
      <p className="tiny muted">No email? Just a name works. Add their email later and their balance follows.</p>
      <Feedback state={state} />
      <Submit>Add friend</Submit>
    </form>
  );
}

export function MemberAddForm({ groupId }: { groupId: string }) {
  const [state, action] = useActionState(groupAddMember, initial);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="groupId" value={groupId} />
      <div className="grid-2">
        <label className="field">
          <span>Name</span>
          <input name="name" placeholder="Riya" maxLength={60} />
        </label>
        <label className="field">
          <span>Email (optional)</span>
          <input name="email" type="email" placeholder="riya@gmail.com" />
        </label>
      </div>
      <Feedback state={state} />
      <Submit className="btn small">Add to group</Submit>
    </form>
  );
}

export function GuestInviteForm({ personId, back }: { personId: string; back: string }) {
  const [state, action] = useActionState(guestInvite, initial);
  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="personId" value={personId} />
      <input type="hidden" name="back" value={back} />
      <input name="email" type="email" placeholder="their@email.com" required aria-label="Their email" />
      <Submit className="btn small soft">Invite</Submit>
      {state.error ? (
        <p className="alert" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

// ———————————————— groups ————————————————

type GroupDefaults = {
  groupId?: string;
  name?: string;
  type?: string;
  currency?: string;
  destination?: string;
  startDate?: string | null;
  endDate?: string | null;
  budgetMinor?: number | null;
  simplify?: boolean;
};

function GroupFields({ defaults, withMembers }: { defaults: GroupDefaults; withMembers?: boolean }) {
  const [type, setType] = useState(defaults.type ?? (defaults.destination ? "trip" : "trip"));
  const [destination, setDestination] = useState(defaults.destination ?? "");
  const [currency, setCurrency] = useState(defaults.currency ?? "INR");
  const [name, setName] = useState(defaults.name ?? "");
  const dest = getDestination(destination);
  const india = DESTINATIONS.filter((d) => d.country === "India");
  const abroad = DESTINATIONS.filter((d) => d.country === "Abroad");

  function pickDestination(id: string) {
    setDestination(id);
    const d = getDestination(id);
    if (d) {
      setCurrency(d.currency);
      if (!name.trim()) setName(`${d.name} trip`);
    }
  }

  return (
    <>
      {defaults.groupId ? <input type="hidden" name="groupId" value={defaults.groupId} /> : null}
      <div className="type-picker" role="radiogroup" aria-label="Group type">
        {GROUP_TYPES.map((t) => (
          <label key={t.id} className={type === t.id ? "type-opt on" : "type-opt"}>
            <input type="radio" name="type" value={t.id} checked={type === t.id} onChange={() => setType(t.id)} />
            <span aria-hidden="true">{t.icon}</span>
            {t.label}
          </label>
        ))}
      </div>
      {type === "trip" ? (
        <div className="trip-fields">
          <label className="field">
            <span>Where to?</span>
            <select name="destination" value={destination} onChange={(e) => pickDestination(e.target.value)}>
              <option value="">Somewhere else / not decided</option>
              <optgroup label="India">
                {india.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.emoji} {d.name} · {VIBES[d.vibe]}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Abroad">
                {abroad.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.emoji} {d.name} · {d.currency}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          {dest ? (
            <div className="dest-preview" style={{ background: `linear-gradient(135deg, ${dest.colors[0]}, ${dest.colors[1]})` }}>
              <span className="dest-emoji">{dest.emoji}</span>
              <div>
                <strong>{dest.name}</strong>
                <p>{dest.tagline}</p>
                <p className="tiny">Best: {dest.bestMonths}</p>
              </div>
            </div>
          ) : null}
          <div className="grid-2">
            <label className="field">
              <span>From</span>
              <input type="date" name="startDate" defaultValue={defaults.startDate ?? ""} />
            </label>
            <label className="field">
              <span>To</span>
              <input type="date" name="endDate" defaultValue={defaults.endDate ?? ""} />
            </label>
          </div>
        </div>
      ) : (
        <input type="hidden" name="destination" value="" />
      )}
      <label className="field">
        <span>Group name</span>
        <input name="name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Goa 2026, Flat 302, Hostel B-Wing" />
      </label>
      <div className="grid-2">
        <label className="field">
          <span>Main currency</span>
          <select name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{type === "trip" ? "Trip budget (optional)" : "Monthly budget (optional)"}</span>
          <input
            name="budget"
            inputMode="decimal"
            placeholder="e.g. 60000"
            defaultValue={defaults.budgetMinor != null ? moneyToInput(defaults.budgetMinor, currency).replace(/\.00$/, "") : ""}
          />
        </label>
      </div>
      {withMembers ? (
        <label className="field">
          <span>Who's in? One per line: an email (we'll invite them) or just a name</span>
          <textarea name="members" placeholder={"rohan@gmail.com\nPriya <priya@outlook.com>\nBunty"} />
        </label>
      ) : null}
      {defaults.groupId ? (
        <label className="row tiny">
          <input className="check" type="checkbox" name="simplify" defaultChecked={defaults.simplify} />
          Simplify debts (fewest payments to settle everyone)
        </label>
      ) : null}
    </>
  );
}

export function GroupCreateForm({ destination }: { destination?: string }) {
  const [state, action] = useActionState(groupCreate, initial);
  const dest = getDestination(destination);
  return (
    <form action={action} className="stack" id="new">
      <GroupFields
        withMembers
        defaults={{ type: dest || !destination ? "trip" : "other", destination: dest?.id, currency: dest?.currency, name: dest ? `${dest.name} trip` : "" }}
      />
      <Feedback state={state} />
      <Submit pendingLabel="Creating…">Create group</Submit>
    </form>
  );
}

export function GroupSettingsForm({ defaults }: { defaults: GroupDefaults }) {
  const [state, action] = useActionState(groupSave, initial);
  return (
    <form action={action} className="stack">
      <GroupFields defaults={defaults} />
      <Feedback state={state} />
      <Submit>Save group</Submit>
    </form>
  );
}

// ———————————————— account ————————————————

export function ProfileForm({ name, email, currency, upiId, emailPrefs }: { name: string; email: string; currency: string; upiId: string; emailPrefs: number }) {
  const [state, action] = useActionState(saveProfile, initial);
  const [nextEmail, setNextEmail] = useState(email);
  return (
    <form action={action} className="stack">
      <label className="field">
        <span>Name</span>
        <input name="name" defaultValue={name} required maxLength={60} autoComplete="name" />
      </label>
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" value={nextEmail} onChange={(e) => setNextEmail(e.target.value)} required autoComplete="email" />
      </label>
      {nextEmail.trim().toLowerCase() !== email.toLowerCase() ? (
        <PasswordField name="password" label="Current password (needed to change email)" autoComplete="current-password" minLength={1} />
      ) : null}
      <label className="field">
        <span>UPI ID: friends pay you in one tap</span>
        <input name="upiId" defaultValue={upiId} placeholder="yourname@okhdfcbank" autoComplete="off" spellCheck={false} />
      </label>
      <div className="grid-2">
        <label className="field">
          <span>Home currency</span>
          <select name="currency" defaultValue={currency}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Email me about</span>
          <select name="emailPrefs" defaultValue={String(emailPrefs)}>
            <option value="1">Important only (invites, reminders, payments)</option>
            <option value="2">Every new expense and comment</option>
            <option value="0">Nothing</option>
          </select>
        </label>
      </div>
      <Feedback state={state} />
      <Submit>Save profile</Submit>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(savePassword, initial);
  return (
    <form action={action} className="stack">
      <PasswordField name="current" label="Current password" autoComplete="current-password" minLength={1} />
      <PasswordField name="next" label="New password" autoComplete="new-password" />
      <Feedback state={state} />
      <Submit>Update password</Submit>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(accountDelete, initial);
  return (
    <form action={action} className="stack">
      <PasswordField name="password" label="Password" autoComplete="current-password" minLength={1} />
      <label className="field">
        <span>Type DELETE to confirm</span>
        <input name="confirm" autoComplete="off" required />
      </label>
      <Feedback state={state} />
      <Submit className="btn danger">Delete my account</Submit>
    </form>
  );
}

export function CommentForm({ expenseId }: { expenseId: string }) {
  const [state, action] = useActionState(commentAdd, initial);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="expenseId" value={expenseId} />
      <label className="field">
        <span>Comment</span>
        <textarea name="body" required maxLength={1000} placeholder="Bill photo is in the group chat, paid by GPay…" />
      </label>
      <Feedback state={state} />
      <Submit className="btn small">Post comment</Submit>
    </form>
  );
}
