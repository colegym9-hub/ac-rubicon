// Pure derivations for the Home/Dashboard surface. No DB access — these take the
// already-fetched shapes from lib/data/* and compute the glanceable numbers
// (week-over-week deltas, streaks, counts). Pure + deterministic = easy to test.

import type { Board } from "@/lib/data/board";
import type { Insights } from "@/lib/data/insights";
import type { Tracking } from "@/lib/data/tracking";

export type Direction = "up" | "down" | "flat";

export type Delta = {
  current: number;
  previous: number;
  diff: number;
  /** Percent change vs previous, or null when previous is 0 (undefined ratio). */
  pct: number | null;
  dir: Direction;
};

export function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

export function delta(current: number, previous: number): Delta {
  const diff = current - previous;
  const pct = previous === 0 ? null : Math.round((diff / previous) * 100);
  const dir: Direction = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  return { current, previous, diff, pct, dir };
}

/** Split a series into [previous, recent] halves (recent = the tail). */
function halves<T>(xs: T[]): [T[], T[]] {
  const h = Math.floor(xs.length / 2);
  return [xs.slice(0, xs.length - h), xs.slice(-h)];
}

/** Trailing run of days (ending today) with ≥1 task completed. */
export function streak(throughput: number[]): number {
  let n = 0;
  for (let i = throughput.length - 1; i >= 0; i--) {
    if (throughput[i] > 0) n += 1;
    else break;
  }
  return n;
}

/** Tasks completed today (last bucket of the throughput window). */
export function todayDone(insights: Insights): number {
  return insights.throughput[insights.throughput.length - 1] ?? 0;
}

/** Tasks completed this period vs the previous period. */
export function weekThroughput(insights: Insights): Delta {
  const [prev, recent] = halves(insights.throughput);
  return delta(sum(recent), sum(prev));
}

/** Days with ≥1 completion this period vs previous. */
export function activeDays(insights: Insights): Delta {
  const [prev, recent] = halves(insights.throughput);
  const count = (xs: number[]) => xs.filter((x) => x > 0).length;
  return delta(count(recent), count(prev));
}

function adherencePct(rows: { planned: number; done: number }[]): number | null {
  const planned = sum(rows.map((r) => r.planned));
  const done = sum(rows.map((r) => r.done));
  return planned ? Math.round((done / planned) * 100) : null;
}

/** Plan-adherence % this period vs previous (null when nothing was planned). */
export function weekAdherence(insights: Insights): {
  current: number | null;
  previous: number | null;
} {
  const [prev, recent] = halves(insights.adherence);
  return { current: adherencePct(recent), previous: adherencePct(prev) };
}

/** This period's daily throughput (recent half) — feeds the momentum bars. */
export function recentDaily(insights: Insights): number[] {
  return halves(insights.throughput)[1];
}

/** Previous period's daily throughput (for the compare line). */
export function previousDaily(insights: Insights): number[] {
  return halves(insights.throughput)[0];
}

/** Open (not-done) tasks across all projects + the inbox. */
export function openTaskCount(board: Board): number {
  let open = 0;
  for (const col of board.columns) {
    for (const p of col.projects) open += Math.max(0, p.total - p.done);
  }
  open += board.inbox.filter((t) => t.status !== "done").length;
  return open;
}

/** Non-archived projects on the board. */
export function activeProjectCount(board: Board): number {
  return board.columns.reduce((n, c) => n + c.projects.length, 0);
}

/** How many of today's active metrics have been logged. */
export function trackingLogged(tracking: Tracking): { done: number; total: number } {
  return {
    done: tracking.metrics.filter((m) => m.entry != null).length,
    total: tracking.metrics.length,
  };
}

/** True when there is no history at all yet (configured but DB empty). */
export function noHistory(insights: Insights): boolean {
  return (
    sum(insights.throughput) === 0 &&
    sum(insights.adherence.map((a) => a.planned)) === 0 &&
    insights.trends.every((t) => t.points.every((p) => p == null))
  );
}
