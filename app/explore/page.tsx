import Link from "next/link";
import { PublicPage } from "@/components/PublicShell";
import { DESTINATIONS, VIBES, type Vibe } from "@/lib/destinations";

export const metadata = {
  title: "Explore trips",
  description: "Travel facts, lesser-known places and packing lists for Sikkim, Spiti, Meghalaya, Goa, Hampi and more. Then split the trip.",
};

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ vibe?: string; where?: string }> }) {
  const sp = await searchParams;
  const vibe = sp.vibe && sp.vibe in VIBES ? (sp.vibe as Vibe) : null;
  const where = sp.where === "abroad" ? "Abroad" : sp.where === "india" ? "India" : null;
  const list = DESTINATIONS.filter((d) => (!vibe || d.vibe === vibe) && (!where || d.country === where));
  const chip = (label: string, params: Record<string, string>, on: boolean) => {
    const q = new URLSearchParams(params).toString();
    return (
      <Link key={label} className={on ? "chip on" : "chip"} href={q ? `/explore?${q}` : "/explore"}>
        {label}
      </Link>
    );
  };
  return (
    <PublicPage>
      <div className="page-head">
        <div>
          <p className="kicker">Explore</p>
          <h1>Where's the group going?</h1>
          <p className="lede">
            Facts you'll want to share in the car, lesser-known places nearby, and what to check before you go. Start a trip group from any of
            them.
          </p>
        </div>
      </div>
      <div className="filters">
        {chip("Everywhere", {}, !vibe && !where)}
        {chip("🇮🇳 India", { where: "india" }, where === "India" && !vibe)}
        {chip("✈️ Abroad", { where: "abroad" }, where === "Abroad" && !vibe)}
        {(Object.keys(VIBES) as Vibe[]).map((v) => chip(VIBES[v], { vibe: v }, vibe === v))}
      </div>
      <div className="dest-grid">
        {list.map((d) => (
          <Link key={d.id} href={`/explore/${d.id}`} className="dest-tile tall" style={{ background: `linear-gradient(150deg, ${d.colors[0]}, ${d.colors[1]})` }}>
            <span className="dest-emoji">{d.emoji}</span>
            <strong>{d.name}</strong>
            <small>{d.region} · {VIBES[d.vibe]}</small>
            <small>{d.tagline}</small>
            <small className="best">Best: {d.bestMonths}</small>
          </Link>
        ))}
      </div>
      <p className="tiny muted" style={{ marginTop: 18 }}>
        Know a place that should be here? The list is open source. Add it on GitHub.
      </p>
    </PublicPage>
  );
}
