import Link from "next/link";
import { getCategory, groupTypeOf } from "@/lib/categories";
import { getDestination } from "@/lib/destinations";
import { formatMoney } from "@/lib/money";
import { balanceLabel } from "@/lib/phrases";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="SplitnDutch home">
      <svg className="mark" width="30" height="30" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="18" fill="#0F6B56" />
        <path d="M32 12v40" stroke="#F6E7C1" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 7" />
        <circle cx="21" cy="32" r="9" fill="#FFFDF8" />
        <circle cx="43" cy="32" r="9" fill="#F4A340" />
      </svg>
      <span>
        Splitn<b>Dutch</b>
      </span>
    </Link>
  );
}

export function Avatar({ name, size = 36, status }: { name: string; size?: number; status?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const hue = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
  const pending = status === "guest" || status === "invited";
  return (
    <span
      className={pending ? "avatar pending" : "avatar"}
      style={{ width: size, height: size, background: pending ? undefined : `hsl(${hue} 38% 34%)`, fontSize: size < 32 ? 11 : size > 48 ? 18 : 13 }}
      aria-hidden="true"
    >
      {initials || "?"}
    </span>
  );
}

export function StatusTag({ status }: { status?: string }) {
  if (status === "invited") return <span className="tag">invited</span>;
  if (status === "guest") return <span className="tag">no email</span>;
  return null;
}

const TILES = ["#0f6b56", "#245c86", "#8a4b2f", "#6d4c7d", "#8a6812", "#1f5f5a", "#9c2c2c"];

export function groupColor(id: string): string {
  const n = [...id].reduce((s, c) => s + c.charCodeAt(0), 0);
  return TILES[n % TILES.length];
}

export function GroupMark({ type, id, destination, size = 42 }: { type: string; id: string; destination?: string; size?: number }) {
  const dest = getDestination(destination);
  const bg = dest ? `linear-gradient(135deg, ${dest.colors[0]}, ${dest.colors[1]})` : groupColor(id);
  return (
    <span className="tile" style={{ width: size, height: size, background: bg, fontSize: size * 0.48 }} aria-hidden="true">
      {dest ? dest.emoji : groupTypeOf(type).icon}
    </span>
  );
}

export function Flash({ notice, error }: { notice?: string; error?: string }) {
  if (!notice && !error) return null;
  return (
    <p className={error ? "banner bad" : "banner good"} role="status">
      {error || notice}
    </p>
  );
}

export function BalanceText({ lines, name }: { lines: { currency: string; minor: number }[]; name?: string }) {
  if (lines.length === 0) return <span className="muted">Settled up</span>;
  return (
    <span className="balance-text">
      {lines.map((line) => (
        <span key={line.currency + line.minor} className={line.minor > 0 ? "pos" : "neg"}>
          {name
            ? balanceLabel(line.minor, line.currency, name)
            : line.minor > 0
              ? `you get ${formatMoney(line.minor, line.currency)}`
              : `you owe ${formatMoney(-line.minor, line.currency)}`}
        </span>
      ))}
    </span>
  );
}

export function CategoryDot({ id, size }: { id: string; size?: "lg" }) {
  return (
    <span className={size === "lg" ? "cat-dot lg" : "cat-dot"} aria-hidden="true">
      {getCategory(id).icon}
    </span>
  );
}

export function Empty({ title, body, children }: { title: string; body?: string; children?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {body ? <p className="muted">{body}</p> : null}
      {children}
    </div>
  );
}
