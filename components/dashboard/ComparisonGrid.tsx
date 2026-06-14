// "This week vs last week" comparison cards (the fitness-app pattern): current
// value, optional previous, and a delta arrow. Server component.

import type { Delta, Direction } from "@/lib/dashboard";

export type Comparison = {
  label: string;
  value: string;
  /** Formatted previous-period value, shown as "vs X". */
  previous?: string;
  delta?: Delta;
  unit?: string;
};

function DeltaArrow({ dir }: { dir: Direction }) {
  const glyph = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
  const color =
    dir === "up" ? "var(--color-primary)" : "var(--color-muted-foreground)";
  return (
    <span aria-hidden style={{ color }}>
      {glyph}
    </span>
  );
}

export default function ComparisonGrid({ items }: { items: Comparison[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((it) => (
        <div
          key={it.label}
          className="flex flex-col gap-2 rounded-[var(--radius)] border bg-card/60 p-3 backdrop-blur-md"
          style={{ borderColor: "var(--glass-border)" }}
        >
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">
            {it.label}
          </span>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-extrabold leading-none">{it.value}</span>
            {it.unit ? (
              <span className="mb-[2px] text-xs text-muted-foreground">{it.unit}</span>
            ) : null}
          </div>
          {it.delta ? (
            <span className="flex items-center gap-1 text-[0.7rem] text-muted-foreground">
              <DeltaArrow dir={it.delta.dir} />
              {it.delta.pct != null ? `${Math.abs(it.delta.pct)}%` : "new"}
              {it.previous ? (
                <span className="text-muted-foreground/70">vs {it.previous}</span>
              ) : null}
            </span>
          ) : it.previous ? (
            <span className="text-[0.7rem] text-muted-foreground/70">vs {it.previous}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
