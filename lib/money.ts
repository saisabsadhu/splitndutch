export type Currency = {
  code: string;
  symbol: string;
  decimals: number;
  name: string;
};

export const CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$", decimals: 2, name: "US Dollar" },
  { code: "EUR", symbol: "€", decimals: 2, name: "Euro" },
  { code: "GBP", symbol: "£", decimals: 2, name: "British Pound" },
  { code: "INR", symbol: "₹", decimals: 2, name: "Indian Rupee" },
  { code: "CAD", symbol: "CA$", decimals: 2, name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", decimals: 2, name: "Australian Dollar" },
  { code: "JPY", symbol: "¥", decimals: 0, name: "Japanese Yen" },
  { code: "CHF", symbol: "CHF ", decimals: 2, name: "Swiss Franc" },
  { code: "SGD", symbol: "S$", decimals: 2, name: "Singapore Dollar" },
  { code: "AED", symbol: "AED ", decimals: 2, name: "UAE Dirham" },
  { code: "NPR", symbol: "Rs ", decimals: 2, name: "Nepalese Rupee" },
];

const byCode = new Map(CURRENCIES.map((c) => [c.code, c]));

export function getCurrency(code: string): Currency {
  return byCode.get(code) ?? CURRENCIES[0];
}

export function isCurrency(code: string): boolean {
  return byCode.has(code);
}

/** Split `total` minor units by integer weights. Remainders go to the largest fractional parts. */
export function allocate(total: number, weights: number[]): number[] {
  if (!Number.isInteger(total) || total < 0) throw new Error("Amount must be a whole number of minor units.");
  if (weights.length === 0) throw new Error("Choose at least one person.");
  if (weights.some((w) => !Number.isInteger(w) || w < 0)) throw new Error("Shares must be whole numbers.");
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) throw new Error("Shares must add up to more than zero.");
  const floors = weights.map((w) => Math.floor((total * w) / sum));
  let rem = total - floors.reduce((a, b) => a + b, 0);
  const order = weights
    .map((w, i) => ({ i, frac: (total * w) % sum }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; k < rem; k++) floors[order[k].i] += 1;
  return floors;
}

export function formatMoney(minor: number, currency: string): string {
  const c = getCurrency(currency);
  const neg = minor < 0;
  const factor = 10 ** c.decimals;
  const value = Math.abs(minor) / factor;
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: c.decimals,
    maximumFractionDigits: c.decimals,
  });
  return `${neg ? "-" : ""}${c.symbol}${formatted}`;
}

export function parseMoney(input: string, currency: string): number | null {
  const c = getCurrency(currency);
  const cleaned = input.trim().replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  const factor = 10 ** c.decimals;
  const minor = Math.round(n * factor);
  if (Math.abs(n * factor - minor) > 1e-6) return null;
  return minor;
}

export function moneyToInput(minor: number, currency: string): string {
  const c = getCurrency(currency);
  const factor = 10 ** c.decimals;
  return (minor / factor).toFixed(c.decimals);
}
