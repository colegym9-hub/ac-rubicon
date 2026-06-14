// Quick actions (Cycle command-palette pattern, simplified to phone-first chips):
// fast jumps to each surface's primary action. Server component.

import Link from "next/link";

const ACTIONS = [
  { href: "/projects", label: "Projects" },
  { href: "/today", label: "Plan today" },
  { href: "/tracking", label: "Log metric" },
  { href: "/graphs", label: "Graphs" },
];

export default function QuickActions() {
  return (
    <nav className="flex flex-wrap gap-2">
      {ACTIONS.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="rounded-full border bg-card/60 px-3.5 py-1.5 text-sm backdrop-blur-md transition-colors hover:border-primary/60 hover:text-primary"
          style={{ borderColor: "var(--glass-border)" }}
        >
          {a.label}
        </Link>
      ))}
    </nav>
  );
}
