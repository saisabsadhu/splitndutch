"use client";

import { useFormState } from "react-dom";
import { commentAdd, friendAdd, groupAddMember, groupCreate, savePassword, saveProfile, signup, login } from "@/lib/actions";
import { CURRENCIES } from "@/lib/money";
import { GROUP_TYPES } from "@/lib/categories";
import { PasswordField } from "./Fields";

function ErrorLine({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="alert" role="alert">
      {error}
    </p>
  );
}

export function LoginForm() {
  const [state, action] = useFormState(login, { error: "" });
  return (
    <form action={action} className="stack">
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <PasswordField name="password" label="Password" autoComplete="current-password" minLength={1} />
      <ErrorLine error={state.error} />
      <button className="btn full" type="submit">
        Log in
      </button>
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useFormState(signup, { error: "" });
  return (
    <form action={action} className="stack">
      <label className="field">
        <span>Name</span>
        <input name="name" autoComplete="name" required maxLength={60} />
      </label>
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <PasswordField name="password" label="Password" autoComplete="new-password" />
      <label className="field">
        <span>Default currency</span>
        <select name="currency" defaultValue="USD">
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
      </label>
      <ErrorLine error={state.error} />
      <button className="btn full" type="submit">
        Create account
      </button>
    </form>
  );
}

export function FriendAddForm() {
  const [state, action] = useFormState(friendAdd, { error: "" });
  return (
    <form action={action} className="stack">
      <label className="field">
        <span>Their email</span>
        <input name="email" type="email" placeholder="friend@email.com" required />
      </label>
      <ErrorLine error={state.error} />
      <button className="btn" type="submit">
        Add friend
      </button>
    </form>
  );
}

export function GroupCreateForm() {
  const [state, action] = useFormState(groupCreate, { error: "" });
  return (
    <form action={action} className="stack" id="new">
      <label className="field">
        <span>Group name</span>
        <input name="name" required maxLength={60} placeholder="Apartment, Lisbon, Friday dinners" />
      </label>
      <label className="field">
        <span>Type</span>
        <select name="type" defaultValue="other">
          {GROUP_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Members, by the email they signed up with</span>
        <textarea name="emails" placeholder="one email per line" />
      </label>
      <ErrorLine error={state.error} />
      <button className="btn" type="submit">
        Create group
      </button>
    </form>
  );
}

export function MemberAddForm({ groupId }: { groupId: string }) {
  const [state, action] = useFormState(groupAddMember, { error: "" });
  return (
    <form action={action} className="stack">
      <input type="hidden" name="groupId" value={groupId} />
      <label className="field">
        <span>Add by email</span>
        <input name="email" type="email" required placeholder="friend@email.com" />
      </label>
      <ErrorLine error={state.error} />
      <button className="btn" type="submit">
        Add member
      </button>
    </form>
  );
}

export function ProfileForm({ name, email, currency }: { name: string; email: string; currency: string }) {
  const [state, action] = useFormState(saveProfile, { error: "" });
  return (
    <form action={action} className="stack">
      <label className="field">
        <span>Name</span>
        <input name="name" defaultValue={name} required maxLength={60} />
      </label>
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" defaultValue={email} required />
      </label>
      <label className="field">
        <span>Default currency</span>
        <select name="currency" defaultValue={currency}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} · {c.name}
            </option>
          ))}
        </select>
      </label>
      <p className="tiny muted">Balances stay in the currency of each expense. This currency is used for your spending chart and new expenses.</p>
      <ErrorLine error={state.error} />
      <button className="btn" type="submit">
        Save profile
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useFormState(savePassword, { error: "" });
  return (
    <form action={action} className="stack">
      <PasswordField name="current" label="Current password" autoComplete="current-password" minLength={1} />
      <PasswordField name="next" label="New password" autoComplete="new-password" />
      <ErrorLine error={state.error} />
      <button className="btn" type="submit">
        Update password
      </button>
    </form>
  );
}

export function CommentForm({ expenseId }: { expenseId: string }) {
  const [state, action] = useFormState(commentAdd, { error: "" });
  return (
    <form action={action} className="stack">
      <input type="hidden" name="expenseId" value={expenseId} />
      <label className="field">
        <span>Comment</span>
        <textarea name="body" required maxLength={1000} placeholder="Add a note for everyone on this expense" />
      </label>
      <ErrorLine error={state.error} />
      <button className="btn small" type="submit">
        Post comment
      </button>
    </form>
  );
}
