import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityList } from "@/components/ActivityList";
import { SettleForm } from "@/components/SettleForm";
import { ConfirmButton } from "@/components/Fields";
import { Avatar, BalanceText, Flash } from "@/components/ui";
import { friendRemove } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { friendDetail } from "@/lib/queries";

export const metadata = { title: "Friend" };

export default function FriendPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { notice?: string; error?: string };
}) {
  const user = requireUser();
  const data = friendDetail(user, params.id);
  if (!data) notFound();
  if (!data.isFriend && data.groups.length === 0 && data.activity.length === 0) notFound();
  const first = data.lines[0];
  const owedToMe = data.lines.find((l) => l.minor > 0);
  const iOwe = data.lines.find((l) => l.minor < 0);
  return (
    <>
      <Flash notice={searchParams.notice} error={searchParams.error} />
      <div className="page-head">
        <div className="row">
          <Avatar name={data.person.name} size={56} />
          <div>
            <p className="kicker">{data.person.email}</p>
            <h1>{data.person.name}</h1>
          </div>
        </div>
        <Link className="btn ghost" href={`/expenses/new?friend=${data.person.id}`}>
          Add expense
        </Link>
      </div>
      <div className="card pad" style={{ marginBottom: 12 }}>
        <p className="kicker">Overall</p>
        <h2>{first ? <BalanceText lines={data.lines} name={data.person.name.split(" ")[0]} /> : "Settled up"}</h2>
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
      </div>
      <div className="dash">
        <section className="card pad">
          <h2>Expenses together</h2>
          <ActivityList items={data.activity} />
        </section>
        <div className="stack">
          <section className="card pad">
            <h2>Settle up</h2>
            <p className="muted tiny">Record a payment in the group where the balance lives, or outside a group for a personal expense.</p>
            <div style={{ height: 8 }} />
            <SettleForm
              me={{ id: user.id, name: user.name }}
              people={[
                { id: user.id, name: user.name },
                data.person,
              ]}
              groups={data.groups.map((g) => ({ id: g.id, name: g.name }))}
              currency={iOwe?.currency ?? owedToMe?.currency ?? user.currency}
              defaultFrom={iOwe ? user.id : data.person.id}
              defaultTo={iOwe ? data.person.id : user.id}
            />
          </section>
          {data.isFriend && data.lines.length === 0 ? (
            <form action={friendRemove} className="card pad">
              <input type="hidden" name="friendId" value={data.person.id} />
              <ConfirmButton label="Remove friend" message={`Remove ${data.person.name} from your friends?`} />
            </form>
          ) : null}
        </div>
      </div>
    </>
  );
}
