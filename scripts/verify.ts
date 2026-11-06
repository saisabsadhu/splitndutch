import { allocate } from "../lib/money";
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

console.log("balances ok");
