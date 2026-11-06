import Link from "next/link";
import { PublicPage } from "@/components/PublicShell";
import { config } from "@/lib/config";

export const metadata = { title: "About & open source" };

export default function AboutPage() {
  return (
    <PublicPage narrow>
      <article className="prose">
        <p className="kicker">About</p>
        <h1>Made in India, open to everyone.</h1>
        <p className="lede">
          SplitnDutch started from a simple annoyance: splitting the Sikkim trip, the flat's rent and the office chai shouldn't need a paid plan,
          a spreadsheet, or an app that doesn't know what UPI is.
        </p>

        <h2>What we believe</h2>
        <ul>
          <li>
            <strong>Money between friends should be free to track.</strong> No ads, no daily limits, no “Pro”.
          </li>
          <li>
            <strong>Settling up should take one tap.</strong> India has UPI, so we use it.
          </li>
          <li>
            <strong>Your data is yours.</strong> Export it, delete it, or run the whole thing yourself.
          </li>
        </ul>

        <h2>Open source</h2>
        <p>
          The complete source code (app, database schema, destination guides) is on{" "}
          <a href={config.repoUrl} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>{" "}
          under the MIT License. Bug reports, new destinations and translations are very welcome.
        </p>

        <h2>Run your own copy</h2>
        <p>You need Node.js 20 or newer. Then:</p>
        <pre>
          <code>{`git clone ${config.repoUrl}
cd splitndutch
npm install
cp .env.example .env.local   # add your Resend key and URL
npm run build && npm start`}</code>
        </pre>
        <p>
          Everything lives in one SQLite file (<code>data/splitndutch.db</code>). <code>npm run ledger -- push</code> mirrors it as CSV sheets to
          a private Git repo for backups.
        </p>

        <h2>Built with</h2>
        <p>Next.js, React, SQLite (better-sqlite3), Resend for email, and a lot of chai.</p>

        <p style={{ marginTop: 28 }}>
          <Link className="btn" href="/signup">
            Start splitting
          </Link>
        </p>
      </article>
    </PublicPage>
  );
}
