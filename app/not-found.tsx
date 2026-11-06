import Link from "next/link";
import { AuthCard } from "@/components/PublicShell";

export default function NotFound() {
  return (
    <AuthCard title="That page isn't here" lede="The group, friend or expense may have been removed, or the link is mistyped.">
      <Link className="btn full" href="/dashboard">
        Back home
      </Link>
    </AuthCard>
  );
}
