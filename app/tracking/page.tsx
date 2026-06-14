import Link from "next/link";
import { getTracking } from "@/lib/data/tracking";
import MetricTile from "@/components/tracking/MetricTile";
import AddMetric from "@/components/tracking/AddMetric";

export const dynamic = "force-dynamic";

export default async function TrackingPage() {
  const { configured, metrics } = await getTracking();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md md:max-w-none flex-col gap-6 px-5 md:px-10 pt-10 pb-24 md:pb-10">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Tracking
          </span>
          <h1 className="text-2xl font-extrabold">
            One tap, <span className="accent">logged.</span>
          </h1>
        </div>
        <Link
          href="/"
          className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
        >
          home
        </Link>
      </header>

      {!configured ? (
        <div
          className="rounded-[var(--radius)] border bg-card/70 p-3 text-sm text-muted-foreground"
          style={{ borderColor: "color-mix(in oklch, var(--color-primary) 40%, transparent)" }}
        >
          <span className="text-foreground">Not connected yet.</span> Add{" "}
          <code className="text-primary">SUPABASE_SERVICE_ROLE_KEY</code> to{" "}
          <code>.env.local</code> to log + save metrics.
        </div>
      ) : null}

      {metrics.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {metrics.map((metric) => (
            <MetricTile key={metric.id} metric={metric} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No metrics yet — add the first thing you want to track. Each one is a
          single row; no code change needed.
        </p>
      )}

      <AddMetric />
    </main>
  );
}
