import QRCode from "qrcode";
import { settlementSave } from "@/lib/actions";
import { formatMoney } from "@/lib/money";
import { upiLink } from "@/lib/upi";
import { todayISO } from "@/lib/dates";
import { RecordPaidButton } from "./SettleForm";

/**
 * "Pay ₹1,250 to Rohan": UPI deep link for phones, QR for paying from a laptop screen,
 * then one tap to record the payment.
 */
export async function PayPanel({
  me,
  payee,
  minor,
  groupId,
  groupName,
}: {
  me: { id: string; name: string };
  payee: { id: string; name: string; upiId?: string };
  minor: number;
  groupId: string | null;
  groupName?: string;
}) {
  const note = `SplitnDutch${groupName ? ` · ${groupName}` : ""}`;
  const link = payee.upiId ? upiLink({ upiId: payee.upiId, name: payee.name, minor, note }) : null;
  const qr = link ? await QRCode.toDataURL(link, { margin: 1, width: 220, color: { dark: "#1d1a16", light: "#ffffff" } }) : null;
  return (
    <div className="pay-panel">
      <div className="pay-head">
        <span>
          Pay <strong>{payee.name.split(" ")[0]}</strong>
        </span>
        <strong className="num">{formatMoney(minor, "INR")}</strong>
      </div>
      {link ? (
        <div className="pay-body">
          <a className="btn upi full" href={link}>
            Pay with any UPI app
          </a>
          <details className="qr">
            <summary>On a laptop? Scan the QR</summary>
            {qr ? <img src={qr} width={220} height={220} alt={`UPI QR code to pay ${payee.name}`} /> : null}
            <p className="tiny muted">UPI ID: {payee.upiId}</p>
          </details>
        </div>
      ) : (
        <p className="tiny muted">
          {payee.name.split(" ")[0]} hasn't added a UPI ID yet. Pay them however you like, then record it.
        </p>
      )}
      <RecordPaidButton
        action={settlementSave}
        fields={{
          fromId: me.id,
          toId: payee.id,
          amount: String(minor / 100),
          currency: "INR",
          groupId: groupId ?? "none",
          date: todayISO(),
          note: link ? "UPI" : "",
        }}
      />
    </div>
  );
}
