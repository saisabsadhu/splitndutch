import { formatMoney } from "./money";

export function balanceLabel(minor: number, currency: string, name: string): string {
  if (minor === 0) return "Settled up";
  if (minor > 0) return `${name} owes you ${formatMoney(minor, currency)}`;
  return `You owe ${name} ${formatMoney(-minor, currency)}`;
}

export function selfBalance(lines: { currency: string; minor: number }[]): string {
  if (lines.length === 0) return "Settled up";
  return lines
    .map((l) => (l.minor > 0 ? `you are owed ${formatMoney(l.minor, l.currency)}` : `you owe ${formatMoney(-l.minor, l.currency)}`))
    .join(" · ");
}

export function deltaLabel(isSettlement: boolean, myDelta: number, currency: string): string {
  if (myDelta === 0) return "No change for you";
  const money = formatMoney(Math.abs(myDelta), currency);
  if (isSettlement) return myDelta > 0 ? `You paid ${money}` : `You received ${money}`;
  return myDelta > 0 ? `You get back ${money}` : `You borrowed ${money}`;
}

export function payerSummary(payers: { name: string; minor: number }[], currency: string): string {
  if (payers.length === 0) return "No payer";
  if (payers.length === 1) return `${payers[0].name} paid ${formatMoney(payers[0].minor, currency)}`;
  return payers.map((p) => `${p.name} paid ${formatMoney(p.minor, currency)}`).join(" · ");
}
