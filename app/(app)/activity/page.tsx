import Link from "next/link";
import { ActivityList } from "@/components/ActivityList";
import { requireUser } from "@/lib/auth";
import { formatMonth } from "@/lib/dates";
import { activityList } from "@/lib/queries";

export const metadata = { title: "Activity" };

export default async function ActivityPage({ searchParams: spPromise }: { searchParams: Promise<{ kind?: string; month?: string }> }) {
  const searchParams = await spPromise;
  const user = await requireUser();
  const kind = searchParams.kind === "settlement" || searchParams.kind === "expense" ? searchParams.kind : "all";
  const month = searchParams.month ?? "";
  const data = activityList(user.id, kind, month);
  const chip = (value: string, label: string) => {
    const params = new URLSearchParams();
    if (value !== "all") params.set("kind", value);
    if (month) params.set("month", month);
    const href = params.toString() ? `/activity?${params}` : "/activity";
    return (
      <Link key={value} href={href} className={kind === value ? "chip on" : "chip"}>
        {label}
      </Link>
    );
  };
  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">Everything that moved money</p>
          <h1>Activity</h1>
        </div>
      </div>
      <div className="filters">
        {chip("all", "All")}
        {chip("expense", "Expenses")}
        {chip("settlement", "Payments")}
        <form action="/activity">
          {kind !== "all" ? <input type="hidden" name="kind" value={kind} /> : null}
          <select name="month" defaultValue={month} aria-label="Month" onChange={undefined}>
            <option value="">All months</option>
            {data.months.map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
              </option>
            ))}
          </select>
          <button className="btn small ghost" type="submit" style={{ marginLeft: 8 }}>
            Filter
          </button>
        </form>
      </div>
      <section className="card pad">
        <ActivityList items={data.items} />
      </section>
    </>
  );
}
