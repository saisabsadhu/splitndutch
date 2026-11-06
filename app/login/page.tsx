import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/Forms";
import { Logo } from "@/components/ui";
import { loginDemo } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  if (getCurrentUser()) redirect("/dashboard");
  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <Logo />
        <h1>Welcome back</h1>
        <p className="muted">Log in to your groups, balances, and expenses.</p>
        <div style={{ height: 12 }} />
        <LoginForm />
        <form action={loginDemo}>
          <button className="btn ghost full" type="submit" style={{ marginTop: 8 }}>
            Explore the demo household
          </button>
        </form>
        <p className="tiny muted" style={{ marginTop: 12 }}>
          Demo people use maya@splitndutch.app and the password demo1234. Arun, Lena, Sam, Priya, and Noah use the same password with their own email.
        </p>
        <p style={{ marginTop: 14 }}>
          New here? <Link href="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
