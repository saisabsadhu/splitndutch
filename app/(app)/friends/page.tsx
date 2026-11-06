import Link from "next/link";
import { FriendAddForm } from "@/components/Forms";
import { Avatar, BalanceText, Empty, Flash, StatusTag } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { loadDashboard } from "@/lib/queries";

export const metadata = { title: "Friends" };

export default async function FriendsPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const data = loadDashboard(user);
  const open = data.friends.filter((f) => f.lines.length > 0);
  const settled = data.friends.filter((f) => f.lines.length === 0);
  return (
    <>
      <Flash notice={sp.notice} error={sp.error} />
      <div className="page-head">
        <div>
          <p className="kicker">People</p>
          <h1>Friends</h1>
        </div>
      </div>
      <div className="dash">
        <section className="card pad">
          <h2>Open balances</h2>
          <div className="list">
            {open.length === 0 ? <Empty title="Everyone's settled up" /> : null}
            {open.map((friend) => (
              <Link key={friend.person.id} href={`/friends/${friend.person.id}`} className="person">
                <Avatar name={friend.person.name} status={friend.person.status} />
                <span>
                  <strong>
                    {friend.person.name} <StatusTag status={friend.person.status} />
                  </strong>
                  <small>{friend.person.status === "guest" ? "Added by name" : friend.person.email}</small>
                </span>
                <BalanceText lines={friend.lines} name={friend.person.name.split(" ")[0]} />
              </Link>
            ))}
          </div>
          {settled.length > 0 ? (
            <>
              <h3 style={{ marginTop: 16 }}>Settled</h3>
              <div className="list">
                {settled.map((friend) => (
                  <Link key={friend.person.id} href={`/friends/${friend.person.id}`} className="person">
                    <Avatar name={friend.person.name} status={friend.person.status} />
                    <span>
                      <strong>
                        {friend.person.name} <StatusTag status={friend.person.status} />
                      </strong>
                      <small>{friend.isFriend ? (friend.person.status === "guest" ? "Added by name" : friend.person.email) : "In a group with you"}</small>
                    </span>
                    <span className="muted">Settled up</span>
                  </Link>
                ))}
              </div>
            </>
          ) : null}
        </section>
        <section className="card pad">
          <h2>Add a friend</h2>
          <p className="muted tiny" style={{ marginBottom: 10 }}>
            They don't need an account. Add their email and we'll invite them, or just a name for now.
          </p>
          <FriendAddForm />
        </section>
      </div>
    </>
  );
}
