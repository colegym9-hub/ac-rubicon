// Today glance: the "Do Next" hero block (Todoist/fitness "Today" pattern) plus
// a short read-only list of tasks scheduled for today. Interaction lives on
// /today — this is a glance that links there. Server component.

import Link from "next/link";
import type { Today } from "@/lib/data/today";
import { pickDoNext } from "@/lib/day";
import { priorityLabel } from "@/lib/labels";

export default function TodayCard({ today }: { today: Today }) {
  const doNext = pickDoNext(today.blocks);
  const tasks = today.scheduledTasks.slice(0, 4);
  const remaining = today.scheduledTasks.length - tasks.length;

  return (
    <section
      className="flex flex-col gap-3 rounded-[var(--radius)] border bg-card/60 p-4 backdrop-blur-md"
      style={{ borderColor: "var(--glass-border)" }}
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-bold">Today</h2>
        <Link
          href="/today"
          className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-primary"
        >
          open →
        </Link>
      </div>

      {doNext ? (
        <Link
          href="/today"
          className="flex flex-col gap-1 rounded-[var(--radius)] border p-3 transition-colors hover:border-primary/60"
          style={{ borderColor: "color-mix(in oklch, var(--color-primary) 35%, transparent)" }}
        >
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-primary/80">
            Do next · {doNext.start}–{doNext.end}
          </span>
          <span className="text-lg font-bold leading-tight">{doNext.label}</span>
          {doNext.rationale ? (
            <span className="text-xs text-muted-foreground">{doNext.rationale}</span>
          ) : null}
        </Link>
      ) : (
        <p className="text-sm text-muted-foreground">
          No plan yet today.{" "}
          <Link href="/today" className="text-primary">
            Build the day →
          </Link>
        </p>
      )}

      {tasks.length > 0 ? (
        <ul className="flex flex-col">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between border-b py-2 text-sm last:border-b-0"
              style={{ borderColor: "var(--glass-border)" }}
            >
              <span className={t.status === "done" ? "text-muted-foreground line-through" : ""}>
                {t.title}
              </span>
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.15em] text-muted-foreground">
                {priorityLabel(t.priority)} · {t.effort}
              </span>
            </li>
          ))}
          {remaining > 0 ? (
            <li className="pt-2 text-[0.7rem] text-muted-foreground">
              +{remaining} more scheduled
            </li>
          ) : null}
        </ul>
      ) : null}
    </section>
  );
}
