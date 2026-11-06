import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/config";
import { DESTINATIONS } from "@/lib/destinations";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/explore", "/about", "/privacy", "/terms", "/signup"];
  return [
    ...pages.map((p) => ({ url: absoluteUrl(p), changeFrequency: "monthly" as const, priority: p === "/" ? 1 : 0.6 })),
    ...DESTINATIONS.map((d) => ({ url: absoluteUrl(`/explore/${d.id}`), changeFrequency: "yearly" as const, priority: 0.5 })),
  ];
}
