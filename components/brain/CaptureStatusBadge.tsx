import type { RawSourceStatus } from "@/lib/database.types";

const MAP: Record<RawSourceStatus, { label: string; cls: string }> = {
  raw:        { label: "Queued",      cls: "text-muted-foreground border-muted-foreground/30" },
  converting: { label: "Converting",  cls: "text-amber-300 border-amber-500/40" },
  converted:  { label: "Filing",      cls: "text-amber-300 border-amber-500/40" },
  ingesting:  { label: "Filing",      cls: "text-amber-300 border-amber-500/40" },
  ingested:   { label: "Filed",       cls: "text-green-300 border-green-500/40" },
  needs_review: { label: "Needs review", cls: "text-yellow-300 border-yellow-500/50" },
  error:      { label: "Error",       cls: "text-red-300 border-red-500/40" },
};

export default function CaptureStatusBadge({ status }: { status: RawSourceStatus }) {
  const s = MAP[status] ?? MAP.raw;
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.1em] ${s.cls}`}>
      {s.label}
    </span>
  );
}
