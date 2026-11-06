import Link from "next/link";
import { ActivityList } from "@/components/ActivityList";
import { Spending } from "@/components/Spending";
import { Avatar, BalanceText, Flash, GroupMark } from "@/components/ui";
import { recurringPost } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { formatDate, formatMonth, monthKey, todayISO } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { loadDashboard } from "@/lib/queries";

export const metadata = { title: "Home" };

export default function DashboardPage({ searchParams }: { searchParams: { notice?: string; error?: string } }) {
  const user = requireUser();
  const data = loadDashboard(user);
  const month = formatMonth(monthKey(todayISO()));
  return (
    <>
      <Flash notice={searchParams.notice} error={searchParams.error} />
      <div className="page-head">
        <div>
          <p className="kicker">Hello, {user.name.split(" ")[0]}</p>
          <h1>Your balances</h1>
        </div>
        <Link className="btn" href="/expenses/new">
          Add expense
        </Link>
      </div>
      {data.totals.length === 0 ? (
        <div className="card pad">
          <h2>You're settled up</h2>
          <p className="muted">Add an expense when someone pays, or open a group for the next trip.</p>
        </div>
      ) : (
        <div className="stack">
          {data.totals.map((total) => (
            <div className="totals" key={total.currency}>
              <article className="card total">
                <span className="kicker">You are owed · {total.currency}</span>
                <b className="pos num">{formatMoney(total.owedToYou, total.currency)}</b>
              </article>
              <article className="card total">
                <span className="kicker">You owe · {total.currency}</span>
                <b className="neg num">{formatMoney(total.youOwe, total.currency)}</b>
              </article>
            </div>
          ))}
        </div>
      )}
      {data.recurring.length > 0 ? (
        <section className="card pad" style={{ marginTop: 12 }}>
          <h2>Bills ready to post</h2>
          <div className="list">
            {data.recurring.map((item) => (
              <div className="person" key={item.templateId}>
                <div>
                  <strong>{item.description}</strong>
                  <small>
                    {formatDate(item.nextDate)}
                    {item.group ? ` · ${item.group.name}` : ""} · {item.waiting} waiting
                  </small>
                </div>
                <span />
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
            <h2>Friends</h2>
            <Link href="/friends">All friends</Link>
          </div>
          <div className="list">
            {data.friends.filter((f) => f.lines.length > 0).length === 0 ? <p className="empty">No outstanding balances.</p> : null}
            {data.friends
              .filter((f) => f.lines.length > 0)
              .map((friend) => (
                <Link key={friend.person.id} href={`/friends/${friend.person.id}`} className="person">
                  <Avatar name={friend.person.name} />
                  <strong>{friend.person.name}</strong>
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
              {data.groups.length === 0 ? <p className="empty">Create a group for a home or a trip.</p> : null}
              {data.groups.map((group) => (
                <Link key={group.id} href={`/groups/${group.id}`} className="person">
                  <GroupMark id={group.id} type={group.type} />
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
