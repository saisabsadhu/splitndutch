import { PasswordForm, ProfileForm } from "@/components/Forms";
import { Flash } from "@/components/ui";
import { logout } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";

export const metadata = { title: "Account" };

export default function AccountPage({ searchParams }: { searchParams: { notice?: string; error?: string } }) {
  const user = requireUser();
  return (
    <>
      <Flash notice={searchParams.notice} error={searchParams.error} />
      <div className="page-head">
        <div>
          <p className="kicker">Signed in as {user.email}</p>
          <h1>Account</h1>
        </div>
        <form action={logout}>
          <button className="btn ghost" type="submit">
            Log out
          </button>
        </form>
      </div>
      <div className="settings">
        <section className="card pad">
          <h2>Profile</h2>
          <p className="tiny muted">Member since {formatDate(user.createdAt.slice(0, 10))}.</p>
          <div style={{ height: 10 }} />
          <ProfileForm name={user.name} email={user.email} currency={user.currency} />
        </section>
        <section className="card pad">
          <h2>Password</h2>
          <div style={{ height: 10 }} />
          <PasswordForm />
          {user.email.endsWith("@splitndutch.app") ? (
            <p className="tiny muted" style={{ marginTop: 12 }}>
              This is a demo account. The password is demo1234. You can change it, or create your own account and leave the sample household alone.
            </p>
          ) : null}
        </section>
      </div>
    </>
  );
}
