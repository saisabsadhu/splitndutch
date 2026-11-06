import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { config } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(config.appUrl),
  title: { default: "SplitnDutch: split bills, pay by UPI", template: "%s · SplitnDutch" },
  description:
    "Free, open-source bill splitting for India. Split rent, trips and chai with friends, then settle up in one tap with UPI. No ads, no limits.",
  applicationName: "SplitnDutch",
  keywords: ["split bills", "splitwise alternative", "UPI", "expense sharing", "trip expenses", "flatmates", "India"],
  openGraph: {
    title: "SplitnDutch: split bills, pay by UPI",
    description: "Free, open-source bill splitting for flatmates, trips and friends. Settle in one tap with UPI.",
    type: "website",
    locale: "en_IN",
    siteName: "SplitnDutch",
  },
  twitter: { card: "summary", title: "SplitnDutch", description: "Split bills. Pay by UPI. Stay friends." },
  appleWebApp: { capable: true, title: "SplitnDutch", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#141311" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560;9..144,680&family=Outfit:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
