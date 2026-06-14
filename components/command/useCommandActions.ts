import { useMemo } from "react";
import { createTask } from "@/app/projects/actions";
import { logout } from "@/app/login/actions";
import type { SearchItem } from "@/app/command/actions";

export type Action = {
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
const ORDER = { project: 0, task: 1, metric: 2 } as const;

/** Build the ranked palette actions from the query + loaded search index. */
export function useCommandActions(opts: {
  query: string;
  index: SearchItem[] | null;
  go: (href: string) => void;
  close: () => void;
  refresh: () => void;
  start: (cb: () => void) => void;
}): Action[] {
  const { query, index, go, close, refresh, start } = opts;

  return useMemo<Action[]>(() => {
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
            refresh();
          }),
      });
    }

    const results = (index ?? [])
      .filter((it) => match(it.label))
      .slice(0, 8)
      .sort((a, b) => ORDER[a.type] - ORDER[b.type]);
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
  }, [query, index, go, close, refresh, start]);
}
