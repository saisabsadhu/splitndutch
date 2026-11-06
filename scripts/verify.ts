import { allocate, evalAmount, formatMoney, parseMoney } from "../lib/money";
import { upiLink, isUpiId } from "../lib/upi";
import { parseCsv } from "../lib/ledger";
import { guessCategory } from "../lib/categories";
import { DESTINATIONS, tripCountdown } from "../lib/destinations";
import { safeNext } from "../lib/config";
import { addMonths, dueOccurrences } from "../lib/dates";
import {
  buildDebts,
  expenseDeltas,
  netDebts,
  proportionalDebts,
  type ExpenseSlice,
} from "../lib/balances";

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

const equal = allocate(100, [1, 1, 1]);
assert(sum(equal) === 100 && equal[0] === 34 && equal[1] === 33 && equal[2] === 33, "equal remainder");

const half = allocate(1001, [5000, 5000]);
assert(sum(half) === 1001 && half[0] === 501 && half[1] === 500, "percent remainder");

const dinner: ExpenseSlice = {
  id: "1",
  groupId: "g",
  currency: "USD",
  payers: [{ userId: "A", minor: 60 }],
  shares: [
    { userId: "A", minor: 20 },
    { userId: "B", minor: 20 },
    { userId: "C", minor: 20 },
  ],
};
const dinnerDebts = proportionalDebts(expenseDeltas(dinner.payers, dinner.shares), "USD", "g:g:USD");
assert(dinnerDebts.length === 2, "two debtors");
assert(dinnerDebts.every((d) => d.toId === "A" && d.minor === 20), "each owes the payer 20");

const settle: ExpenseSlice = {
  id: "2",
  groupId: "g",
  currency: "USD",
  payers: [{ userId: "B", minor: 20 }],
  shares: [{ userId: "A", minor: 20 }],
};
const net = buildDebts([dinner, settle], () => false);
assert(net.length === 1 && net[0].fromId === "C" && net[0].toId === "A" && net[0].minor === 20, "settlement nets B");

const cycle = buildDebts(
  [
    {
      id: "3",
      groupId: "g",
      currency: "USD",
      payers: [{ userId: "B", minor: 5 }],
      shares: [{ userId: "A", minor: 5 }],
    },
    {
      id: "4",
      groupId: "g",
      currency: "USD",
      payers: [{ userId: "C", minor: 5 }],
      shares: [{ userId: "B", minor: 5 }],
    },
  ],
  () => true,
);
assert(cycle.length === 1 && cycle[0].fromId === "A" && cycle[0].toId === "C" && cycle[0].minor === 5, "simplify reroutes");

const raw = buildDebts(
  [
    {
      id: "3",
      groupId: "g",
      currency: "USD",
      payers: [{ userId: "B", minor: 5 }],
      shares: [{ userId: "A", minor: 5 }],
    },
    {
      id: "4",
      groupId: "g",
      currency: "USD",
      payers: [{ userId: "C", minor: 5 }],
      shares: [{ userId: "B", minor: 5 }],
    },
  ],
  () => false,
);
assert(raw.length === 2, "unsimplified keeps both edges");

const opposite = netDebts([
  { fromId: "A", toId: "B", minor: 10, currency: "USD", scope: "p:USD" },
  { fromId: "B", toId: "A", minor: 4, currency: "USD", scope: "p:USD" },
]);
assert(opposite.length === 1 && opposite[0].fromId === "A" && opposite[0].minor === 6, "pair nets");

const multi = proportionalDebts(
  expenseDeltas(
    [
      { userId: "A", minor: 50 },
      { userId: "B", minor: 50 },
    ],
    [{ userId: "C", minor: 100 }],
  ),
  "USD",
  "p:USD",
);
assert(multi.length === 2 && multi.every((d) => d.minor === 50 && d.fromId === "C"), "two payers");

assert(addMonths("2026-01-31", 1) === "2026-02-28", "month clamp");
assert(addMonths("2024-01-31", 1) === "2024-02-29", "leap clamp");
const due = dueOccurrences("2026-10-01", "weekly", "2026-10-20", new Set(["2026-10-01", "2026-10-15"]));
assert(due.join(",") === "2026-10-08", "skips posted weeks");

// ——— money, India-first ———
assert(formatMoney(12345650, "INR") === "₹1,23,456.50", "lakh grouping");
assert(formatMoney(50000, "INR") === "₹500", "whole rupees drop paise");
assert(formatMoney(-1999, "USD") === "-$19.99", "usd negative");
assert(evalAmount("120+80+45.5", "INR") === 24550, "calculator sum");
assert(evalAmount("1500/3", "INR") === 50000, "calculator divide");
assert(evalAmount("(250*4)-100", "INR") === 90000, "calculator parens");
assert(evalAmount("2*(", "INR") === null && evalAmount("abc", "INR") === null && evalAmount("5-10", "INR") === null, "calculator rejects junk");
assert(evalAmount("₹1,200", "INR") === 120000, "rupee sign and commas");
assert(parseMoney("12.345", "INR") === null, "too many decimals");

// ——— UPI ———
assert(isUpiId("ananya@okicici") && isUpiId("9876543210@ybl") && !isUpiId("not an id") && !isUpiId("a@1"), "upi validation");
const link = upiLink({ upiId: "rohan@ybl", name: "Rohan Mehta", minor: 125050, note: "SplitnDutch · Goa" });
assert(link.startsWith("upi://pay?pa=rohan%40ybl&pn=Rohan%20Mehta&am=1250.50&cu=INR"), `upi link: ${link}`);

// ——— CSV ledger ———
const rows = parseCsv('a,b,c\n1,"x, y","he said ""hi"""\n2,"line\nbreak",\n');
assert(rows.length === 3 && rows[1][1] === "x, y" && rows[1][2] === 'he said "hi"' && rows[2][1] === "line\nbreak" && rows[2][2] === "", "csv parse");

// ——— misc ———
assert(guessCategory("Swiggy dinner") === "food" && guessCategory("Ola to airport") === "transport" && guessCategory("chai") === "chai", "category guess");
assert(guessCategory("random thing") === null, "no guess");
assert(new Set(DESTINATIONS.map((d) => d.id)).size === DESTINATIONS.length, "destination ids unique");
assert(DESTINATIONS.every((d) => d.facts.length >= 2 && d.hiddenGems.length >= 2), "destinations have content");
assert(tripCountdown("2026-11-10", "2026-11-12", "2026-11-06") === "4 days to go", "countdown");
assert(tripCountdown("2026-11-05", "2026-11-08", "2026-11-06") === "Day 2 of 4", "trip day");
assert(safeNext("//evil.com") === "/dashboard" && safeNext("https://x") === "/dashboard" && safeNext("/join/abc") === "/join/abc", "safe next");

console.log("balances ok");
