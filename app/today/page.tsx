import Link from "next/link";
import { getToday, getYesterdayLog } from "@/lib/data/today";
import { getSop } from "@/lib/data/sops";
import { partOfDay } from "@/lib/day";
import CalendarView from "@/components/today/CalendarView";
import RecapSheet from "@/components/today/RecapSheet";
import WeeklyPlanCard from "@/components/today/WeeklyPlanCard";
import MorningCheckIn from "@/components/today/MorningCheckIn";
import ReplanSheet from "@/components/today/ReplanSheet";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const [{ configured, date, blocks, log }, yesterday, weeklyPlan] = await Promise.all([
    getToday(),
    getYesterdayLog(),
    getSop("weekly_plan"),
  ]);
  const pretty = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <main className="mx-auto flex h-dvh w-full max-w-md md:max-w-none flex-col">
      {/* ── Fixed header ─────────────────────────────────────────────────── */}
      <header className="shrink-0 px-5 md:px-10 pt-8 pb-2 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {pretty}
          </span>
          <h1 className="text-xl font-extrabold">
            {partOfDay()}. <span className="accent">Here&apos;s the day.</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {configured && <ReplanSheet />}
          <Link
            href="/home"
            className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
          >
            home
          </Link>
        </div>
      </header>

      {!configured && (
        <div
          className="mx-5 mb-1 shrink-0 rounded-[var(--radius)] border bg-card/70 px-3 py-2 text-sm text-muted-foreground"
          style={{ borderColor: "color-mix(in oklch, var(--color-primary) 40%, transparent)" }}
        >
          <span className="text-foreground">Not connected.</span> Add{" "}
          <code className="text-primary">SUPABASE_SERVICE_ROLE_KEY</code> to <code>.env.local</code> to save plans.
        </div>
      )}

      {/* ── Content: stacked on mobile, side-by-side on desktop ─────────── */}
      <div className="min-h-0 flex-1 flex flex-col md:flex-row md:gap-4 md:px-6 md:pb-8">
        <div className="min-h-0 flex-1 px-2 md:px-0 pb-1">
          <CalendarView initialDate={date} initialBlocks={blocks} />
        </div>
        <div className="shrink-0 pb-20 md:pb-0 md:w-72 md:flex md:flex-col md:justify-end">
          <WeeklyPlanCard initial={weeklyPlan?.content_md ?? ""} />
          <RecapSheet log={log} blocks={blocks} />
        </div>
      </div>

      {/* Morning check-in — fixed overlay, shows once per local day */}
      {configured && <MorningCheckIn yesterday={yesterday.date} yesterdayLog={yesterday.log} />}
    </main>
  );
}
