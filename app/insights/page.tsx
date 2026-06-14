import Link from "next/link";
import { getInsights } from "@/lib/data/insights";
import { getLatestReport } from "@/lib/data/brain";
import { AdherenceBars, BarChart, Sparkline } from "@/components/graphs/Charts";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

function Card({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  return (
    <section
      className="flex flex-col gap-3 rounded-[var(--radius)] border bg-card/60 p-4 backdrop-blur-md"
      style={{ borderColor: "var(--glass-border)" }}
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-bold">{title}</h2>
        {meta ? (
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">{meta}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default async function InsightsPage() {
  const [{ configured, days, throughput, adherence, trends }, insight, lint] = await Promise.all([
    getInsights(),
    getLatestReport("insight"),
    getLatestReport("lint"),
  ]);

  const totalDone = throughput.reduce((a, b) => a + b, 0);
  const planned = adherence.reduce((a, b) => a + b.planned, 0);
  const blocksDone = adherence.reduce((a, b) => a + b.done, 0);
  const adherencePct = planned ? Math.round((blocksDone / planned) * 100) : null;
  const range = `${days[0].slice(5)}–${days[days.length - 1].slice(5)}`;
  const empty = configured && totalDone === 0 && planned === 0 && trends.length === 0;
  const lintCount = Array.isArray(lint?.issues) ? lint.issues.length : 0;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md md:max-w-none flex-col gap-6 px-5 md:px-10 pt-10 pb-24 md:pb-10">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Insights</span>
          <h1 className="text-2xl font-extrabold">
            The <span className="accent">honesty mirror.</span>
          </h1>
        </div>
        {lint && (
          <Link href="/brain" className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-primary">
            brain health · {lintCount === 0 ? "clean" : `${lintCount} to review`}
          </Link>
        )}
      </header>

      {/* Weekly AI signal (written by the Monday brain routine) */}
      <section
        className="flex flex-col gap-2 rounded-[var(--radius)] border bg-card/60 p-4 backdrop-blur-md"
        style={{ borderColor: "color-mix(in oklch, var(--color-primary) 30%, transparent)" }}
      >
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-primary">This week&apos;s signal</h2>
        </div>
        {insight?.summary ? (
          <p className="text-sm leading-relaxed text-foreground">{insight.summary}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your weekly read — patterns across plans, tracking, and the brain — generates Monday mornings once the routine is live.
          </p>
        )}
      </section>

      {!configured ? (
        <div
          className="rounded-[var(--radius)] border bg-card/70 p-3 text-sm text-muted-foreground"
          style={{ borderColor: "color-mix(in oklch, var(--color-primary) 40%, transparent)" }}
        >
          <span className="text-foreground">Not connected yet.</span> Add{" "}
          <code className="text-primary">SUPABASE_SERVICE_ROLE_KEY</code> to <code>.env.local</code> — charts fill in as you use the app.
        </div>
      ) : null}

      {empty ? (
        <p className="text-sm text-muted-foreground">
          No history yet. Complete tasks, plan days, and log metrics — the charts below fill in over the last 14 days.
        </p>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Task throughput" meta={`${totalDone} done · ${range}`}>
          <BarChart values={throughput} />
        </Card>

        <Card title="Plan adherence" meta={adherencePct == null ? range : `${adherencePct}% · ${range}`}>
          <AdherenceBars data={adherence} />
          <div className="flex items-center gap-4 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-[1px]" style={{ background: "var(--color-primary)" }} />
              done
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-[1px]" style={{ background: "var(--color-muted)" }} />
              planned
            </span>
          </div>
        </Card>
      </div>

      {trends.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trends.map((trend) => {
            const latest = [...trend.points].reverse().find((p) => p != null);
            return (
              <Card key={trend.label} title={trend.label} meta={latest != null ? `latest ${latest}` : range}>
                <Sparkline points={trend.points} />
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
