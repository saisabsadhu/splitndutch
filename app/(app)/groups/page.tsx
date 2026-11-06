import Link from "next/link";
import { GroupCreateForm } from "@/components/Forms";
import { BalanceText, Flash, GroupMark } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { loadDashboard } from "@/lib/queries";

export const metadata = { title: "Groups" };

export default function GroupsPage({ searchParams }: { searchParams: { notice?: string; error?: string } }) {
  const user = requireUser();
  const data = loadDashboard(user);
  return (
    <>
      <Flash notice={searchParams.notice} error={searchParams.error} />
      <div className="page-head">
        <div>
          <p className="kicker">Homes, trips, and everyone else</p>
          <h1>Groups</h1>
        </div>
      </div>
      <div className="dash">
        <section className="card pad">
          <div className="list">
            {data.groups.length === 0 ? <p className="empty">No groups yet. Create one and add people by email.</p> : null}
            {data.groups.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`} className="person">
                <GroupMark id={group.id} type={group.type} />
                <span>
                  <strong>{group.name}</strong>
                  <small>
                    {group.memberCount} people{group.lastDate ? ` · last expense ${formatDate(group.lastDate)}` : ""}
                  </small>
                </span>
                <BalanceText lines={group.lines} />
              </Link>
            ))}
          </div>
        </section>
        <section className="card pad">
          <h2>New group</h2>
          <GroupCreateForm />
        </section>
      </div>
    </>
  );
}
