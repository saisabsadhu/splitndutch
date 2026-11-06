import Link from "next/link";
import { Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <Logo />
        <h1>That page isn’t here</h1>
        <p className="muted">The group, friend, or expense may have been removed.</p>
        <div style={{ height: 12 }} />
        <Link className="btn" href="/dashboard">
          Back home
        </Link>
      </div>
    </div>
  );
}
