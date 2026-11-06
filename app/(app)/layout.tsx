import type { ReactNode } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { listGroups, listNotifications, unreadCount } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const groups = listGroups(user.id).map((g) => ({ id: g.id, name: g.name, type: g.type, destination: g.destination }));
  return (
    <AppShell user={user} groups={groups} unread={unreadCount(user.id)} notifications={listNotifications(user.id)}>
      {!user.verified && !user.email.endsWith("@splitndutch.app") ? (
        <p className="banner warn">
          Confirm your email ({user.email}) so friends can find you and you can reset your password.{" "}
          <Link href="/account#verify">Resend link</Link>
        </p>
      ) : null}
      {children}
    </AppShell>
  );
}
