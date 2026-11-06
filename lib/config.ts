/** Runtime configuration. Everything comes from environment variables so the repo holds no secrets. */

function flag(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes";
}

export const config = {
  appName: "SplitnDutch",
  /** Public URL used in emails and share links, e.g. https://splitndutch.in */
  appUrl: (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, ""),
  /** Resend API key. When unset, emails are printed to the server log instead of sent. */
  resendKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "SplitnDutch <onboarding@resend.dev>",
  contactEmail: process.env.CONTACT_EMAIL || "hello@splitndutch.app",
  /** Demo household and the one-click demo login. On by default outside production. */
  demoMode: process.env.DEMO_MODE ? flag(process.env.DEMO_MODE) : process.env.NODE_ENV !== "production",
  dataDir: process.env.DATA_DIR || "data",
  /** CSV mirror of the database, one file per table. */
  ledgerDir: process.env.LEDGER_DIR || "data/ledger-sheets",
  /** Rewrite the CSV mirror a few seconds after every change. */
  ledgerAutosync: flag(process.env.LEDGER_AUTOSYNC),
  /** After writing the CSVs, git commit and push inside LEDGER_DIR (it must be a git checkout). */
  ledgerGitPush: flag(process.env.LEDGER_GIT_PUSH),
  repoUrl: process.env.REPO_URL || "https://github.com/saisabsadhu/splitndutch",
};

export function absoluteUrl(path: string): string {
  return `${config.appUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Only allow same-site relative redirects like /join/abc, never //evil.com or https://... */
export function safeNext(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}
