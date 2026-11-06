import Link from "next/link";
import { AuthCard } from "@/components/PublicShell";
import { verifyEmail } from "@/lib/mutations";

export const metadata = { title: "Confirm email" };
export const dynamic = "force-dynamic";

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = verifyEmail(token);
  return (
    <AuthCard
      title={"error" in result ? "Link expired" : "Email confirmed ✓"}
      lede={"error" in result ? "This confirmation link was already used or has expired. You can send a new one from your account page." : "Thanks! Friends can now find you by this email."}
    >
      <Link className="btn full" href="/dashboard">
        Go to SplitnDutch
      </Link>
    </AuthCard>
  );
}
