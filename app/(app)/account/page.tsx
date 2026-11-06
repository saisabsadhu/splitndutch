import { DeleteAccountForm, PasswordForm, ProfileForm } from "@/components/Forms";
import { Avatar, Flash } from "@/components/ui";
import { logout, logoutEverywhere, resendVerification } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";

export const metadata = { title: "Account" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  return (
    <>
      <Flash notice={sp.notice} error={sp.error} />
      <div className="page-head">
        <div className="row">
          <Avatar name={user.name} size={56} />
          <div>
            <p className="kicker">Member since {formatDate(user.createdAt.slice(0, 10))}</p>
            <h1>{user.name}</h1>
          </div>
        </div>
        <form action={logout}>
          <button className="btn ghost" type="submit">
            Log out
          </button>
        </form>
      </div>
      <div className="settings">
        <section className="card pad" id="profile">
          <h2>Profile & payments</h2>
          <div style={{ height: 10 }} />
          <ProfileForm name={user.name} email={user.email} currency={user.currency} upiId={user.upiId} emailPrefs={user.emailPrefs} />
        </section>
        <div className="stack">
          <section className="card pad" id="verify">
            <h2>Email</h2>
            {user.verified ? (
              <p className="pos" style={{ marginTop: 8 }}>
                ✓ {user.email} is confirmed.
              </p>
            ) : (
              <form action={resendVerification} className="stack" style={{ marginTop: 8 }}>
                <p className="muted">{user.email} isn't confirmed yet. Confirming lets you reset your password and keeps invites safe.</p>
                <button className="btn soft" type="submit">
                  Send confirmation link
                </button>
              </form>
            )}
          </section>
          <section className="card pad">
            <h2>Password</h2>
            <div style={{ height: 10 }} />
            <PasswordForm />
            {user.email.endsWith("@splitndutch.app") ? (
              <p className="tiny muted" style={{ marginTop: 12 }}>
                This is a shared demo account. Anything you add here is visible to other visitors.
              </p>
            ) : null}
          </section>
          <section className="card pad">
            <h2>Your data</h2>
            <p className="muted tiny" style={{ margin: "6px 0 10px" }}>
              Download everything you've added or are part of, as JSON. Groups can also be exported as CSV from each group page.
            </p>
            <div className="row wrap">
              <a className="btn ghost small" href="/api/account/export">
                Download my data
              </a>
              <form action={logoutEverywhere}>
                <button className="btn ghost small" type="submit">
                  Log out on all devices
                </button>
              </form>
            </div>
          </section>
          <section className="card pad danger-zone">
            <details>
              <summary>
                <h2 style={{ display: "inline" }}>Delete account</h2>
              </summary>
              <p className="muted tiny" style={{ margin: "8px 0" }}>
                Settle every balance first. We erase your name, email, UPI ID, password and notifications. Shared expenses stay in your
                friends' history as “Deleted user” so their balances still add up.
              </p>
              <DeleteAccountForm />
            </details>
          </section>
        </div>
      </div>
    </>
  );
}
