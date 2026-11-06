import { absoluteUrl, config } from "./config";

export type Mail = { to: string; subject: string; heading: string; lines: string[]; cta?: { label: string; href: string }; footer?: string };

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Real inboxes only: guests and deleted accounts carry placeholder addresses. */
export function isDeliverable(email: string): boolean {
  return !/@(guest|deleted)\.invalid$/i.test(email);
}

export function renderMail(mail: Mail): { html: string; text: string } {
  const href = mail.cta ? (mail.cta.href.startsWith("http") ? mail.cta.href : absoluteUrl(mail.cta.href)) : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f4efe6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d1a16">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffdf8;border:1px solid #e4d9c8;border-radius:18px;padding:28px">
<tr><td style="font-size:18px;font-weight:700;color:#0f6b56;padding-bottom:18px">SplitnDutch</td></tr>
<tr><td style="font-size:22px;font-weight:700;padding-bottom:12px">${esc(mail.heading)}</td></tr>
${mail.lines.map((l) => `<tr><td style="font-size:15px;line-height:1.55;padding-bottom:10px">${esc(l)}</td></tr>`).join("")}
${
  mail.cta
    ? `<tr><td style="padding:14px 0 6px"><a href="${esc(href)}" style="display:inline-block;background:#0f6b56;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:999px">${esc(mail.cta.label)}</a></td></tr>
<tr><td style="font-size:12px;color:#6f675c;padding-top:8px;word-break:break-all">Or open: ${esc(href)}</td></tr>`
    : ""
}
<tr><td style="font-size:12px;color:#6f675c;padding-top:22px;border-top:1px solid #e4d9c8;margin-top:16px">${esc(
    mail.footer ?? "You're getting this because someone uses SplitnDutch with you. Change email settings in your account.",
  )}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [mail.heading, "", ...mail.lines, ...(mail.cta ? ["", `${mail.cta.label}: ${href}`] : []), "", "— SplitnDutch"].join("\n");
  return { html, text };
}

/** Sends through Resend when RESEND_API_KEY is set, otherwise prints to the server log. Never throws. */
export async function sendMail(mail: Mail): Promise<boolean> {
  if (!isDeliverable(mail.to)) return false;
  const { html, text } = renderMail(mail);
  if (!config.resendKey) {
    console.log(`\n[email:dev] To: ${mail.to}\nSubject: ${mail.subject}\n${text}\n`);
    return true;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: config.emailFrom, to: [mail.to], subject: mail.subject, html, text, reply_to: config.contactEmail }),
    });
    if (!res.ok) {
      console.error(`[email] Resend rejected "${mail.subject}" to ${mail.to}: ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[email] Could not send "${mail.subject}" to ${mail.to}:`, err);
    return false;
  }
}

/** Fire and forget, after the current database transaction has finished. */
export function queueMail(mail: Mail) {
  setTimeout(() => void sendMail(mail), 0);
}
