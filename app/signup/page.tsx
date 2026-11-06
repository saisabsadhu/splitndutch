import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/Forms";
import { AuthCard } from "@/components/PublicShell";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/config";

export const metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next, "");
  if (await getCurrentUser()) redirect(next || "/dashboard");
  return (
    <AuthCard title="Split smarter" lede="Free forever. No ads, no daily limits, no premium tier.">
      <SignupForm next={next} email={sp.email} />
      <p style={{ marginTop: 16 }}>
        Already have an account? <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>Log in</Link>
      </p>
    </AuthCard>
  );
}
