import Link from "next/link";
import { ActivityList } from "@/components/ActivityList";
import { GroupMark } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { searchEverything } from "@/lib/queries";

export const metadata = { title: "Search" };

export default function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const user = requireUser();
  const q = searchParams.q ?? "";
  const data = searchEverything(user.id, q);
  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">Search</p>
          <h1>{q.trim() ? `“${q.trim()}”` : "Search"}</h1>
        </div>
      </div>
      <form action="/search" className="search" style={{ marginBottom: 16 }}>
        <input name="q" defaultValue={q} aria-label="Search" />
      </form>
      {!q.trim() ? <p className="muted">Try a dinner, a friend, or a group.</p> : null}
      {q.trim() ? (
        <div className="stack">
          <section className="card pad">
            <h2>Expenses</h2>
            <ActivityList items={data.expenses} />
          </section>
          <section className="card pad">
            <h2>Groups</h2>
            {data.groups.length === 0 ? <p className="empty">No groups.</p> : null}
            <div className="list">
              {data.groups.map((g) => (
                <Link key={g.id} href={`/groups/${g.id}`} className="person">
                  <GroupMark id={g.id} type={g.type} />
                  <strong>{g.name}</strong>
                  <span />
                </Link>
              ))}
            </div>
          </section>
          <section className="card pad">
            <h2>Friends</h2>
            {data.friends.length === 0 ? <p className="empty">No friends.</p> : null}
            <div className="list">
              {data.friends.map((f) => (
                <Link key={f.id} href={`/friends/${f.id}`} className="person">
                  <strong>{f.name}</strong>
                  <span className="muted">{f.email}</span>
                  <span />
                </Link>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
