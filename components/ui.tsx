import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { balanceLabel } from "@/lib/phrases";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="brand">
      <svg className="mark" width="28" height="28" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill="#0F6B56" />
        <path d="M18 40.5c6-9 10-14 14-14s8 5 14 14" stroke="#F6E7C1" strokeWidth="4" strokeLinecap="round" />
        <circle cx="24" cy="24" r="5" fill="#FFFDF8" />
        <circle cx="40" cy="24" r="5" fill="#F6E7C1" />
      </svg>
      Splitn<b>Dutch</b>
    </Link>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const hue = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
  return (
    <span className="avatar" style={{ width: size, height: size, background: `hsl(${hue} 32% 32%)`, fontSize: size < 32 ? 11 : 13 }} aria-hidden="true">
      {initials || "?"}
    </span>
  );
}

const TILES = ["#0f6b56", "#245c86", "#8a4b2f", "#6d4c7d", "#8a6812", "#1f5f5a"];

export function groupColor(id: string): string {
  const n = [...id].reduce((s, c) => s + c.charCodeAt(0), 0);
  return TILES[n % TILES.length];
}

export function GroupMark({ type, id, size = 42 }: { type: string; id: string; size?: number }) {
  const label = type === "trip" ? "Trip" : type === "home" ? "Home" : type === "couple" ? "Pair" : "Group";
  return (
    <span className="tile" style={{ width: size, height: size, background: groupColor(id) }} aria-hidden="true" title={label}>
      {type === "trip" ? "✈" : type === "home" ? "⌂" : type === "couple" ? "♡" : "✦"}
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
    <span>
      {lines.map((line) => (
        <span key={line.currency + line.minor} className={line.minor > 0 ? "pos" : "neg"} style={{ display: "block" }}>
          {name
            ? balanceLabel(line.minor, line.currency, name)
            : line.minor > 0
              ? `you are owed ${formatMoney(line.minor, line.currency)}`
              : `you owe ${formatMoney(-line.minor, line.currency)}`}
        </span>
      ))}
    </span>
  );
}

export function CategoryDot({ id }: { id: string }) {
  const glyph: Record<string, string> = {
    general: "•",
    food: "🍴",
    groceries: "🧺",
    rent: "⌂",
    utilities: "⚡",
    transport: "🚌",
    travel: "✈",
    entertainment: "♫",
    shopping: "👜",
    home: "🪴",
    medical: "+",
    settlement: "↔",
  };
  return <span aria-hidden="true">{glyph[id] ?? "•"}</span>;
}
