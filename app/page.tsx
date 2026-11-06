import Link from "next/link";
import { loginDemo } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/ui";

export default function HomePage() {
  const user = getCurrentUser();
  return (
    <>
      <header className="hero">
        <nav className="nav">
          <Logo />
          <div className="nav-actions">
            {user ? (
              <Link className="btn" href="/dashboard">
                Open dashboard
              </Link>
            ) : (
              <>
                <Link className="btn ghost" href="/login">
                  Log in
                </Link>
                <Link className="btn" href="/signup">
                  Create account
                </Link>
              </>
            )}
          </div>
        </nav>
        <div className="hero-grid">
          <div>
            <p className="kicker">Bills, without the spreadsheet</p>
            <h1>The bill, split fairly.</h1>
            <p className="lede">
              SplitnDutch is the shared ledger for apartments, trips, and the friend who always gets the check. Add what someone paid.
              See who owes whom. Settle up and keep the friendship.
            </p>
            <div className="hero-actions">
              {user ? (
                <Link className="btn" href="/expenses/new">
                  Add an expense
                </Link>
              ) : (
                <Link className="btn" href="/signup">
                  Start for free
                </Link>
              )}
              <a className="btn ghost" href="#how">
                See how it works
              </a>
            </div>
          </div>
          <div className="card demo-card">
            <div className="demo-top">
              <span>Apartment 4B</span>
              <span>November</span>
            </div>
            <div>
              <div className="kicker">You are owed</div>
              <div className="big-money pos">$186.20</div>
            </div>
            <div className="list">
              <div className="person">
                <strong>Arun</strong>
                <span />
                <span className="pos">owes you $142.00</span>
              </div>
              <div className="person">
                <strong>Lena</strong>
                <span />
                <span className="neg">you owe $40.00</span>
              </div>
              <div className="person">
                <strong>Priya</strong>
                <span />
                <span className="muted">settled up</span>
              </div>
            </div>
            {!user ? (
              <form action={loginDemo}>
                <button className="btn full" type="submit">
                  Explore the demo household
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </header>
      <section className="section" id="how">
        <h2>Three steps, then dinner is just dinner.</h2>
        <div className="steps">
          <article className="card step">
            <em>1</em>
            <h3>Add the expense</h3>
            <p className="muted">Who paid, what it was, and who was there. Equal, exact, percent, or shares. More than one person can pay.</p>
          </article>
          <article className="card step">
            <em>2</em>
            <h3>See the balance</h3>
            <p className="muted">Each group keeps its own ledger. Simplify debts when you want the shortest path to even. Leave it off when you want the original IOUs.</p>
          </article>
          <article className="card step">
            <em>3</em>
            <h3>Settle up</h3>
            <p className="muted">Record a payment when someone sends the money. The balance moves. The awkward mental math does not.</p>
          </article>
        </div>
      </section>
      <section className="section" id="features">
        <h2>Everything a shared wallet needs.</h2>
        <div className="features">
          {[
            ["Groups", "Homes, trips, couples, and the group chat that keeps going out."],
            ["Friends", "Split something with one person, outside any group."],
            ["Several currencies", "A euro dinner and a dollar rent stay in their own balances."],
            ["Repeating bills", "Rent and the cleaner come back when the next one is due. You post it."],
            ["Comments", "Leave the Wi-Fi password, or the reminder that Friday is payday."],
            ["A record you can export", "Download a group as a spreadsheet when the trip is over."],
          ].map(([title, body]) => (
            <article key={title} className="card feature">
              <h3>{title}</h3>
              <p className="muted">{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section">
        <h2>Questions</h2>
        <div className="faq">
          <article className="card">
            <h3>Is there a code to check my email?</h3>
            <p className="muted">Not in this version. Sign up with email and a password, then add friends by the address they used.</p>
          </article>
          <article className="card">
            <h3>What does simplify debts change?</h3>
            <p className="muted">Your total in a group stays the same. Simplify only changes who pays whom, so three-person loops become one payment.</p>
          </article>
          <article className="card">
            <h3>Can I try it before inviting anyone?</h3>
            <p className="muted">Yes. The demo household is Maya, her roommates, and a Lisbon weekend. Password for every demo person is demo1234.</p>
          </article>
          <article className="card">
            <h3>Do you mix currencies?</h3>
            <p className="muted">No. Ten dollars and ten euros are different debts. Settle each one in its own currency.</p>
          </article>
        </div>
      </section>
      <footer className="site">
        <span>SplitnDutch</span>
        <span>Split the bill. Keep the friend.</span>
      </footer>
    </>
  );
}
