"use client";

import { useEffect } from "react";
import type { CaptureSummary } from "@/lib/brain/types";
import CaptureRow from "./CaptureRow";
import { Plus } from "lucide-react";

interface Props {
  captures: CaptureSummary[];
  onRefresh: () => void;
  onAdd: () => void;
}

const DRAINABLE = ["raw", "converting", "converted", "ingesting"];

export default function CapturesSection({ captures, onRefresh, onAdd }: Props) {
  // Poll while anything is still in flight; the in-app ingest files it.
  const hasPending = captures.some((c) => c.status !== "ingested" && c.status !== "error");
  // Sources the ingest can still act on (excludes needs_review, which waits on Cole).
  const hasDrainable = captures.some((c) => DRAINABLE.includes(c.status));
  useEffect(() => {
    if (!hasPending) return;
    const tick = () => {
      // Backstop the capture route's after() trigger (lock-guarded server-side,
      // so this no-ops while a drain is already running).
      if (hasDrainable) fetch("/api/brain/ingest", { method: "POST" }).catch(() => {});
      onRefresh();
    };
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, [hasPending, hasDrainable, onRefresh]);

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
          Captures
        </h2>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 rounded-[3px] border px-2 py-1 font-mono text-[0.55rem] uppercase tracking-[0.15em] text-primary transition-colors hover:bg-primary/10"
          style={{ borderColor: "var(--glass-border)" }}
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
      {captures.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Drop a link, note, voice memo, or photo — it lands here, then files itself into the wiki.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {captures.map((c) => <CaptureRow key={c.id} capture={c} onRetried={onRefresh} />)}
        </div>
      )}
    </section>
  );
}
