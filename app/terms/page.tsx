import { PublicPage } from "@/components/PublicShell";
import { config } from "@/lib/config";

export const metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <PublicPage narrow>
      <article className="prose">
        <p className="kicker">Last updated 6 November 2026</p>
        <h1>Terms of use</h1>
        <p className="lede">The plain-language rules for using SplitnDutch.</p>

        <h2>1. What SplitnDutch is</h2>
        <p>
          A free tool for recording shared expenses and working out who owes whom. It is <strong>not</strong> a bank, wallet, payment
          aggregator or lender. We never hold, move or guarantee money. UPI links simply open your own bank or UPI app, and the payment happens
          entirely between you and the other person's bank.
        </p>

        <h2>2. Your account</h2>
        <ul>
          <li>You must be 18 or older, or have a parent or guardian's permission.</li>
          <li>Give your real email and keep your password private. You're responsible for activity on your account.</li>
          <li>Only add people who know you and would expect to split costs with you. Don't use invites or reminders to spam or harass.</li>
        </ul>

        <h2>3. Balances are a record, not a legal claim</h2>
        <p>
          Balances are calculated from what group members enter. Anyone in a group can add or edit its expenses. We don't verify that an
          expense happened or that a payment was made. Disagreements are between the people involved. Use comments to sort them out.
        </p>

        <h2>4. Acceptable use</h2>
        <p>Don't use SplitnDutch for anything illegal, to store others' data without reason, to attack or overload the service, or to impersonate anyone.</p>

        <h2>5. Free and open source</h2>
        <p>
          The service is free. The source code is published under the MIT License at{" "}
          <a href={config.repoUrl} target="_blank" rel="noopener noreferrer">
            {config.repoUrl.replace("https://", "")}
          </a>
          . You may run your own copy, and these terms don't apply to copies run by others.
        </p>

        <h2>6. Availability and liability</h2>
        <p>
          We work hard to keep SplitnDutch running and your data safe, but the service is provided “as is”, without warranties. To the extent
          permitted by law, we aren't liable for indirect losses, or for disputes over money between users. Export your data regularly if it
          matters to you.
        </p>

        <h2>7. Travel information</h2>
        <p>
          Destination facts and tips are for inspiration. Permits, fees, visas and conditions change. Always confirm with official sources
          before travelling.
        </p>

        <h2>8. Ending things</h2>
        <p>
          You can delete your account at any time from Account settings. We may suspend accounts that break these terms. These terms are
          governed by the laws of India.
        </p>

        <h2>9. Contact</h2>
        <p>
          <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>
        </p>
      </article>
    </PublicPage>
  );
}
