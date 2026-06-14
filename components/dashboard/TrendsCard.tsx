// Gated trends (Refero "unlock" pattern). The momentum + comparison cards are
// always present; the deeper per-metric sparklines unlock once enough days are
// logged. Until then we show progress + a faint teaser of the data forming.
// Server component.

import Link from "next/link";
import type { Insights } from "@/lib/data/insights";
import { UNLOCK_DAYS, daysLogged } from "@/lib/dashboard";
import { Sparkline } from "@/components/graphs/Charts";

export default function TrendsCard({ insights }: { insights: Insights }) {
  const numeric = insights.trends; // count / scale / duration metrics
  const logged = daysLogged(insights);
  const unlocked = logged >= UNLOCK_DAYS;
  const remaining = Math.max(0, UNLOCK_DAYS - logged);
  const pct = Math.min(100, Math.round((logged / UNLOCK_DAYS) * 100));

  return (
    <section
      className="flex flex-col gap-3 rounded-[var(--radius)] border bg-card/60 p-4 backdrop-blur-md"
      style={{ borderColor: "var(--glass-border)" }}
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-bold">Trends</h2>
        {unlocked ? (
          <Link
            href="/insights"
            className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-primary"
          >
            all →
          </Link>
        ) : (
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">
            {logged}/{UNLOCK_DAYS} days
          </span>
        )}
      </div>

      {numeric.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add a count, scale, or duration metric to start trends.{" "}
          <Link href="/tracking" className="text-primary">
            Tracking →
          </Link>
        </p>
      ) : !unlocked ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Log{" "}
            <span className="font-bold text-foreground">{remaining}</span>{" "}
            more {remaining === 1 ? "day" : "days"} to unlock your full trends.
          </p>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: "var(--color-muted)" }}
            role="progressbar"
            aria-valuenow={logged}
            aria-valuemin={0}
            aria-valuemax={UNLOCK_DAYS}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: "var(--color-primary)" }}
            />
          </div>
          {/* Teaser: the data is already forming, just dimmed until it unlocks. */}
          <div className="flex flex-col gap-1 opacity-40">
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.15em] text-muted-foreground">
              {numeric[0].label} · preview
            </span>
            <Sparkline points={numeric[0].points} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {numeric.slice(0, 3).map((trend) => {
            const latest = [...trend.points].reverse().find((p) => p != null);
            return (
              <div key={trend.label} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm">{trend.label}</span>
                  {latest != null ? (
                    <span className="font-mono text-[0.6rem] text-muted-foreground">latest {latest}</span>
                  ) : null}
                </div>
                <Sparkline points={trend.points} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
