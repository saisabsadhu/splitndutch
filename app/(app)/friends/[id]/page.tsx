import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityList } from "@/components/ActivityList";
import { ConfirmButton } from "@/components/Fields";
import { GuestInviteForm } from "@/components/Forms";
import { PayPanel } from "@/components/PayPanel";
import { SettleForm } from "@/components/SettleForm";
import { Avatar, BalanceText, Flash, StatusTag } from "@/components/ui";
import { friendRemove, inviteResend, sendReminder } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { friendDetail } from "@/lib/queries";
import { whatsappHref } from "@/lib/share";

export const metadata = { title: "Friend" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string; error?: string }> };

export default async function FriendPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const data = friendDetail(user, id);
  if (!data) notFound();
  if (!data.isFriend && data.groups.length === 0 && data.activity.length === 0) notFound();
  const p = data.person;
  const first = p.name.split(" ")[0];
  const owedToMe = data.lines.find((l) => l.minor > 0);
  const iOwe = data.lines.find((l) => l.minor < 0);
  const iOweInr = data.lines.find((l) => l.minor < 0 && l.currency === "INR");
  const back = `/friends/${p.id}`;
  const waText = owedToMe
    ? `Hi ${first}! Gentle reminder: ${formatMoney(owedToMe.minor, owedToMe.currency)} pending on SplitnDutch.${user.upiId ? ` UPI: ${user.upiId}` : ""} 🙏`
    : "";
  // Where does an INR debt live? Pay it in that scope so the right balance moves.
  const inrScope = data.personal.find((l) => l.currency === "INR" && l.minor < 0)
    ? null
    : data.byGroup.find((b) => b.lines.some((l) => l.currency === "INR" && l.minor < 0));

  return (
    <>
      <Flash notice={sp.notice} error={sp.error} />
      <div className="page-head">
        <div className="row">
          <Avatar name={p.name} size={60} status={p.status} />
          <div>
            <p className="kicker">{p.status === "guest" ? "Added by name" : p.email}</p>
            <h1>
              {p.name} <StatusTag status={p.status} />
            </h1>
          </div>
        </div>
        <Link className="btn" href={`/expenses/new?friend=${p.id}`}>
          + Add expense
        </Link>
      </div>

      {p.status === "guest" ? (
        <div className="card pad" style={{ marginBottom: 12 }}>
          <p>
            <strong>{first} doesn't have an email here yet.</strong> Add it and they'll get an invite. Their balance comes with them. If
            they already have an account, the two get linked.
          </p>
          <div style={{ height: 8 }} />
          <GuestInviteForm personId={p.id} back={back} />
        </div>
      ) : null}
      {p.status === "invited" ? (
        <div className="card pad row spread" style={{ marginBottom: 12 }}>
          <p>{first} hasn't set up their account yet.</p>
          <form action={inviteResend}>
            <input type="hidden" name="personId" value={p.id} />
            <input type="hidden" name="back" value={back} />
            <button className="btn ghost small" type="submit">
              Resend invite
            </button>
          </form>
        </div>
      ) : null}

      <div className="card pad" style={{ marginBottom: 12 }}>
        <p className="kicker">Overall</p>
        <h2 className="balance-big">{data.lines.length ? <BalanceText lines={data.lines} name={first} /> : "Settled up"}</h2>
        {data.byGroup.map((group) => (
          <p key={group.id} className="tiny" style={{ marginTop: 6 }}>
            <Link href={`/groups/${group.id}`}>{group.name}</Link>
            {": "}
            {group.lines.length === 0
              ? "settled"
              : group.lines.map((l) => (l.minor > 0 ? `owes you ${formatMoney(l.minor, l.currency)}` : `you owe ${formatMoney(-l.minor, l.currency)}`)).join(", ")}
          </p>
        ))}
        {data.personal.length > 0 ? (
          <p className="tiny" style={{ marginTop: 6 }}>
            Outside groups:{" "}
            {data.personal.map((l) => (l.minor > 0 ? `owes you ${formatMoney(l.minor, l.currency)}` : `you owe ${formatMoney(-l.minor, l.currency)}`)).join(", ")}
          </p>
        ) : null}
        {owedToMe ? (
          <div className="row wrap" style={{ marginTop: 12 }}>
            <a className="btn wa small" href={whatsappHref(waText)} target="_blank" rel="noopener noreferrer">
              Remind on WhatsApp
            </a>
            {p.status !== "guest" ? (
              <form action={sendReminder}>
                <input type="hidden" name="personId" value={p.id} />
                <input type="hidden" name="back" value={back} />
                <button className="btn ghost small" type="submit">
                  Send email reminder
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="dash">
        <section className="card pad">
          <h2>Expenses together</h2>
          <ActivityList items={data.activity} />
        </section>
        <div className="stack">
          {iOweInr ? (
            <section className="card pad">
              <h2>Pay {first}</h2>
              <PayPanel
                me={{ id: user.id, name: user.name }}
                payee={{ id: p.id, name: p.name, upiId: p.upiId }}
                minor={-(inrScope ? inrScope.lines.find((l) => l.currency === "INR")!.minor : data.personal.find((l) => l.currency === "INR")!.minor)}
                groupId={inrScope ? inrScope.id : null}
                groupName={inrScope?.name}
              />
            </section>
          ) : null}
          <section className="card pad">
            <h2>Record a payment</h2>
            <p className="muted tiny">Record it in the group where the balance lives, or outside a group for one-to-one expenses.</p>
            <div style={{ height: 8 }} />
            <SettleForm
              me={{ id: user.id, name: user.name }}
              people={[{ id: user.id, name: user.name }, p]}
              groups={data.groups.map((g) => ({ id: g.id, name: g.name }))}
              currency={iOwe?.currency ?? owedToMe?.currency ?? user.currency}
              defaultFrom={iOwe ? user.id : p.id}
              defaultTo={iOwe ? p.id : user.id}
            />
          </section>
          {data.isFriend && data.lines.length === 0 ? (
            <form action={friendRemove} className="card pad">
              <input type="hidden" name="friendId" value={p.id} />
              <ConfirmButton label="Remove friend" message={`Remove ${p.name} from your friends?`} />
            </form>
          ) : null}
        </div>
      </div>
    </>
  );
}
