import { PublicPage } from "@/components/PublicShell";
import { config } from "@/lib/config";

export const metadata = { title: "Privacy policy", description: "What SplitnDutch collects, why, and how to download or delete it." };

const UPDATED = "6 November 2026";

export default function PrivacyPage() {
  const mail = config.contactEmail;
  return (
    <PublicPage narrow>
      <article className="prose">
        <p className="kicker">Last updated {UPDATED}</p>
        <h1>Privacy policy</h1>
        <p className="lede">
          Short version: we collect only what's needed to split expenses, we don't sell or advertise with it, and you can download or delete it
          whenever you want.
        </p>

        <h2>Who we are</h2>
        <p>
          SplitnDutch (“we”) is an open-source expense-splitting service operated at {config.appUrl}. For this policy we are the Data
          Fiduciary under India's Digital Personal Data Protection Act, 2023 (DPDP Act). Questions or requests:{" "}
          <a href={`mailto:${mail}`}>{mail}</a>.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account details:</strong> your name, email, a one-way hashed password (bcrypt; we can't see it), your home currency and
            email preferences.
          </li>
          <li>
            <strong>UPI ID (optional):</strong> only if you add it, so friends you share expenses with can pay you. It's shown only to people in
            your groups and friends list.
          </li>
          <li>
            <strong>What you and your friends record:</strong> expenses, amounts, dates, notes, comments, groups, trip dates and destinations,
            and payments marked as settled.
          </li>
          <li>
            <strong>People you add:</strong> when you add someone by email or name, we store that name and email so the balance can be tracked
            and an invite sent. Only add people who'd reasonably expect it.
          </li>
          <li>
            <strong>Technical data:</strong> a single login cookie, and your IP address, kept briefly in memory to rate-limit login and invite
            attempts. We don't use analytics, advertising or tracking cookies.
          </li>
        </ul>

        <h2>What we never do</h2>
        <ul>
          <li>We never touch your money. UPI payments go directly between banks. We only record that you marked something as paid.</li>
          <li>We don't sell, rent or share your data for advertising.</li>
          <li>We don't read your contacts, SMS or bank statements.</li>
        </ul>

        <h2>Why we use it (purpose)</h2>
        <p>
          To run the service you sign up for: calculate balances, show them to the people you share them with, send the emails you asked for
          (invites, reminders, password resets, and notifications you chose), keep the service secure, and keep backups. That is the purpose
          you consent to when you create an account.
        </p>

        <h2>Who can see what</h2>
        <p>
          Group expenses are visible to everyone in that group. One-to-one expenses are visible to the people on them. Your name, email and UPI
          ID are visible to people you share a group or friendship with. Anyone holding a group's invite link can see the group name and
          members' first names before joining. Reset the link from the group page any time.
        </p>

        <h2>Service providers</h2>
        <ul>
          <li>
            <strong>Email delivery:</strong> Resend (resend.com) sends our emails. It receives the recipient address and the email content.
          </li>
          <li>
            <strong>Fonts:</strong> pages load fonts from Google Fonts, which receives your IP address and browser details.
          </li>
          <li>
            <strong>Backups:</strong> the database may be mirrored as CSV files to a private GitHub repository controlled by the operator.
            Session tokens and one-time links are never included. Password hashes are, so accounts can be restored.
          </li>
        </ul>

        <h2>How long we keep it</h2>
        <p>
          As long as your account exists. One-time links expire within 2 hours (password reset) to 30 days (invites). If you delete your
          account, we erase your name, email, UPI ID, password, notifications and friendships right away. Shared expenses stay in your friends'
          history as “Deleted user” so their balances still add up. They hold no personal data about you. Backups roll over as new snapshots
          are taken.
        </p>

        <h2>Your rights</h2>
        <p>Under the DPDP Act you can:</p>
        <ul>
          <li>
            <strong>Access:</strong> download everything from <em>Account → Download my data</em>.
          </li>
          <li>
            <strong>Correct:</strong> edit your profile, and edit or delete expenses you're part of.
          </li>
          <li>
            <strong>Erase:</strong> <em>Account → Delete account</em>.
          </li>
          <li>
            <strong>Withdraw consent:</strong> delete your account, or set emails to “Nothing”.
          </li>
          <li>
            <strong>Nominate</strong> someone to exercise these rights on your behalf, and <strong>raise grievances</strong>, by writing to the
            grievance contact below.
          </li>
        </ul>

        <h2>Grievances</h2>
        <p>
          Write to <a href={`mailto:${mail}`}>{mail}</a> with the subject “Grievance”. We'll acknowledge within 48 hours and resolve within 30
          days. If you're not satisfied, you may approach the Data Protection Board of India.
        </p>

        <h2>Children</h2>
        <p>
          SplitnDutch is meant for people aged 18 and over. Under-18s need a parent or guardian's consent. We don't knowingly process children's
          data for tracking or advertising.
        </p>

        <h2>Security</h2>
        <p>
          Passwords are hashed with bcrypt. One-time links are stored only as SHA-256 hashes. Login cookies are HTTP-only. Login and invites
          are rate-limited. No system is perfectly secure. If we learn of a breach affecting you, we'll tell you and the Data Protection Board
          as the law requires.
        </p>

        <h2>Self-hosted copies</h2>
        <p>
          SplitnDutch is open source. If you use a copy run by someone else, that person is responsible for your data. This policy covers only{" "}
          {config.appUrl}.
        </p>

        <h2>Changes</h2>
        <p>If we change this policy in a way that matters, we'll update the date above and tell active users by email.</p>
      </article>
    </PublicPage>
  );
}
