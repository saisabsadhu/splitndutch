export type Currency = {
  code: string;
  symbol: string;
  decimals: number;
  name: string;
  locale: string;
};

/** INR first, then the places Indians travel and live most. */
export const CURRENCIES: Currency[] = [
  { code: "INR", symbol: "₹", decimals: 2, name: "Indian Rupee", locale: "en-IN" },
  { code: "USD", symbol: "$", decimals: 2, name: "US Dollar", locale: "en-US" },
  { code: "EUR", symbol: "€", decimals: 2, name: "Euro", locale: "en-IE" },
  { code: "GBP", symbol: "£", decimals: 2, name: "British Pound", locale: "en-GB" },
  { code: "AED", symbol: "AED ", decimals: 2, name: "UAE Dirham", locale: "en-US" },
  { code: "THB", symbol: "฿", decimals: 2, name: "Thai Baht", locale: "en-US" },
  { code: "SGD", symbol: "S$", decimals: 2, name: "Singapore Dollar", locale: "en-US" },
  { code: "MYR", symbol: "RM ", decimals: 2, name: "Malaysian Ringgit", locale: "en-US" },
  { code: "IDR", symbol: "Rp ", decimals: 0, name: "Indonesian Rupiah", locale: "en-US" },
  { code: "VND", symbol: "₫", decimals: 0, name: "Vietnamese Dong", locale: "en-US" },
  { code: "LKR", symbol: "LKR ", decimals: 2, name: "Sri Lankan Rupee", locale: "en-US" },
  { code: "NPR", symbol: "NPR ", decimals: 2, name: "Nepalese Rupee", locale: "en-IN" },
  { code: "BTN", symbol: "Nu. ", decimals: 2, name: "Bhutanese Ngultrum", locale: "en-IN" },
  { code: "BDT", symbol: "৳", decimals: 2, name: "Bangladeshi Taka", locale: "en-IN" },
  { code: "MVR", symbol: "MVR ", decimals: 2, name: "Maldivian Rufiyaa", locale: "en-US" },
  { code: "SAR", symbol: "SAR ", decimals: 2, name: "Saudi Riyal", locale: "en-US" },
  { code: "QAR", symbol: "QAR ", decimals: 2, name: "Qatari Riyal", locale: "en-US" },
  { code: "JPY", symbol: "¥", decimals: 0, name: "Japanese Yen", locale: "en-US" },
  { code: "AUD", symbol: "A$", decimals: 2, name: "Australian Dollar", locale: "en-US" },
  { code: "CAD", symbol: "CA$", decimals: 2, name: "Canadian Dollar", locale: "en-US" },
  { code: "NZD", symbol: "NZ$", decimals: 2, name: "New Zealand Dollar", locale: "en-US" },
  { code: "CHF", symbol: "CHF ", decimals: 2, name: "Swiss Franc", locale: "en-US" },
  { code: "HKD", symbol: "HK$", decimals: 2, name: "Hong Kong Dollar", locale: "en-US" },
];

export const DEFAULT_CURRENCY = "INR";

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
  const rem = total - floors.reduce((a, b) => a + b, 0);
  const order = weights
    .map((w, i) => ({ i, frac: (total * w) % sum }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; k < rem; k++) floors[order[k].i] += 1;
  return floors;
}

/**
 * ₹1,23,456.50 for rupees (lakh grouping), $123,456.50 elsewhere.
 * Whole amounts drop the decimals: ₹500 rather than ₹500.00.
 */
export function formatMoney(minor: number, currency: string, opts: { exact?: boolean } = {}): string {
  const c = getCurrency(currency);
  const neg = minor < 0;
  const factor = 10 ** c.decimals;
  const abs = Math.abs(minor);
  const whole = abs % factor === 0;
  const digits = whole && !opts.exact ? 0 : c.decimals;
  const formatted = (abs / factor).toLocaleString(c.locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${neg ? "-" : ""}${c.symbol}${formatted}`;
}

export function parseMoney(input: string, currency: string): number | null {
  const c = getCurrency(currency);
  const cleaned = input.trim().replace(/[,\s₹]/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  const factor = 10 ** c.decimals;
  const minor = Math.round(n * factor);
  if (Math.abs(n * factor - minor) > 1e-6) return null;
  return minor;
}

/**
 * Calculator-style amounts: "120+80+45.5", "1500/3", "(250*4)-100".
 * Returns minor units rounded to the currency, or null for anything else.
 */
export function evalAmount(input: string, currency: string): number | null {
  const src = input.replace(/[,\s₹]/g, "").replace(/×/g, "*").replace(/÷/g, "/");
  if (!src) return null;
  if (/^\d+(\.\d+)?$/.test(src)) return parseMoney(src, currency);
  if (!/^[\d.+\-*/()]+$/.test(src)) return null;
  let pos = 0;
  const peek = () => src[pos];
  function expr(): number {
    let v = term();
    while (peek() === "+" || peek() === "-") {
      const op = src[pos++];
      const r = term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  function term(): number {
    let v = factor();
    while (peek() === "*" || peek() === "/") {
      const op = src[pos++];
      const r = factor();
      v = op === "*" ? v * r : v / r;
    }
    return v;
  }
  function factor(): number {
    if (peek() === "(") {
      pos++;
      const v = expr();
      if (peek() !== ")") throw new Error("paren");
      pos++;
      return v;
    }
    if (peek() === "-") {
      pos++;
      return -factor();
    }
    const m = /^\d+(\.\d+)?/.exec(src.slice(pos));
    if (!m) throw new Error("num");
    pos += m[0].length;
    return Number(m[0]);
  }
  try {
    const v = expr();
    if (pos !== src.length || !Number.isFinite(v) || v < 0) return null;
    return Math.round(v * 10 ** getCurrency(currency).decimals);
  } catch {
    return null;
  }
}

export function moneyToInput(minor: number, currency: string): string {
  const c = getCurrency(currency);
  const factor = 10 ** c.decimals;
  return (minor / factor).toFixed(c.decimals);
}
