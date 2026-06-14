// Tracking glance: how many of today's metrics are logged + value chips
// (Reown/Rob pattern). Logging happens on /tracking — this links there.
// Server component.

import Link from "next/link";
import type { MetricWithEntry, Tracking } from "@/lib/data/tracking";
import { trackingLogged } from "@/lib/dashboard";

function valueLabel(m: MetricWithEntry): string {
  const e = m.entry;
  if (!e) return "—";
  switch (m.type) {
    case "bool":
      return e.value_num ? "Yes" : "No";
    case "note":
      return e.value_text ? "Noted" : "—";
    case "duration":
      return e.value_num != null ? `${e.value_num}m` : "—";
    default:
      return e.value_num != null ? String(e.value_num) : "—";
  }
}

export default function TrackingGlance({ tracking }: { tracking: Tracking }) {
  const { done, total } = trackingLogged(tracking);
  const chips = tracking.metrics.slice(0, 6);

  return (
    <section
      className="flex flex-col gap-3 rounded-[var(--radius)] border bg-card/60 p-4 backdrop-blur-md"
      style={{ borderColor: "var(--glass-border)" }}
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-bold">Tracking</h2>
        <Link
          href="/tracking"
          className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-primary"
        >
          log →
        </Link>
      </div>

      {total === 0 ? (
        <p className="text-sm text-muted-foreground">
          No metrics yet.{" "}
          <Link href="/tracking" className="text-primary">
            Add one →
          </Link>
        </p>
      ) : (
        <>
          <span className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">
              {done}/{total}
            </span>{" "}
            logged today
          </span>
          <div className="flex flex-wrap gap-2">
            {chips.map((m) => {
              const logged = m.entry != null;
              return (
                <span
                  key={m.id}
                  className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
                  style={{
                    borderColor: logged
                      ? "color-mix(in oklch, var(--color-primary) 45%, transparent)"
                      : "var(--glass-border)",
                    color: logged ? "var(--color-foreground)" : "var(--color-muted-foreground)",
                  }}
                >
                  {m.label}
                  <span className="font-mono text-[0.65rem] text-primary">
                    {valueLabel(m)}
                  </span>
                </span>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
