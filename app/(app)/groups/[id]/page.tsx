import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityList } from "@/components/ActivityList";
import { ConfirmButton } from "@/components/Fields";
import { MemberAddForm } from "@/components/Forms";
import { SettleForm } from "@/components/SettleForm";
import { Spending } from "@/components/Spending";
import { Avatar, BalanceText, Flash, GroupMark } from "@/components/ui";
import { groupArchive, groupRemoveMember, groupSave, recurringPost } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { GROUP_TYPES, getCategory } from "@/lib/categories";
import { formatDate, formatMonth, monthKey, todayISO } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { groupDetail } from "@/lib/queries";

export const metadata = { title: "Group" };

export default function GroupPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { notice?: string; error?: string };
}) {
  const user = requireUser();
  const data = groupDetail(user.id, params.id);
  if (!data) notFound();
  const nameOf = (id: string) => data.members.find((m) => m.id === id)?.name ?? "Someone";
  const involving = data.suggestions
    .filter((d) => d.fromId === user.id || d.toId === user.id)
    .sort((a, b) => b.minor - a.minor);
  const top = involving[0];
  const month = formatMonth(monthKey(todayISO()));
  const currency = data.spendCurrency;
  return (
    <>
      <Flash notice={searchParams.notice} error={searchParams.error} />
      <div className="page-head">
        <div className="row">
          <GroupMark id={data.group.id} type={data.group.type} size={56} />
          <div>
            <p className="kicker">{GROUP_TYPES.find((t) => t.id === data.group.type)?.label ?? "Group"}</p>
            <h1>{data.group.name}</h1>
          </div>
        </div>
        <div className="row">
          <a className="btn ghost" href={`/api/groups/${data.group.id}/export`}>
            Export CSV
          </a>
          <Link className="btn" href={`/expenses/new?group=${data.group.id}`}>
            Add expense
          </Link>
        </div>
      </div>
      <div className="card pad" style={{ marginBottom: 12 }}>
        <p className="kicker">Your balance</p>
        <h2>
          <BalanceText lines={data.myLines} />
        </h2>
        <p className="tiny muted" style={{ marginTop: 8 }}>
          {data.group.simplify
            ? "Debts here are simplified, so you pay the shortest path to even."
            : "Debts here stay with the person who originally paid."}
        </p>
        {data.suggestions.length > 0 ? (
          <div style={{ marginTop: 10 }}>
            {data.suggestions.map((d) => (
              <p key={`${d.fromId}-${d.toId}-${d.currency}`}>
                <strong>{d.fromId === user.id ? "You" : nameOf(d.fromId)}</strong>
                {d.fromId === user.id ? " pay " : " pays "}
                <strong>{d.toId === user.id ? "you" : nameOf(d.toId)}</strong> {formatMoney(d.minor, d.currency)}
              </p>
            ))}
          </div>
        ) : (
          <p style={{ marginTop: 8 }}>Everyone in this group is settled.</p>
        )}
      </div>
      {data.recurring.length > 0 ? (
        <section className="card pad" style={{ marginBottom: 12 }}>
          <h2>Ready to post</h2>
          {data.recurring.map((item) => (
            <form key={item.templateId} action={recurringPost} className="spread" style={{ padding: "0.4rem 0" }}>
              <span>
                {item.description} · {formatDate(item.nextDate)} · {item.waiting} waiting
              </span>
              <input type="hidden" name="templateId" value={item.templateId} />
              <input type="hidden" name="back" value={`/groups/${data.group.id}`} />
              <button className="btn small" type="submit">
                Post {formatMoney(item.minor, item.currency)}
              </button>
            </form>
          ))}
        </section>
      ) : null}
      <div className="dash">
        <section className="card pad">
          <h2>Expenses</h2>
          <ActivityList items={data.activity} />
        </section>
        <div className="stack">
          <section className="card pad">
            <h2>Settle up</h2>
            <SettleForm
              me={{ id: user.id, name: user.name }}
              people={data.members}
              groupId={data.group.id}
              currency={top?.currency ?? currency}
              defaultFrom={top?.fromId ?? user.id}
              defaultTo={top?.toId ?? data.members.find((m) => m.id !== user.id)?.id ?? user.id}
            />
          </section>
          <section className="card pad">
            <h2>Balances</h2>
            <div className="list">
              {data.balances.map((row) => (
                <div className="person" key={row.person.id}>
                  <Avatar name={row.person.name} />
                  <Link href={row.person.id === user.id ? "/account" : `/friends/${row.person.id}`}>
                    <strong>{row.person.id === user.id ? "You" : row.person.name}</strong>
                  </Link>
                  <span className="right">
                    {row.lines.length === 0 ? (
                      <span className="muted">settled</span>
                    ) : (
                      row.lines.map((l) => (
                        <span key={l.currency} className={l.minor > 0 ? "pos" : "neg"} style={{ display: "block" }}>
                          {l.minor > 0 ? `gets back ${formatMoney(l.minor, l.currency)}` : `owes ${formatMoney(-l.minor, l.currency)}`}
                        </span>
                      ))
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className="card pad">
            <h2>Spending in {month}</h2>
            <Spending
              rows={data.spending.filter((row) => getCategory(row.category))}
              currency={currency}
              caption={month}
            />
          </section>
        </div>
      </div>
      <section className="card pad" style={{ marginTop: 12 }}>
        <h2>Settings</h2>
        <form action={groupSave} className="stack" style={{ marginTop: 10 }}>
          <input type="hidden" name="groupId" value={data.group.id} />
          <div className="grid-2">
            <label className="field">
              <span>Name</span>
              <input name="name" defaultValue={data.group.name} required maxLength={60} />
            </label>
            <label className="field">
              <span>Type</span>
              <select name="type" defaultValue={data.group.type}>
                {GROUP_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="row tiny">
            <input className="check" type="checkbox" name="simplify" defaultChecked={data.group.simplify} />
            Simplify debts
          </label>
          <button className="btn" type="submit">
            Save group
          </button>
        </form>
        <div className="settings" style={{ marginTop: 18 }}>
          <div>
            <h3>Members</h3>
            <div className="list">
              {data.members.map((member) => (
                <div className="person" key={member.id}>
                  <Avatar name={member.name} />
                  <span>
                    <strong>{member.id === user.id ? "You" : member.name}</strong>
                    <small>{member.email}</small>
                  </span>
                  {member.id === user.id ? (
                    <form action={groupRemoveMember}>
                      <input type="hidden" name="groupId" value={data.group.id} />
                      <input type="hidden" name="memberId" value={member.id} />
                      <ConfirmButton label="Leave" message="Leave this group? You need to be settled first." />
                    </form>
                  ) : (
                    <form action={groupRemoveMember}>
                      <input type="hidden" name="groupId" value={data.group.id} />
                      <input type="hidden" name="memberId" value={member.id} />
                      <ConfirmButton label="Remove" message={`Remove ${member.name}? They need to be settled first.`} />
                    </form>
                  )}
                </div>
              ))}
            </div>
          </div>
          <MemberAddForm groupId={data.group.id} />
        </div>
        <form action={groupArchive} style={{ marginTop: 16 }}>
          <input type="hidden" name="groupId" value={data.group.id} />
          <ConfirmButton
            label="Delete group"
            message="Delete this group? Everyone must be settled. Expenses will be hidden."
          />
        </form>
      </section>
    </>
  );
}
