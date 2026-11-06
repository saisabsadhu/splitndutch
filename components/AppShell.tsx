"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout, notificationOpen, notificationsRead } from "@/lib/actions";
import type { NotificationItem } from "@/lib/types";
import { Avatar, GroupMark, Logo } from "./ui";

type GroupLink = { id: string; name: string; type: string };

export function AppShell({
  user,
  groups,
  unread,
  notifications,
  children,
}: {
  user: { id: string; name: string; email: string };
  groups: GroupLink[];
  unread: number;
  notifications: NotificationItem[];
  children: ReactNode;
}) {
  const path = usePathname();
  const on = (href: string, exact = false) => (exact ? path === href : path === href || path.startsWith(`${href}/`));

  return (
    <div className="shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Logo href="/dashboard" />
        <nav className="side-scroll" aria-label="Primary">
          <Link className={on("/dashboard", true) ? "nav-link active" : "nav-link"} href="/dashboard">
            Home
          </Link>
          <Link className={on("/activity", true) ? "nav-link active" : "nav-link"} href="/activity">
            Activity
          </Link>
          <Link className={on("/friends") ? "nav-link active" : "nav-link"} href="/friends">
            Friends
          </Link>
          <Link className={on("/groups", true) ? "nav-link active" : "nav-link"} href="/groups">
            Groups
          </Link>
          <div className="side-label">
            Your groups
            <Link href="/groups#new">New</Link>
          </div>
          {groups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`} className={path === `/groups/${group.id}` ? "group-link active" : "group-link"}>
              <GroupMark id={group.id} type={group.type} size={28} />
              <span>{group.name}</span>
            </Link>
          ))}
        </nav>
        <div className="side-user">
          <Avatar name={user.name} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <Link href="/account" style={{ textDecoration: "none" }}>
              <strong style={{ display: "block" }}>{user.name}</strong>
              <span className="tiny muted" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.email}
              </span>
            </Link>
          </div>
          <form action={logout}>
            <button className="btn ghost small" type="submit">
              Log out
            </button>
          </form>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <form className="search" action="/search">
            <input name="q" type="search" placeholder="Search expenses, groups, friends" aria-label="Search" />
          </form>
          <details className="bell">
            <summary aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 7H3s3 0 3-7" />
                <path d="M10 19a2 2 0 0 0 4 0" />
              </svg>
              {unread > 0 ? <span className="bell-count">{unread}</span> : null}
            </summary>
            <div className="card bell-panel">
              <div className="spread" style={{ padding: "0.35rem 0.5rem" }}>
                <strong>Notifications</strong>
                {unread > 0 ? (
                  <form action={notificationsRead}>
                    <button className="btn ghost small" type="submit">
                      Mark read
                    </button>
                  </form>
                ) : null}
              </div>
              {notifications.length === 0 ? <p className="empty">Nothing new.</p> : null}
              {notifications.map((note) => (
                <form key={note.id} action={notificationOpen}>
                  <input type="hidden" name="id" value={note.id} />
                  <button className={note.readAt ? "notif" : "notif unread"} type="submit">
                    <strong>{note.title}</strong>
                    <span className="tiny muted">{note.body}</span>
                  </button>
                </form>
              ))}
            </div>
          </details>
          <Link className="btn" href="/expenses/new">
            Add expense
          </Link>
        </header>
        <main id="main" className="content">
          {children}
        </main>
      </div>
      <nav className="tabbar" aria-label="Mobile">
        <Link className={on("/dashboard", true) ? "active" : ""} href="/dashboard">
          Home
        </Link>
        <Link className={on("/groups") ? "active" : ""} href="/groups">
          Groups
        </Link>
        <Link className={on("/friends") ? "active" : ""} href="/friends">
          Friends
        </Link>
        <Link className={on("/activity", true) ? "active" : ""} href="/activity">
          Activity
        </Link>
        <Link className={on("/account", true) ? "active" : ""} href="/account">
          Account
        </Link>
      </nav>
    </div>
  );
}
