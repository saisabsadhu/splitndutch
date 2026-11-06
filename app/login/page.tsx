import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/Forms";
import { AuthCard } from "@/components/PublicShell";
import { Flash } from "@/components/ui";
import { loginDemo } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { config, safeNext } from "@/lib/config";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; notice?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next, "");
  if (await getCurrentUser()) redirect(next || "/dashboard");
  return (
    <AuthCard title="Welcome back" lede="Log in to your groups, balances and trips.">
      <Flash notice={sp.notice} />
      <LoginForm next={next} />
      {config.demoMode ? (
        <form action={loginDemo}>
          <button className="btn ghost full" type="submit" style={{ marginTop: 10 }}>
            Look around the demo first
          </button>
        </form>
      ) : null}
      <p style={{ marginTop: 16 }}>
        New here? <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}>Create a free account</Link>
      </p>
    </AuthCard>
  );
}
