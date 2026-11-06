import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicPage } from "@/components/PublicShell";
import { DESTINATIONS, VIBES, checklistFor, getDestination } from "@/lib/destinations";
import { getCurrency } from "@/lib/money";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const d = getDestination((await params).id);
  if (!d) return { title: "Destination" };
  return { title: `${d.name} trip guide`, description: `${d.tagline} Facts, lesser-known places and tips for ${d.name}. Split the trip on SplitnDutch.` };
}

export default async function DestinationPage({ params }: { params: Promise<{ id: string }> }) {
  const d = getDestination((await params).id);
  if (!d) notFound();
  const related = DESTINATIONS.filter((x) => x.id !== d.id && (x.vibe === d.vibe || x.region === d.region)).slice(0, 4);
  return (
    <PublicPage>
      <header className="dest-hero" style={{ background: `linear-gradient(130deg, ${d.colors[0]}, ${d.colors[1]})` }}>
        <span className="dest-emoji big">{d.emoji}</span>
        <p className="kicker">
          {d.region} · {VIBES[d.vibe]} · {d.country === "India" ? "India" : getCurrency(d.currency).name}
        </p>
        <h1>{d.name}</h1>
        <p className="lede">{d.tagline}</p>
        <div className="row wrap" style={{ marginTop: 14 }}>
          <Link className="btn light" href={`/groups?destination=${d.id}#new`}>
            Start a {d.name} trip group
          </Link>
          <span className="pill">Best time: {d.bestMonths}</span>
          {d.currency !== "INR" ? <span className="pill">Currency: {d.currency}</span> : null}
        </div>
      </header>
      <div className="dest-cols">
        <section className="card pad">
          <h2>Did you know?</h2>
          <ul className="facts">
            {d.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
        <section className="card pad">
          <h2>Lesser-known places</h2>
          <ul className="gems">
            {d.hiddenGems.map((g) => (
              <li key={g.name}>
                <strong>{g.name}</strong>
                <span className="muted">{g.note}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card pad">
          <h2>Know before you go</h2>
          <ul className="gems">
            {d.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="tiny muted" style={{ marginTop: 10 }}>
            Permits, fees and visa rules change. Confirm with official sources before you travel.
          </p>
        </section>
        <section className="card pad">
          <h2>Pack</h2>
          <ul className="checklist">
            {checklistFor(d).map((c) => (
              <li key={c}>
                <label>
                  <input type="checkbox" className="check" /> {c}
                </label>
              </li>
            ))}
          </ul>
        </section>
      </div>
      {related.length ? (
        <section style={{ marginTop: 24 }}>
          <h2>You might also like</h2>
          <div className="dest-strip" style={{ marginTop: 10 }}>
            {related.map((r) => (
              <Link key={r.id} href={`/explore/${r.id}`} className="dest-tile" style={{ background: `linear-gradient(140deg, ${r.colors[0]}, ${r.colors[1]})` }}>
                <span className="dest-emoji">{r.emoji}</span>
                <strong>{r.name}</strong>
                <small>{r.tagline}</small>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </PublicPage>
  );
}
