import Link from "next/link";
import { ForgotForm } from "@/components/Forms";
import { AuthCard } from "@/components/PublicShell";

export const metadata = { title: "Forgot password" };

export default function ForgotPage() {
  return (
    <AuthCard title="Forgot your password?" lede="Enter your email and we'll send you a link to choose a new one. Invited but never signed up? Same form.">
      <ForgotForm />
      <p style={{ marginTop: 16 }}>
        Remembered it? <Link href="/login">Log in</Link>
      </p>
    </AuthCard>
  );
}
