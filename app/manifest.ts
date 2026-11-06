import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SplitnDutch",
    short_name: "SplitnDutch",
    description: "Split bills with friends and settle up by UPI.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f4efe6",
    theme_color: "#0f6b56",
    orientation: "portrait",
    categories: ["finance", "travel", "lifestyle"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Add expense", url: "/expenses/new" },
      { name: "Groups", url: "/groups" },
    ],
  };
}
