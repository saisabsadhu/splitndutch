import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { listGroups, listNotifications, unreadCount } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: ReactNode }) {
  const user = requireUser();
  const groups = listGroups(user.id).map((g) => ({ id: g.id, name: g.name, type: g.type }));
  return (
    <AppShell user={user} groups={groups} unread={unreadCount(user.id)} notifications={listNotifications(user.id)}>
      {children}
    </AppShell>
  );
}
