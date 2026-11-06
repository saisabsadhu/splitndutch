import { getCategory } from "@/lib/categories";
import { formatMoney } from "@/lib/money";

export function Spending({
  rows,
  currency,
  caption,
}: {
  rows: { category: string; minor: number }[];
  currency: string;
  caption: string;
}) {
  if (rows.length === 0) return <p className="empty">Nothing in {caption.toLowerCase()} yet.</p>;
  const max = Math.max(...rows.map((r) => r.minor));
  return (
    <div className="bars">
      {rows.map((row) => (
        <div className="bar-row" key={row.category}>
          <span>{getCategory(row.category).label}</span>
          <div className="track">
            <span style={{ width: `${Math.max(4, (row.minor / max) * 100)}%` }} />
          </div>
          <span className="num">{formatMoney(row.minor, currency)}</span>
        </div>
      ))}
    </div>
  );
}
