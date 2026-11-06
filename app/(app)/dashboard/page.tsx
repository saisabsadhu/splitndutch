import Link from "next/link";
import { ActivityList } from "@/components/ActivityList";
import { Spending } from "@/components/Spending";
import { Avatar, BalanceText, Empty, Flash, GroupMark, StatusTag } from "@/components/ui";
import { recurringPost } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { formatDate, formatMonth, monthKey, todayISO } from "@/lib/dates";
import { factOfTheDay, getDestination, tripCountdown } from "@/lib/destinations";
import { formatMoney } from "@/lib/money";
import { loadDashboard } from "@/lib/queries";

export const metadata = { title: "Home" };

type Search = Promise<{ notice?: string; error?: string; welcome?: string }>;

export default async function DashboardPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const user = await requireUser();
  const data = loadDashboard(user);
  const today = todayISO();
  const month = formatMonth(monthKey(today));

  const trips = data.groups
    .filter((g) => g.type === "trip" && g.startDate)
    .map((g) => ({ ...g, countdown: tripCountdown(g.startDate, g.endDate, today), dest: getDestination(g.destination) }))
    .filter((g) => g.countdown && !g.countdown.startsWith("Trip done"))
    .sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""));
  const trip = trips[0];

  const steps = [
    { done: data.groups.length > 0, label: "Create a group for your flat or next trip", href: "/groups#new" },
    { done: Boolean(user.upiId), label: "Add your UPI ID so friends can pay you in one tap", href: "/account#profile" },
    { done: data.activity.length > 0, label: "Add your first expense", href: "/expenses/new" },
  ];
  const showSetup = steps.some((s) => !s.done);

  return (
    <>
      <Flash notice={sp.notice} error={sp.error} />
      <div className="page-head">
        <div>
          <p className="kicker">Namaste, {user.name.split(" ")[0]} 👋</p>
          <h1>Your balances</h1>
        </div>
      </div>

      {showSetup ? (
        <section className="card pad setup">
          <h2>{sp.welcome ? "Welcome aboard! Three quick things" : "Finish setting up"}</h2>
          <ol className="steps-list">
            {steps.map((s) => (
              <li key={s.label} className={s.done ? "done" : ""}>
                <span className="tick" aria-hidden="true">
                  {s.done ? "✓" : ""}
                </span>
                {s.done ? <span>{s.label}</span> : <Link href={s.href}>{s.label}</Link>}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {data.totals.length === 0 ? (
        <div className="card pad hero-total settled">
          <p className="kicker">All square</p>
          <h2>You're settled up with everyone 🎉</h2>
          <p className="muted">Add an expense when someone pays, or start a group for the next trip.</p>
        </div>
      ) : (
        <div className="stack">
          {data.totals.map((total) => {
            const net = total.owedToYou - total.youOwe;
            return (
              <div className="card hero-total" key={total.currency}>
                <div>
                  <p className="kicker">Overall · {total.currency}</p>
                  <b className={net >= 0 ? "pos num" : "neg num"}>
                    {net >= 0 ? `You get ${formatMoney(net, total.currency)}` : `You owe ${formatMoney(-net, total.currency)}`}
                  </b>
                </div>
                <div className="split-totals">
                  <span>
                    <small>Owed to you</small>
                    <strong className="pos num">{formatMoney(total.owedToYou, total.currency)}</strong>
                  </span>
                  <span>
                    <small>You owe</small>
                    <strong className="neg num">{formatMoney(total.youOwe, total.currency)}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {trip ? (
        <Link
          href={`/groups/${trip.id}`}
          className="trip-banner"
          style={trip.dest ? { background: `linear-gradient(120deg, ${trip.dest.colors[0]}, ${trip.dest.colors[1]})` } : undefined}
        >
          <span className="trip-emoji">{trip.dest?.emoji ?? "🧳"}</span>
          <span>
            <small>{trip.countdown}</small>
            <strong>{trip.name}</strong>
            {trip.dest ? <em>Did you know? {factOfTheDay(trip.dest, today)}</em> : null}
          </span>
        </Link>
      ) : null}

      {data.recurring.length > 0 ? (
        <section className="card pad" style={{ marginTop: 12 }}>
          <h2>Bills ready to post</h2>
          <div className="list">
            {data.recurring.map((item) => (
              <div className="person" key={item.templateId}>
                <span className="cat-dot">🔁</span>
                <span>
                  <strong>{item.description}</strong>
                  <small>
                    {formatDate(item.nextDate)}
                    {item.group ? ` · ${item.group.name}` : ""} · {item.waiting} waiting
                  </small>
                </span>
                <form action={recurringPost}>
                  <input type="hidden" name="templateId" value={item.templateId} />
                  <input type="hidden" name="back" value="/dashboard" />
                  <button className="btn small" type="submit">
                    Post {formatMoney(item.minor, item.currency)}
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="dash">
        <section className="card pad">
          <div className="spread">
            <h2>People</h2>
            <Link href="/friends">All friends</Link>
          </div>
          <div className="list">
            {data.friends.filter((f) => f.lines.length > 0).length === 0 ? (
              <Empty title="No open balances" body="When someone owes you, or you owe them, they'll show up here." />
            ) : null}
            {data.friends
              .filter((f) => f.lines.length > 0)
              .map((friend) => (
                <Link key={friend.person.id} href={`/friends/${friend.person.id}`} className="person">
                  <Avatar name={friend.person.name} status={friend.person.status} />
                  <span>
                    <strong>
                      {friend.person.name} <StatusTag status={friend.person.status} />
                    </strong>
                  </span>
                  <BalanceText lines={friend.lines} name={friend.person.name.split(" ")[0]} />
                </Link>
              ))}
          </div>
        </section>
        <div className="stack">
          <section className="card pad">
            <div className="spread">
              <h2>Groups</h2>
              <Link href="/groups">Manage</Link>
            </div>
            <div className="list">
              {data.groups.length === 0 ? (
                <Empty title="No groups yet" body="Flatmates, a Goa trip, the hostel wing: start one in 10 seconds.">
                  <Link className="btn small" href="/groups#new">
                    Create a group
                  </Link>
                </Empty>
              ) : null}
              {data.groups.map((group) => (
                <Link key={group.id} href={`/groups/${group.id}`} className="person">
                  <GroupMark id={group.id} type={group.type} destination={group.destination} />
                  <span>
                    <strong>{group.name}</strong>
                    <small>
                      {group.memberCount} people{group.lastDate ? ` · ${formatDate(group.lastDate)}` : ""}
                    </small>
                  </span>
                  <BalanceText lines={group.lines} />
                </Link>
              ))}
            </div>
          </section>
          <section className="card pad">
            <h2>Your share in {month}</h2>
            <Spending rows={data.spending} currency={data.spendingCurrency} caption={month} />
            {data.otherCurrencySpend ? <p className="tiny muted">Other currencies are left out of this chart so the numbers stay honest.</p> : null}
          </section>
        </div>
      </div>
      <section className="card pad" style={{ marginTop: 12 }}>
        <div className="spread">
          <h2>Recent activity</h2>
          <Link href="/activity">All activity</Link>
        </div>
        <ActivityList items={data.activity} />
      </section>
    </>
  );
}
