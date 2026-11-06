import Link from "next/link";
import { SetPasswordForm } from "@/components/Forms";
import { AuthCard } from "@/components/PublicShell";
import { peekToken } from "@/lib/tokens";

export const metadata = { title: "Choose a new password" };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!peekToken(token, ["reset"])) {
    return (
      <AuthCard title="This link has expired" lede="Reset links work for 2 hours and only once.">
        <Link className="btn full" href="/forgot">
          Send a new link
        </Link>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Choose a new password" lede="You'll be logged out of other devices.">
      <SetPasswordForm token={token} cta="Save password and log in" />
    </AuthCard>
  );
}
