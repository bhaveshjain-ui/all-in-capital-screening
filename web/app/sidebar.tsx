"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);

const ITEMS: { href: string; label: string; icon: ReactNode }[] = [
  { href: "/", label: "Overview", icon: icon(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>) },
  { href: "/applications", label: "Applications", icon: icon(<><path d="M4 4h16v12H4z" /><path d="M4 12h5l1.5 3h3L15 12h5" /><path d="M8 20h8" /></>) },
  { href: "/emails", label: "Emails", icon: icon(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>) },
  { href: "/evaluation", label: "Evaluation", icon: icon(<><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-8" /><path d="M22 20H2" /></>) },
  { href: "/settings", label: "Settings", icon: icon(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>) },
];

export default function Sidebar({ badges = {} }: { badges?: Record<string, number> }) {
  const path = usePathname() ?? "/";
  return (
    <aside className="sidebar">
      <Link href="/" className="logo" aria-label="All In Capital, home">
        <span className="logo-badge">A</span>
        <span className="logo-text">All In <span>Capital</span></span>
      </Link>
      <div className="sidebar-tag">Application screening · trial build</div>
      <nav className="side-nav" aria-label="Main">
        {ITEMS.map((it) => {
          const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
          return (
            <Link key={it.href} href={it.href} className={active ? "side-link active" : "side-link"} aria-current={active ? "page" : undefined}>
              {it.icon}
              {it.label}
              {badges[it.href] ? <span className="side-badge" aria-label={`${badges[it.href]} waiting`}>{badges[it.href]}</span> : null}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-foot">
        <strong>The system suggests.</strong>
        Kushal decides every outcome. Nothing is rejected or advanced automatically.
      </div>
    </aside>
  );
}
