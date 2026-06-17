"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Search, Check } from "lucide-react";
import type { PendingSource } from "@/lib/brain/types";

interface PageOption {
  slug: string;
  title: string;
  domain: string;
}

interface Props {
  source: PendingSource;
  pages: PageOption[];
  onClose: () => void;
}

export default function ReviewSheet({ source, pages, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PageOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const filtered = query.trim()
    ? pages.filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.domain.toLowerCase().includes(query.toLowerCase()),
      )
    : pages;

  const preview = source.content_md?.trim() || source.raw_input?.trim() || null;
  const border = { borderColor: "var(--glass-border)" };

  function file() {
    if (!selected) return;
    setError(null);
    start(async () => {
      const res = await fetch(`/api/brain/captures/${source.id}/file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: selected.slug }),
      });
      if (!res.ok) {
        setError((await res.text()) || "Filing failed.");
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-[70] flex max-h-[88dvh] flex-col rounded-t-2xl border-t bg-card px-5 pt-4 shadow-2xl animate-slide-up"
        style={{ ...border, paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" />

        <h2 className="shrink-0 text-xl font-extrabold leading-tight">
          Review <span className="accent">source</span>
        </h2>
        <p className="mt-0.5 shrink-0 truncate text-sm text-muted-foreground">
          {source.title || "Untitled"}
        </p>

        {/* AI reason it was parked */}
        {source.error_msg && (
          <div className="mt-3 shrink-0 flex items-start gap-2 rounded-lg bg-yellow-500/10 px-3 py-2.5 text-xs text-yellow-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="break-words leading-relaxed">{source.error_msg}</span>
          </div>
        )}

        {/* Content preview */}
        {preview && (
          <div className="mt-3 shrink-0">
            <p className="mb-1 font-mono text-[0.55rem] uppercase tracking-[0.15em] text-muted-foreground">
              Content
            </p>
            <pre
              className="max-h-36 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border bg-muted/20 px-3 py-2.5 font-mono text-[0.62rem] leading-relaxed text-foreground/70"
              style={border}
            >
              {preview.slice(0, 1200)}
              {preview.length > 1200 && "\n…"}
            </pre>
          </div>
        )}

        {/* Page selector */}
        <div className="mt-4 shrink-0">
          <p className="mb-2 font-mono text-[0.55rem] uppercase tracking-[0.15em] text-muted-foreground">
            File to wiki page
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages…"
              className="w-full rounded-[var(--radius)] border bg-transparent py-2 pl-8 pr-3 text-sm outline-none focus:border-primary"
              style={border}
            />
          </div>
        </div>

        {/* Page list — scrollable */}
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-1 pb-2">
            {filtered.slice(0, 40).map((p) => {
              const isSelected = selected?.slug === p.slug;
              return (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => setSelected(isSelected ? null : p)}
                  className={[
                    "flex items-center gap-3 rounded-[var(--radius)] border px-3 py-2.5 text-left transition-colors",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "bg-card/50 text-foreground hover:bg-card",
                  ].join(" ")}
                  style={isSelected ? {} : border}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    <p className="font-mono text-[0.5rem] uppercase tracking-[0.1em] text-muted-foreground">
                      {p.domain}
                    </p>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">No pages match.</p>
            )}
          </div>
        </div>

        {error && <p className="mt-2 shrink-0 text-xs text-destructive">{error}</p>}

        <button
          type="button"
          onClick={file}
          disabled={!selected || isPending}
          className="mt-3 shrink-0 w-full rounded-[var(--radius)] bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
        >
          {isPending
            ? "Filing with AI…"
            : selected
              ? `File to "${selected.title}"`
              : "Select a page above"}
        </button>
      </div>
    </>
  );
}
