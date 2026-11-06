import Link from "next/link";
import { SetPasswordForm } from "@/components/Forms";
import { AuthCard } from "@/components/PublicShell";
import { getDb } from "@/lib/db";
import { getPerson } from "@/lib/queries";
import { peekToken } from "@/lib/tokens";

export const metadata = { title: "You're invited" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = peekToken(token, ["invite"]);
  const person = row ? getPerson(row.userId) : null;
  if (!row || !person || person.status === "deleted") {
    return (
      <AuthCard title="This invite has expired" lede="Invite links work for 30 days and only once. If you already set a password, just log in.">
        <div className="stack">
          <Link className="btn full" href="/login">
            Log in
          </Link>
          <Link className="btn ghost full" href="/forgot">
            Email me a fresh link
          </Link>
        </div>
      </AuthCard>
    );
  }
  const inviter = getDb()
    .prepare(`SELECT i.name FROM users u JOIN users i ON i.id = u.invited_by WHERE u.id = ?`)
    .get(person.id) as { name: string } | undefined;
  const groups = getDb()
    .prepare(`SELECT g.name FROM group_members m JOIN groups g ON g.id = m.group_id WHERE m.user_id = ? AND g.archived = 0 LIMIT 3`)
    .all(person.id) as { name: string }[];
  return (
    <AuthCard
      title={inviter ? `${inviter.name.split(" ")[0]} invited you` : "Welcome to SplitnDutch"}
      lede={
        groups.length
          ? `You're already in ${groups.map((g) => `“${g.name}”`).join(", ")}. Set a password to see what's owed.`
          : "Set a password to see your shared expenses."
      }
    >
      <p className="tiny muted" style={{ marginBottom: 10 }}>
        Signing in as <strong>{person.email}</strong>
      </p>
      <SetPasswordForm token={token} askName name={person.name} cta="Join SplitnDutch" />
      <p className="tiny muted" style={{ marginTop: 12 }}>
        By joining you agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>. It's free, with no ads.
      </p>
    </AuthCard>
  );
}
