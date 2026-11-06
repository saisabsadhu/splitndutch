import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/explore", "/about", "/privacy", "/terms", "/signup", "/login"],
        disallow: ["/dashboard", "/groups", "/friends", "/expenses", "/activity", "/account", "/search", "/api/", "/join/", "/invite/", "/reset/", "/verify/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
