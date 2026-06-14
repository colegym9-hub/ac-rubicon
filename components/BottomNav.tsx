"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICON_PROPS = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function TodayIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  );
}
function BoardIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="10" y="4" width="5" height="11" rx="1.5" />
      <rect x="17" y="4" width="4" height="14" rx="1.5" />
    </svg>
  );
}
function InsightsIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M3 21h18" />
      <rect x="5" y="11" width="3.5" height="7" rx="1" />
      <rect x="10.25" y="6" width="3.5" height="12" rx="1" />
      <rect x="15.5" y="13" width="3.5" height="5" rx="1" />
    </svg>
  );
}
function BrainIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="6" cy="6.5" r="2.2" />
      <circle cx="18" cy="7.5" r="2.2" />
      <circle cx="9.5" cy="18" r="2.2" />
      <path d="M8.1 7.1l7.7-.6M7.7 8.5l1.3 7.2M16.2 9.4l-5.1 6.9" />
    </svg>
  );
}

const TABS = [
  { href: "/today", label: "Today", Icon: TodayIcon },
  { href: "/projects", label: "Projects", Icon: BoardIcon },
  { href: "/insights", label: "Insights", Icon: InsightsIcon },
  { href: "/brain", label: "Brain", Icon: BrainIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur-xl md:hidden"
      style={{
        borderColor: "var(--glass-border)",
        background: "var(--glass)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="mx-auto flex w-full max-w-md items-stretch justify-around px-2">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-1 py-2 font-mono text-[0.55rem] uppercase tracking-[0.1em] transition-colors"
              style={{ color: active ? "var(--color-primary)" : "var(--color-muted-foreground)" }}
            >
              <Icon />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
