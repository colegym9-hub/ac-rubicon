import Link from "next/link";
import { getTracking } from "@/lib/data/tracking";
import AddMetric from "@/components/tracking/AddMetric";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { configured, metrics } = await getTracking();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md md:max-w-none flex-col gap-6 px-5 md:px-10 pt-10 pb-24 md:pb-10">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Settings</span>
          <h1 className="text-2xl font-extrabold">Tune the <span className="accent">system.</span></h1>
        </div>
        <Link href="/home" className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary">
          home
        </Link>
      </header>

      {!configured ? (
        <div
          className="rounded-[var(--radius)] border bg-card/70 p-3 text-sm text-muted-foreground"
          style={{ borderColor: "color-mix(in oklch, var(--color-primary) 40%, transparent)" }}
        >
          <span className="text-foreground">Not connected yet.</span> Add{" "}
          <code className="text-primary">SUPABASE_SERVICE_ROLE_KEY</code> to <code>.env.local</code>.
        </div>
      ) : null}

      <Link
        href="/settings/brain"
        className="flex items-center justify-between rounded-[var(--radius)] border bg-card/50 px-3 py-3 transition-colors hover:bg-card"
        style={{ borderColor: "var(--glass-border)" }}
      >
        <span>
          <span className="block text-sm font-medium">Brain rules — CloudMD</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">How the routines convert, file, chat, and plan. Tune anytime.</span>
        </span>
        <span className="text-muted-foreground">→</span>
      </Link>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Tracking metrics</h2>
        <p className="text-xs text-muted-foreground">
          What you track daily. Log them from the Today tab; manage them here.
        </p>
        {metrics.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {metrics.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-[var(--radius)] border bg-card/50 px-3 py-2.5"
                style={{ borderColor: "var(--glass-border)" }}
              >
                <span className="text-sm">{m.label}</span>
                <span className="font-mono text-[0.55rem] uppercase tracking-[0.1em] text-muted-foreground">{m.type}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No metrics yet — add the first thing you want to track.</p>
        )}
        <AddMetric />
      </section>
    </main>
  );
}
