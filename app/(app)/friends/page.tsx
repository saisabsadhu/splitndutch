import Link from "next/link";
import { FriendAddForm } from "@/components/Forms";
import { Avatar, BalanceText, Flash } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { loadDashboard } from "@/lib/queries";

export const metadata = { title: "Friends" };

export default function FriendsPage({ searchParams }: { searchParams: { notice?: string; error?: string } }) {
  const user = requireUser();
  const data = loadDashboard(user);
  const open = data.friends.filter((f) => f.lines.length > 0);
  const settled = data.friends.filter((f) => f.lines.length === 0);
  return (
    <>
      <Flash notice={searchParams.notice} error={searchParams.error} />
      <div className="page-head">
        <div>
          <p className="kicker">People</p>
          <h1>Friends</h1>
        </div>
      </div>
      <div className="dash">
        <section className="card pad">
          <h2>Balances</h2>
          <div className="list">
            {open.length === 0 ? <p className="empty">Everyone you know here is settled up.</p> : null}
            {open.map((friend) => (
              <Link key={friend.person.id} href={`/friends/${friend.person.id}`} className="person">
                <Avatar name={friend.person.name} />
                <span>
                  <strong>{friend.person.name}</strong>
                  <small>{friend.person.email}</small>
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
                    <Avatar name={friend.person.name} />
                    <span>
                      <strong>{friend.person.name}</strong>
                      <small>{friend.isFriend ? friend.person.email : "In a group with you"}</small>
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
          <p className="muted">They need an account first. Use the email they signed up with.</p>
          <div style={{ height: 10 }} />
          <FriendAddForm />
        </section>
      </div>
    </>
  );
}
