import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { deltaLabel, payerSummary } from "@/lib/phrases";
import type { ActivityItem } from "@/lib/types";
import { CategoryDot } from "./ui";

export function ActivityList({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return <p className="empty">No expenses yet.</p>;
  return (
    <div className="list">
      {items.map((item) => (
        <Link key={item.id} href={`/expenses/${item.id}`} className="expense-row">
          <CategoryDot id={item.category} />
          <span>
            <strong>{item.description}</strong>
            <small>
              {formatDate(item.date)}
              {item.group ? ` · ${item.group.name}` : ""}
              {" · "}
              {payerSummary(item.payers, item.currency)}
            </small>
          </span>
          <span className="right">
            <strong className="num">{formatMoney(item.minor, item.currency)}</strong>
            <small className={item.myDelta > 0 ? "pos" : item.myDelta < 0 ? "neg" : ""}>
              {deltaLabel(item.isSettlement, item.myDelta, item.currency)}
            </small>
          </span>
        </Link>
      ))}
    </div>
  );
}
