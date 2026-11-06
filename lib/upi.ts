import { moneyToInput } from "./money";

/** name@bank style VPA, e.g. maya@okicici or 9876543210@ybl */
export const UPI_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,64}$/;

export function isUpiId(value: string): boolean {
  return UPI_PATTERN.test(value);
}

/**
 * Deep link understood by GPay, PhonePe, Paytm, BHIM and every bank app.
 * Opening it on a phone shows the payment screen with payee and amount filled in.
 */
export function upiLink(input: { upiId: string; name: string; minor: number; note: string }): string {
  const params = new URLSearchParams({
    pa: input.upiId,
    pn: input.name.slice(0, 40),
    am: moneyToInput(input.minor, "INR"),
    cu: "INR",
    tn: input.note.slice(0, 60),
  });
  return `upi://pay?${params.toString().replace(/\+/g, "%20")}`;
}
