import Link from "next/link";
import { GroupCreateForm } from "@/components/Forms";
import { BalanceText, Empty, Flash, GroupMark } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate, todayISO } from "@/lib/dates";
import { tripCountdown } from "@/lib/destinations";
import { loadDashboard } from "@/lib/queries";

export const metadata = { title: "Groups" };

type Search = Promise<{ notice?: string; error?: string; destination?: string }>;

export default async function GroupsPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const user = await requireUser();
  const data = loadDashboard(user);
  const today = todayISO();
  return (
    <>
      <Flash notice={sp.notice} error={sp.error} />
      <div className="page-head">
        <div>
          <p className="kicker">Flats, trips, hostels and everyone else</p>
          <h1>Groups</h1>
        </div>
      </div>
      <div className="dash">
        <section className="card pad">
          <div className="list">
            {data.groups.length === 0 ? <Empty title="No groups yet" body="Create one on the right and share the invite link on WhatsApp." /> : null}
            {data.groups.map((group) => {
              const countdown = group.type === "trip" ? tripCountdown(group.startDate, group.endDate, today) : null;
              return (
                <Link key={group.id} href={`/groups/${group.id}`} className="person">
                  <GroupMark id={group.id} type={group.type} destination={group.destination} />
                  <span>
                    <strong>{group.name}</strong>
                    <small>
                      {group.memberCount} people
                      {countdown ? ` · ${countdown}` : group.lastDate ? ` · last expense ${formatDate(group.lastDate)}` : ""}
                    </small>
                  </span>
                  <BalanceText lines={group.lines} />
                </Link>
              );
            })}
          </div>
        </section>
        <section className="card pad">
          <h2>New group</h2>
          <p className="tiny muted" style={{ marginBottom: 10 }}>
            Planning a trip? Pick a destination for travel tips, lesser-known places and the right currency.
          </p>
          <GroupCreateForm destination={sp.destination} />
        </section>
      </div>
    </>
  );
}
