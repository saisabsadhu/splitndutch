import Link from "next/link";
import { AuthCard } from "@/components/PublicShell";
import { GroupMark } from "@/components/ui";
import { groupJoin } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { getDestination } from "@/lib/destinations";
import { findGroupByInvite, listPeople } from "@/lib/queries";

export const metadata = { title: "Join group", robots: { index: false } };

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const group = findGroupByInvite(code);
  if (!group) {
    return (
      <AuthCard title="This invite link doesn't work" lede="It may have been reset by someone in the group. Ask them for the new link.">
        <Link className="btn full" href="/">
          Go to SplitnDutch
        </Link>
      </AuthCard>
    );
  }
  const user = await getCurrentUser();
  const dest = getDestination(group.destination);
  const names = listPeople(group.memberIds)
    .filter((p) => p.status !== "deleted")
    .map((p) => p.name.split(" ")[0]);
  const here = `/join/${code}`;
  return (
    <AuthCard title={`Join “${group.name}”`} lede={`${names.slice(0, 4).join(", ")}${names.length > 4 ? ` and ${names.length - 4} more` : ""} ${names.length === 1 ? "is" : "are"} splitting expenses here.`}>
      <div className="row" style={{ marginBottom: 14 }}>
        <GroupMark id={group.id} type={group.type} destination={group.destination} size={52} />
        <div>
          <strong>{group.name}</strong>
          {dest ? <p className="tiny muted">{dest.tagline}</p> : null}
        </div>
      </div>
      {user ? (
        group.memberIds.includes(user.id) ? (
          <Link className="btn full" href={`/groups/${group.id}`}>
            You're already in. Open the group
          </Link>
        ) : (
          <form action={groupJoin}>
            <input type="hidden" name="code" value={code} />
            <button className="btn full" type="submit">
              Join as {user.name}
            </button>
          </form>
        )
      ) : (
        <div className="stack">
          <Link className="btn full" href={`/signup?next=${encodeURIComponent(here)}`}>
            Create a free account to join
          </Link>
          <Link className="btn ghost full" href={`/login?next=${encodeURIComponent(here)}`}>
            I already have an account
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
