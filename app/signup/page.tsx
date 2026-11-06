import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/Forms";
import { Logo } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  if (getCurrentUser()) redirect("/dashboard");
  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <Logo />
        <h1>Create your account</h1>
        <p className="muted">Use the email your friends will add you with.</p>
        <div style={{ height: 12 }} />
        <SignupForm />
        <p style={{ marginTop: 14 }}>
          Already have one? <Link href="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
