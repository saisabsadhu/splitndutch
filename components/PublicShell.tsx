import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { Logo } from "./ui";

export async function PublicNav() {
  const user = await getCurrentUser();
  return (
    <nav className="nav">
      <Logo />
      <div className="nav-links hide-sm">
        <Link href="/#features">Features</Link>
        <Link href="/explore">Explore trips</Link>
        <Link href="/about">Open source</Link>
      </div>
      <div className="nav-actions">
        {user ? (
          <Link className="btn" href="/dashboard">
            Open app
          </Link>
        ) : (
          <>
            <Link className="btn ghost" href="/login">
              Log in
            </Link>
            <Link className="btn" href="/signup">
              Sign up free
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="site">
      <div>
        <Logo />
        <p className="muted tiny" style={{ marginTop: 8, maxWidth: 320 }}>
          Free, open-source bill splitting made in India for flatmates, travellers, students and couples.
        </p>
      </div>
      <div className="foot-cols">
        <div>
          <strong>Product</strong>
          <Link href="/#features">Features</Link>
          <Link href="/explore">Explore trips</Link>
          <Link href="/signup">Sign up</Link>
        </div>
        <div>
          <strong>Project</strong>
          <Link href="/about">About & open source</Link>
          <a href={config.repoUrl} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a href={`mailto:${config.contactEmail}`}>Contact</a>
        </div>
        <div>
          <strong>Legal</strong>
          <Link href="/privacy">Privacy policy</Link>
          <Link href="/terms">Terms of use</Link>
        </div>
      </div>
    </footer>
  );
}

export async function PublicPage({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  return (
    <>
      <div className="public-top">
        <PublicNav />
      </div>
      <main id="main" className={narrow ? "public-main narrow" : "public-main"}>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}

export function AuthCard({ title, lede, children }: { title: string; lede?: string; children: ReactNode }) {
  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <Logo />
        <h1>{title}</h1>
        {lede ? <p className="muted">{lede}</p> : null}
        <div style={{ height: 14 }} />
        {children}
      </div>
    </div>
  );
}
