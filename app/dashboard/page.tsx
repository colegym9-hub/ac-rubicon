import Link from "next/link";
import { getToday } from "@/lib/data/today";
import { getInsights } from "@/lib/data/insights";
import { getBoard } from "@/lib/data/board";
import { getTracking } from "@/lib/data/tracking";
import { partOfDay, todayISO } from "@/lib/day";
import {
  activeDays,
  delta,
  noHistory,
  openTaskCount,
  previousDaily,
  recentDaily,
  streak,
  todayDone,
  weekAdherence,
  weekThroughput,
} from "@/lib/dashboard";
import { MomentumChart } from "@/components/graphs/Charts";
import StatStrip from "@/components/dashboard/StatStrip";
import ComparisonGrid, { type Comparison } from "@/components/dashboard/ComparisonGrid";
import TodayCard from "@/components/dashboard/TodayCard";
import TrackingGlance from "@/components/dashboard/TrackingGlance";
import { logout } from "@/app/login/actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [today, insights, board, tracking] = await Promise.all([
    getToday(),
    getInsights(),
    getBoard(),
    getTracking(),
  ]);

  const configured = insights.configured;
  const pretty = new Date(`${todayISO()}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const wkTasks = weekThroughput(insights);
  const wkDays = activeDays(insights);
  const adh = weekAdherence(insights);
  const run = streak(insights.throughput);

  const stats = [
    { label: "Done today", value: String(todayDone(insights)) },
    {
      label: "Day streak",
      value: run > 0 ? `${run}🔥` : "0",
      hint: run > 0 ? "keep it going" : "complete a task",
    },
    { label: "Open tasks", value: String(openTaskCount(board)) },
    { label: "Adherence 7d", value: adh.current != null ? `${adh.current}%` : "—" },
  ];

  const comparisons: Comparison[] = [
    { label: "Tasks done", value: String(wkTasks.current), previous: String(wkTasks.previous), delta: wkTasks },
    { label: "Active days", value: String(wkDays.current), previous: String(wkDays.previous), delta: wkDays, unit: "d" },
    {
      label: "Adherence",
      value: adh.current != null ? `${adh.current}%` : "—",
      previous: adh.previous != null ? `${adh.previous}%` : undefined,
      delta:
        adh.current != null && adh.previous != null ? delta(adh.current, adh.previous) : undefined,
    },
    { label: "Day streak", value: String(run), unit: "d" },
  ];

  const momentumArrow = wkTasks.dir === "up" ? "↑" : wkTasks.dir === "down" ? "↓" : "→";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 pt-12 pb-24">
      <header className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {pretty}
          </span>
          <h1 className="text-3xl font-extrabold leading-tight">
            Good {partOfDay().toLowerCase()},{" "}
            <span className="accent">Cole.</span>
          </h1>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
          >
            lock
          </button>
        </form>
      </header>

      {!configured ? (
        <div
          className="rounded-[var(--radius)] border bg-card/70 p-3 text-sm text-muted-foreground"
          style={{ borderColor: "color-mix(in oklch, var(--color-primary) 40%, transparent)" }}
        >
          <span className="text-foreground">Not connected yet.</span> Add{" "}
          <code className="text-primary">SUPABASE_SERVICE_ROLE_KEY</code> to{" "}
          <code>.env.local</code> — the dashboard fills in as you use the app.
        </div>
      ) : noHistory(insights) ? (
        <p className="text-sm text-muted-foreground">
          Fresh start. Complete tasks, plan days, and log metrics — these tiles
          fill in over the last two weeks.
        </p>
      ) : null}

      <StatStrip stats={stats} />

      <TodayCard today={today} />

      <section
        className="flex flex-col gap-3 rounded-[var(--radius)] border bg-card/60 p-4 backdrop-blur-md"
        style={{ borderColor: "var(--glass-border)" }}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-bold">Momentum</h2>
          <Link
            href="/graphs"
            className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-primary"
          >
            graphs →
          </Link>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold leading-none">{wkTasks.current}</span>
          <span className="text-xs text-muted-foreground">tasks this week</span>
          <span className="ml-auto text-[0.7rem] text-muted-foreground">
            <span style={{ color: wkTasks.dir === "up" ? "var(--color-primary)" : "var(--color-muted-foreground)" }}>
              {momentumArrow}
            </span>{" "}
            vs {wkTasks.previous} last
          </span>
        </div>
        <MomentumChart values={recentDaily(insights)} compare={previousDaily(insights)} />
        <div className="flex items-center gap-4 font-mono text-[0.55rem] uppercase tracking-[0.15em] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-[2px] w-3" style={{ background: "var(--color-primary)" }} />
            this week
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-[2px] w-3" style={{ background: "var(--color-muted-foreground)" }} />
            last week
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
          This week vs last
        </h2>
        <ComparisonGrid items={comparisons} />
      </section>

      <TrackingGlance tracking={tracking} />
    </main>
  );
}
