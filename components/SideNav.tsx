"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";

const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function DashIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
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
function TodayIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  );
}
function TrackIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M9 11l3 3 9-9" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
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
  { href: "/home", label: "Home", Icon: DashIcon },
  { href: "/projects", label: "Projects", Icon: BoardIcon },
  { href: "/today", label: "Today", Icon: TodayIcon },
  { href: "/tracking", label: "Track", Icon: TrackIcon },
  { href: "/brain", label: "Brain", Icon: BrainIcon },
];

export default function SideNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <nav
      className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-50 md:w-52 md:flex-col md:border-r md:backdrop-blur-xl"
      style={{
        borderColor: "var(--glass-border)",
        background: "var(--glass)",
      }}
    >
      {/* Brand → home */}
      <Link href="/home" className="block px-5 pt-8 pb-6">
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.3em] text-muted-foreground">
          AC
        </span>
        <h1 className="text-xl font-extrabold leading-tight tracking-tight">
          Rubicon
        </h1>
      </Link>

      <div
        className="mx-4 mb-4 h-px"
        style={{ background: "var(--glass-border)" }}
      />

      {/* Nav items */}
      <div className="flex flex-1 flex-col gap-1 px-3">
        {TABS.map(({ href, label, Icon }) => {
          const active =
            pathname === href ||
            (href !== "/home" && pathname.startsWith(`${href}`));
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 font-mono text-[0.65rem] uppercase tracking-[0.1em] transition-colors"
              style={{
                color: active
                  ? "var(--color-primary)"
                  : "var(--color-muted-foreground)",
                background: active ? "var(--glass-ring)" : "transparent",
              }}
            >
              <Icon />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>

      {/* Lock */}
      <div className="px-5 pb-8">
        <form action={logout}>
          <button
            type="submit"
            className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
          >
            lock
          </button>
        </form>
      </div>
    </nav>
  );
}
