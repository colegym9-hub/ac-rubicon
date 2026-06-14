import Link from "next/link";
import { getToday } from "@/lib/data/today";
import PlanEditor from "@/components/today/PlanEditor";
import RecapBox from "@/components/today/RecapBox";

export const dynamic = "force-dynamic";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

export default async function TodayPage() {
  const { configured, date, blocks, log, scheduledTasks } = await getToday();
  const pretty = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-10">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {pretty}
          </span>
          <h1 className="text-2xl font-extrabold">
            {greeting()}. <span className="accent">Here&apos;s the day.</span>
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
          <code>.env.local</code> to save plans + recaps.
        </div>
      ) : null}

      <p className="font-mono text-[0.6rem] uppercase leading-relaxed tracking-[0.15em] text-muted-foreground">
        Auto-planning (Calendar + WHOOP + last night&apos;s recap → Claude → push)
        is the next milestone. Build today by hand for now.
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
          The plan
        </h2>
        <PlanEditor initial={blocks} />
      </section>

      {scheduledTasks.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
            Scheduled for today
          </h2>
          <ul className="flex flex-col">
            {scheduledTasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between border-b py-2 text-sm last:border-b-0"
                style={{ borderColor: "var(--glass-border)" }}
              >
                <span className={task.status === "done" ? "text-muted-foreground line-through" : ""}>
                  {task.title}
                </span>
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">
                  P{task.priority} · {task.effort}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <RecapBox log={log} />
    </main>
  );
}
