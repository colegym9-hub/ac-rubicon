"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCommandIndex, type SearchItem } from "@/app/command/actions";
import { useCommandActions } from "./useCommandActions";
import CommandList from "./CommandList";
import SearchIcon from "./SearchIcon";

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

  // Global ⌘K / Ctrl+K toggle — disabled on the login page.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (pathname === "/login") return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname]);

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
  const refresh = useCallback(() => router.refresh(), [router]);

  const actions = useCommandActions({ query, index, go, close, refresh, start });

  // Keep selection in range + scrolled into view.
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
          aria-label="Search and commands (Ctrl+K)"
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

            <CommandList actions={actions} sel={sel} onHover={setSel} listRef={listRef} />

            <div
              className="flex items-center gap-3 border-t px-4 py-2 font-mono text-[0.55rem] uppercase tracking-[0.15em] text-muted-foreground"
              style={{ borderColor: "var(--glass-border)" }}
            >
              <span>↑↓ move</span>
              <span>↵ select</span>
              <span className="ml-auto">{pending ? "working…" : "⌘K / Ctrl+K"}</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
