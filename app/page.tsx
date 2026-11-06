import Link from "next/link";
import { PublicNav, SiteFooter } from "@/components/PublicShell";
import { Flash } from "@/components/ui";
import { loginDemo } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { DESTINATIONS, getDestination } from "@/lib/destinations";

const FEATURES: [string, string, string][] = [
  ["⚡", "Settle by UPI in one tap", "See “You owe Rohan ₹1,250”, tap Pay, and GPay, PhonePe or Paytm opens with the amount filled in. On a laptop, scan the QR. Then one tap records it."],
  ["👥", "Friends don't need the app", "Add people by email and they get an invite, or just by name (“Bunty”) and add their email later. Their balance follows them."],
  ["💬", "Built for WhatsApp", "Share a group invite link in your WhatsApp group. Send polite payment nudges in one tap. No awkward texts."],
  ["🧳", "Trip mode", "Pick from 30+ destinations, from Sikkim and Spiti to Ziro and Bali. Get the local currency, trip countdown, budget tracker, travel facts and lesser-known places nearby."],
  ["🧮", "Type maths, not numbers", "Enter 450+320+90 or 2400/3 right in the amount box. The category fills itself: “Swiggy” is food, “Ola” is transport."],
  ["₹", "Rupees the Indian way", "₹1,23,456, not ₹123,456. IST dates. Categories like Chai & snacks, Maid & cook, Rent & PG, Wi-Fi & recharge."],
  ["🔁", "Rent and bills that repeat", "Rent, the cook, the Wi-Fi: set them monthly or weekly, and they wait for one-tap posting."],
  ["⚖️", "Every kind of split", "Equally, exact amounts, percentages or shares. Several people can pay. Simplify debts so the whole group settles in the fewest payments."],
  ["🔓", "Free and open source", "No ads, no daily expense limits, no premium tier. The code is public. Self-host it on your own machine if you like."],
];

const COMPARE: [string, string, string][] = [
  ["Unlimited expenses, free", "✓", "Often limited on free plans"],
  ["No ads", "✓", "Ads on free plans"],
  ["Pay by UPI link and QR", "✓", "Rare"],
  ["Add friends with just a name", "✓", "Usually needs an email"],
  ["Group invite link for WhatsApp", "✓", "Sometimes"],
  ["Trip destinations, budget and countdown", "✓", "✗"],
  ["Calculator in the amount box", "✓", "Often paid"],
  ["Lakh/crore formatting and IST", "✓", "✗"],
  ["Open source and self-hostable", "✓", "✗"],
  ["Export and delete all your data", "✓", "Varies"],
];

const USES: [string, string, string][] = [
  ["🏠", "Flatmates & PGs", "Rent, BESCOM, cook didi, Blinkit runs. Repeating bills post themselves."],
  ["🧳", "Trips", "Innova, homestays, momos. Multiple payers, any currency, and settle on the last night."],
  ["🎓", "Hostel & college", "Mess extras, Xerox, canteen tabs. Add friends by name, no email needed."],
  ["💞", "Couples", "Dates, groceries, trips. Split 50/50 or 60/40, and see the totals."],
  ["💼", "Office & teams", "Chai rounds, birthday cakes, team lunches."],
  ["🎉", "Weddings & events", "Sangeet outfits, gifts, travel for the baraat."],
];

