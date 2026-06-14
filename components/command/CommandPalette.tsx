"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { createTask } from "@/app/projects/actions";
import { logout } from "@/app/login/actions";
import { getCommandIndex, type SearchItem } from "@/app/command/actions";

type Action = {
  id: string;
  label: string;
  hint?: string;
  section: string;
  run: () => void;
};

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/today", label: "Today" },
  { href: "/tracking", label: "Tracking" },
  { href: "/graphs", label: "Graphs" },
];

const SECTION_FOR = { project: "Projects", task: "Tasks", metric: "Metrics" } as const;

export default function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchItem[] | null>(null);
  const [sel, setSel] = useState(0);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  // Global ⌘K / Ctrl+K toggle.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // On open: load the index once, reset selection, focus the input.
  useEffect(() => {
    if (!open) return;
    setSel(0);
    if (index == null) getCommandIndex().then(setIndex).catch(() => setIndex([]));
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open, index]);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  const actions = useMemo<Action[]>(() => {
    const q = query.trim().toLowerCase();
    const match = (s: string) => !q || s.toLowerCase().includes(q);
    const out: Action[] = [];

    if (q) {
      const title = query.trim();
      out.push({
        id: "create-task",
        label: `Create task “${title}”`,
        hint: "↵ inbox",
        section: "Create",
        run: () =>
          start(async () => {
            await createTask({ title });
            close();
            router.refresh();
          }),
      });
    }

    // Up to 8 matching items, grouped by type so section headers stay contiguous.
    const order = { project: 0, task: 1, metric: 2 } as const;
    const results = (index ?? [])
      .filter((it) => match(it.label))
      .slice(0, 8)
      .sort((a, b) => order[a.type] - order[b.type]);
    for (const it of results) {
      out.push({
        id: `${it.type}-${it.id}`,
        label: it.label,
        hint: it.sub,
        section: SECTION_FOR[it.type],
        run: () => go(it.href),
      });
    }

    const commands: Action[] = [
      { id: "cmd-today", label: "Plan today", hint: "go", section: "Commands", run: () => go("/today") },
      { id: "cmd-metric", label: "Log a metric", hint: "go", section: "Commands", run: () => go("/tracking") },
      { id: "cmd-project", label: "New project", hint: "go", section: "Commands", run: () => go("/projects") },
    ];
    for (const c of commands) if (match(c.label)) out.push(c);

    for (const n of NAV) {
      if (match(n.label) || match(`go to ${n.label}`)) {
        out.push({ id: `nav-${n.href}`, label: `Go to ${n.label}`, hint: n.href, section: "Go to", run: () => go(n.href) });
      }
    }

    if (match("lock") || match("sign out")) {
      out.push({
        id: "lock",
        label: "Lock",
        hint: "sign out",
        section: "Account",
        run: () => {
          close();
          start(async () => {
            await logout();
          });
        },
      });
    }
    return out;
  }, [query, index, go, close, router]);

  // Keep selection in range and scrolled into view.
  useEffect(() => {
    setSel((s) => Math.min(s, Math.max(0, actions.length - 1)));
  }, [actions.length]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, actions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      actions[sel]?.run();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  return (
    <>
      {pathname !== "/login" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search and commands (Ctrl K)"
          className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border backdrop-blur-xl transition-colors hover:border-primary/60"
          style={{ borderColor: "var(--glass-border)", background: "var(--glass)" }}
        >
          <SearchIcon />
        </button>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]"
          style={{ background: "oklch(0 0 0 / 0.6)" }}
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius)] border shadow-2xl backdrop-blur-xl"
            style={{ borderColor: "var(--glass-border)", background: "var(--pill-bg)" }}
          >
            <div className="flex items-center gap-2 border-b px-4" style={{ borderColor: "var(--glass-border)" }}>
              <SearchIcon />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search or type a command…"
                className="w-full bg-transparent py-4 text-base outline-none placeholder:text-muted-foreground"
                aria-label="Search or type a command"
              />
              <kbd className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">esc</kbd>
            </div>

            <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
              {actions.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matches.</p>
              ) : (
                actions.map((a, i) => {
                  const header = i === 0 || actions[i - 1].section !== a.section ? a.section : null;
                  return (
                    <div key={a.id}>
                      {header ? (
                        <div className="px-3 pb-1 pt-3 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-muted-foreground">
                          {header}
                        </div>
                      ) : null}
                      <button
                        type="button"
                        data-idx={i}
                        onMouseEnter={() => setSel(i)}
                        onClick={a.run}
                        className="flex w-full items-center justify-between gap-3 rounded-[var(--radius)] px-3 py-2.5 text-left text-sm transition-colors"
                        style={{
                          background:
                            i === sel ? "color-mix(in oklch, var(--color-primary) 18%, transparent)" : "transparent",
                        }}
                      >
                        <span className="truncate">{a.label}</span>
                        {a.hint ? (
                          <span className="shrink-0 font-mono text-[0.55rem] uppercase tracking-[0.15em] text-muted-foreground">
                            {a.hint}
                          </span>
                        ) : null}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div
              className="flex items-center gap-3 border-t px-4 py-2 font-mono text-[0.55rem] uppercase tracking-[0.15em] text-muted-foreground"
              style={{ borderColor: "var(--glass-border)" }}
            >
              <span>↑↓ move</span>
              <span>↵ select</span>
              <span className="ml-auto">{pending ? "working…" : "⌘K"}</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-muted-foreground"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
