import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityList } from "@/components/ActivityList";
import { ConfirmButton } from "@/components/Fields";
import { GroupSettingsForm, GuestInviteForm, MemberAddForm } from "@/components/Forms";
import { PayPanel } from "@/components/PayPanel";
import { SettleForm } from "@/components/SettleForm";
import { CopyButton, ShareRow } from "@/components/Share";
import { Spending } from "@/components/Spending";
import { Avatar, Flash, GroupMark, StatusTag } from "@/components/ui";
import { groupArchive, groupRemoveMember, groupResetLink, inviteResend, recurringPost, sendReminder } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { groupTypeOf } from "@/lib/categories";
import { absoluteUrl } from "@/lib/config";
import { formatDate, formatMonth, monthKey, todayISO } from "@/lib/dates";
import { VIBES, checklistFor, factOfTheDay, getDestination, tripCountdown } from "@/lib/destinations";
import { formatMoney } from "@/lib/money";
import { ensureInviteCode } from "@/lib/mutations";
import { groupDetail } from "@/lib/queries";
import { whatsappHref } from "@/lib/share";

export const metadata = { title: "Group" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string; error?: string; tab?: string }> };

export default async function GroupPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const data = groupDetail(user.id, id);
  if (!data) notFound();
  const g = data.group;
  const dest = getDestination(g.destination);
  const today = todayISO();
  const countdown = g.type === "trip" ? tripCountdown(g.startDate, g.endDate, today) : null;
  const nameOf = (pid: string) => data.members.find((m) => m.id === pid)?.name ?? "Someone";
  const personOf = (pid: string) => data.members.find((m) => m.id === pid);
  const back = `/groups/${g.id}`;
  const inviteUrl = absoluteUrl(`/join/${g.inviteCode ?? ensureInviteCode(g.id)}`);
  const iOwe = data.suggestions.filter((d) => d.fromId === user.id);
  const owedToMe = data.suggestions.filter((d) => d.toId === user.id);
  const others = data.suggestions.filter((d) => d.fromId !== user.id && d.toId !== user.id);
  const top = [...iOwe, ...owedToMe].sort((a, b) => b.minor - a.minor)[0];
  const month = formatMonth(monthKey(today));
  const budgetUsed = g.budgetMinor ? Math.min(100, Math.round((data.stats.total / g.budgetMinor) * 100)) : 0;
  const headStyle = dest ? { background: `linear-gradient(125deg, ${dest.colors[0]}, ${dest.colors[1]})` } : undefined;

  return (
    <>
      <Flash notice={sp.notice} error={sp.error} />
      <header className={dest ? "group-hero themed" : "group-hero"} style={headStyle}>
        <div className="row">
          <GroupMark id={g.id} type={g.type} destination={g.destination} size={60} />
          <div>
            <p className="kicker">
              {groupTypeOf(g.type).label}
              {dest ? ` · ${dest.region}` : ""}
              {countdown ? ` · ${countdown}` : ""}
            </p>
            <h1>{g.name}</h1>
            <div className="face-pile" aria-label={`${data.members.length} members`}>
              {data.members.slice(0, 8).map((m) => (
                <Avatar key={m.id} name={m.name} size={26} status={m.status} />
              ))}
              <span className="tiny">{data.members.length} people</span>
            </div>
          </div>
        </div>
        <div className="row wrap">
          <Link className="btn" href={`/expenses/new?group=${g.id}`}>
            + Add expense
          </Link>
          <a className="btn ghost" href={`/api/groups/${g.id}/export`}>
            Export CSV
          </a>
        </div>
      </header>

      <div className="dash">
        <div className="stack">
          <section className="card pad">
            <p className="kicker">Your balance here</p>
            <h2 className="balance-big">
              {data.myLines.length === 0 ? (
                <span className="muted">You're settled up</span>
              ) : (
                data.myLines.map((l) => (
                  <span key={l.currency} className={l.minor > 0 ? "pos" : "neg"}>
                    {l.minor > 0 ? `You get ${formatMoney(l.minor, l.currency)}` : `You owe ${formatMoney(-l.minor, l.currency)}`}
                  </span>
                ))
              )}
            </h2>

            {iOwe.length > 0 ? (
              <div className="stack" style={{ marginTop: 12 }}>
                {await Promise.all(
                  iOwe.map(async (d) => {
                    const payee = personOf(d.toId);
                    if (d.currency === "INR" && payee) {
                      return (
                        <PayPanel
                          key={`${d.toId}-${d.currency}`}
                          me={{ id: user.id, name: user.name }}
                          payee={{ id: payee.id, name: payee.name, upiId: payee.upiId }}
                          minor={d.minor}
                          groupId={g.id}
                          groupName={g.name}
                        />
                      );
                    }
                    return (
                      <p key={`${d.toId}-${d.currency}`} className="settle-line">
                        You pay <strong>{nameOf(d.toId)}</strong> <span className="num">{formatMoney(d.minor, d.currency)}</span>
                      </p>
                    );
                  }),
                )}
              </div>
            ) : null}

            {owedToMe.length > 0 ? (
              <div className="list" style={{ marginTop: 10 }}>
                {owedToMe.map((d) => {
                  const debtor = personOf(d.fromId);
                  const amount = formatMoney(d.minor, d.currency);
                  const waText = `Hi ${nameOf(d.fromId).split(" ")[0]}! Gentle reminder: ${amount} for “${g.name}” on SplitnDutch.${
                    user.upiId ? ` UPI: ${user.upiId}` : ""
                  } 🙏`;
                  return (
                    <div className="person" key={`${d.fromId}-${d.currency}`}>
                      <Avatar name={nameOf(d.fromId)} status={debtor?.status} />
                      <span>
                        <strong>{nameOf(d.fromId)}</strong>
                        <small className="pos">owes you {amount}</small>
                      </span>
                      <span className="row tight">
                        <a className="btn wa small" href={whatsappHref(waText)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${nameOf(d.fromId)}`}>
                          WhatsApp
                        </a>
                        {debtor?.status !== "guest" ? (
                          <form action={sendReminder}>
                            <input type="hidden" name="personId" value={d.fromId} />
                            <input type="hidden" name="groupId" value={g.id} />
                            <input type="hidden" name="back" value={back} />
                            <button className="btn ghost small" type="submit">
                              Email nudge
                            </button>
                          </form>
                        ) : null}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {others.length > 0 ? (
              <details className="others">
                <summary>Everyone else ({others.length})</summary>
                {others.map((d) => (
                  <p key={`${d.fromId}-${d.toId}-${d.currency}`} className="settle-line">
                    <strong>{nameOf(d.fromId)}</strong> pays <strong>{nameOf(d.toId)}</strong>{" "}
                    <span className="num">{formatMoney(d.minor, d.currency)}</span>
                  </p>
                ))}
              </details>
            ) : null}
            {data.suggestions.length === 0 ? <p className="muted" style={{ marginTop: 6 }}>Everyone in this group is settled. 🙌</p> : null}
            <p className="tiny muted" style={{ marginTop: 10 }}>
              {g.simplify ? "Debts are simplified: the fewest payments that settle everyone." : "Debts stay with whoever originally paid."}
            </p>
          </section>

          {data.recurring.length > 0 ? (
            <section className="card pad">
              <h2>Ready to post</h2>
              {data.recurring.map((item) => (
                <form key={item.templateId} action={recurringPost} className="spread" style={{ padding: "0.4rem 0" }}>
                  <span>
                    {item.description} · {formatDate(item.nextDate)} · {item.waiting} waiting
                  </span>
                  <input type="hidden" name="templateId" value={item.templateId} />
                  <input type="hidden" name="back" value={back} />
                  <button className="btn small" type="submit">
                    Post {formatMoney(item.minor, item.currency)}
                  </button>
                </form>
              ))}
            </section>
          ) : null}

          <section className="card pad">
            <div className="spread">
              <h2>Expenses</h2>
              <span className="tiny muted">{data.stats.count} so far</span>
            </div>
            <ActivityList items={data.activity} />
          </section>
        </div>

        <div className="stack">
          <section className="card pad invite-card">
            <h2>Invite people</h2>
            <p className="tiny muted">Anyone with this link can join the group. Drop it in your WhatsApp group.</p>
            <div className="invite-url">
              <code>{inviteUrl}</code>
              <CopyButton value={inviteUrl} label="Copy" />
            </div>
            <ShareRow url={inviteUrl} title={`Join ${g.name}`} text={`Join “${g.name}” on SplitnDutch so we can split expenses without the maths 👇`} />
            <form action={groupResetLink}>
              <input type="hidden" name="groupId" value={g.id} />
              <ConfirmButton className="linkish tiny" label="Reset link" message="Make a new link? The current one will stop working." />
            </form>
          </section>

          {dest ? (
            <section className="card dest-card" style={{ borderTop: `5px solid ${dest.colors[0]}` }}>
              <div className="pad stack">
                <p className="kicker">
                  {dest.emoji} {dest.name} · {VIBES[dest.vibe]} · Best {dest.bestMonths}
                </p>
                <p className="fact">
                  <strong>Did you know?</strong> {factOfTheDay(dest, today)}
                </p>
                <details>
                  <summary>Lesser-known places nearby ({dest.hiddenGems.length})</summary>
                  <ul className="gems">
                    {dest.hiddenGems.map((gem) => (
                      <li key={gem.name}>
                        <strong>{gem.name}</strong>: {gem.note}
                      </li>
                    ))}
                  </ul>
                </details>
                <details>
                  <summary>Know before you go</summary>
                  <ul className="gems">
                    {dest.tips.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </details>
                <details>
                  <summary>Packing checklist</summary>
                  <ul className="checklist">
                    {checklistFor(dest).map((c) => (
                      <li key={c}>
                        <label>
                          <input type="checkbox" className="check" /> {c}
                        </label>
                      </li>
                    ))}
                  </ul>
                </details>
                <details>
                  <summary>More facts</summary>
                  <ul className="gems">
                    {dest.facts.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </details>
                <Link className="tiny" href={`/explore/${dest.id}`}>
                  Full {dest.name} guide →
                </Link>
              </div>
            </section>
          ) : null}

          <section className="card pad">
            <h2>{g.type === "trip" ? "Trip so far" : "Group totals"}</h2>
            <p className="big-money num">{formatMoney(data.stats.total, data.stats.currency)}</p>
            <p className="tiny muted">
              total spent in {data.stats.currency}
              {data.members.length ? ` · about ${formatMoney(Math.round(data.stats.total / data.members.length), data.stats.currency)} per person` : ""}
            </p>
            {g.budgetMinor ? (
              <div className="budget">
                <div className="track">
                  <span style={{ width: `${budgetUsed}%`, background: budgetUsed >= 100 ? "var(--coral)" : budgetUsed > 80 ? "var(--amber)" : undefined }} />
                </div>
                <p className="tiny">
                  {budgetUsed}% of {formatMoney(g.budgetMinor, data.stats.currency)} budget
                  {data.stats.total > g.budgetMinor ? ` · over by ${formatMoney(data.stats.total - g.budgetMinor, data.stats.currency)}` : ""}
                </p>
              </div>
            ) : null}
            <table className="stats">
              <thead>
                <tr>
                  <th>Person</th>
                  <th className="right">Paid</th>
                  <th className="right">Their share</th>
                </tr>
              </thead>
              <tbody>
                {data.stats.people.map((row) => (
                  <tr key={row.person.id}>
                    <td>{row.person.id === user.id ? "You" : row.person.name}</td>
                    <td className="right num">{formatMoney(row.paid, data.stats.currency)}</td>
                    <td className="right num">{formatMoney(row.used, data.stats.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.stats.otherCurrencies ? <p className="tiny muted">Expenses in other currencies aren't counted here.</p> : null}
          </section>

          <section className="card pad">
            <h2>Record a payment</h2>
            <SettleForm
              me={{ id: user.id, name: user.name }}
              people={data.members}
              groupId={g.id}
              currency={top?.currency ?? g.currency}
              defaultFrom={top?.fromId ?? user.id}
              defaultTo={top?.toId ?? data.members.find((m) => m.id !== user.id)?.id ?? user.id}
              defaultAmount={top ? String(top.minor / 100) : undefined}
            />
          </section>

          <section className="card pad">
            <h2>Spending in {month}</h2>
            <Spending rows={data.spending} currency={data.spendCurrency} caption={month} />
          </section>
        </div>
      </div>

      <section className="card pad" style={{ marginTop: 12 }} id="members">
        <h2>Members</h2>
        <div className="list">
          {data.balances.map(({ person: m, lines }) => (
            <div className="person member" key={m.id}>
              <Avatar name={m.name} status={m.status} />
              <span>
                <strong>
                  {m.id === user.id ? "You" : m.name} <StatusTag status={m.status} />
                </strong>
                <small>
                  {m.status === "guest" ? "Added by name" : m.email}
                  {" · "}
                  {lines.length === 0
                    ? "settled"
                    : lines.map((l) => (l.minor > 0 ? `gets back ${formatMoney(l.minor, l.currency)}` : `owes ${formatMoney(-l.minor, l.currency)}`)).join(", ")}
                </small>
                {m.status === "guest" ? <GuestInviteForm personId={m.id} back={back} /> : null}
              </span>
              <span className="row tight">
                {m.status === "invited" ? (
                  <form action={inviteResend}>
                    <input type="hidden" name="personId" value={m.id} />
                    <input type="hidden" name="back" value={back} />
                    <button className="btn ghost small" type="submit">
                      Resend invite
                    </button>
                  </form>
                ) : null}
                <form action={groupRemoveMember}>
                  <input type="hidden" name="groupId" value={g.id} />
                  <input type="hidden" name="memberId" value={m.id} />
                  <ConfirmButton
                    label={m.id === user.id ? "Leave" : "Remove"}
                    message={m.id === user.id ? "Leave this group? You need to be settled first." : `Remove ${m.name}? They need to be settled first.`}
                  />
                </form>
              </span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <h3>Add someone</h3>
          <p className="tiny muted">With an email they get an invite. With just a name they're added right away. Add their email whenever.</p>
          <div style={{ height: 8 }} />
          <MemberAddForm groupId={g.id} />
        </div>
      </section>

      <section className="card pad" style={{ marginTop: 12 }} id="settings">
        <details>
          <summary>
            <h2 style={{ display: "inline" }}>Group settings</h2>
          </summary>
          <div style={{ height: 12 }} />
          <GroupSettingsForm
            defaults={{
              groupId: g.id,
              name: g.name,
              type: g.type,
              currency: g.currency,
              destination: g.destination,
              startDate: g.startDate,
              endDate: g.endDate,
              budgetMinor: g.budgetMinor,
              simplify: g.simplify,
            }}
          />
          <form action={groupArchive} style={{ marginTop: 16 }}>
            <input type="hidden" name="groupId" value={g.id} />
            <ConfirmButton label="Delete group" message="Delete this group? Everyone must be settled. Expenses will be hidden." />
          </form>
        </details>
      </section>
    </>
  );
}