export default async function HomePage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const featured = ["sikkim", "spiti", "meghalaya", "goa", "hampi", "arunachal", "andaman", "bhutan"]
    .map((id) => getDestination(id))
    .filter((d) => d !== null);
  return (
    <>
      <header className="hero">
        <PublicNav />
        <Flash notice={sp.notice} />
        <div className="hero-grid">
          <div>
            <p className="kicker">Free · open source · made for India</p>
            <h1>
              Split bills.
              <br />
              <span className="accent">Pay by UPI.</span>
              <br />
              Stay friends.
            </h1>
            <p className="lede">
              SplitnDutch keeps track of who paid for the rent, the Goa trip and the 40 chais in between. Then everyone settles up in one tap
              with UPI. No ads. No limits. No catch.
            </p>
            <div className="hero-actions">
              {user ? (
                <Link className="btn big" href="/dashboard">
                  Open your dashboard
                </Link>
              ) : (
                <Link className="btn big" href="/signup">
                  Start splitting free
                </Link>
              )}
              {!user && config.demoMode ? (
                <form action={loginDemo}>
                  <button className="btn ghost big" type="submit">
                    Try the demo
                  </button>
                </form>
              ) : (
                <a className="btn ghost big" href="#features">
                  See features
                </a>
              )}
            </div>
            <p className="tiny muted" style={{ marginTop: 14 }}>
              Works on any phone browser. Add to home screen for an app-like feel.
            </p>
          </div>
          <div className="phone" aria-label="Example group">
            <div className="phone-head" style={{ background: "linear-gradient(125deg,#1f4e5f,#6aa3a1)" }}>
              <span>🏔️ Sikkim road trip</span>
              <small>Day 3 of 7</small>
            </div>
            <div className="phone-body">
              <p className="kicker">You owe</p>
              <p className="big-money neg">₹4,350</p>
              <div className="mini-pay">
                <span>
                  Pay <strong>Zoya</strong>
                </span>
                <span className="btn upi small">Pay with UPI</span>
              </div>
              <div className="mini-row">
                <span>🛺 Innova for 6 days</span>
                <b>₹24,000</b>
              </div>
              <div className="mini-row">
                <span>🛏️ Lachung homestay</span>
                <b>₹9,600</b>
              </div>
              <div className="mini-row">
                <span>🍛 Momos & thukpa</span>
                <b>₹1,240</b>
              </div>
              <p className="mini-fact">💡 Sikkim was declared India's first fully organic state in 2016.</p>
            </div>
          </div>
        </div>
      </header>

      <section className="section" id="features">
        <p className="kicker">Why switch</p>
        <h2>Everything the other apps charge for, free.</h2>
        <div className="features">
          {FEATURES.map(([icon, title, body]) => (
            <article key={title} className="card feature">
              <span className="feature-icon" aria-hidden="true">
                {icon}
              </span>
              <h3>{title}</h3>
              <p className="muted">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <p className="kicker">For every kind of “who paid?”</p>
        <h2>One app for every group in your life.</h2>
        <div className="uses">
          {USES.map(([icon, title, body]) => (
            <article key={title} className="use">
              <span aria-hidden="true">{icon}</span>
              <div>
                <h3>{title}</h3>
                <p className="muted">{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="spread wrap">
          <div>
            <p className="kicker">Trip mode</p>
            <h2>Going somewhere? Your group knows the place.</h2>
          </div>
          <Link className="btn ghost" href="/explore">
            Explore all {DESTINATIONS.length} destinations →
          </Link>
        </div>
        <div className="dest-strip">
          {featured.map((d) => (
            <Link key={d.id} href={`/explore/${d.id}`} className="dest-tile" style={{ background: `linear-gradient(140deg, ${d.colors[0]}, ${d.colors[1]})` }}>
              <span className="dest-emoji">{d.emoji}</span>
              <strong>{d.name}</strong>
              <small>{d.tagline}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <p className="kicker">Honest comparison</p>
        <h2>SplitnDutch vs. typical splitting apps</h2>
        <div className="card compare-wrap">
          <table className="compare">
            <thead>
              <tr>
                <th />
                <th>SplitnDutch</th>
                <th>Typical apps</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([row, us, them]) => (
                <tr key={row}>
                  <td>{row}</td>
                  <td className="pos">{us}</td>
                  <td className="muted">{them}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <h2>Questions</h2>
        <div className="faq">
          {[
            ["Is it really free?", "Yes. It's an open-source project with no ads and no premium tier. Every feature is available to everyone."],
            ["Do my friends need to sign up?", "No. Add them by name and split right away. Add their email whenever and they'll get an invite with their balance waiting."],
            ["Does SplitnDutch handle my money?", "Never. UPI payments go directly from your bank app to your friend's. We only record that a payment happened."],
            ["What about different currencies on trips abroad?", "Each expense keeps its own currency, and balances are shown per currency so nothing gets rounded away. Trip groups pick the local currency automatically."],
            ["Where is my data stored?", "In the SplitnDutch database, with optional backups to a private Git repository. You can download all your data or delete your account at any time. See the Privacy Policy."],
            ["Can I run my own copy?", "Yes. The whole app is open source. Clone it, run it, and you own the data. See the About page."],
          ].map(([q, a]) => (
            <article className="card" key={q}>
              <h3>{q}</h3>
              <p className="muted">{a}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section cta-band">
        <h2>The next bill is coming. Be ready.</h2>
        <Link className="btn big" href={user ? "/groups#new" : "/signup"}>
          {user ? "Create a group" : "Create your free account"}
        </Link>
      </section>
      <SiteFooter />
    </>
  );
}
