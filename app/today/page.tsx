import Link from "next/link";
import { getToday } from "@/lib/data/today";
import { partOfDay } from "@/lib/day";
import CalendarView from "@/components/today/CalendarView";
import RecapSheet from "@/components/today/RecapSheet";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const { configured, date, blocks, log } = await getToday();
  const pretty = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <main className="mx-auto flex h-dvh w-full max-w-md flex-col">
      {/* ── Fixed header ─────────────────────────────────────────────────── */}
      <header className="shrink-0 px-5 pt-8 pb-2 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {pretty}
          </span>
          <h1 className="text-xl font-extrabold">
            {partOfDay()}. <span className="accent">Here&apos;s the day.</span>
          </h1>
        </div>
        <Link
          href="/"
          className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
        >
          home
        </Link>
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

      {/* ── Calendar (fills remaining height) ───────────────────────────── */}
      <div className="min-h-0 flex-1 px-2 pb-1">
        <CalendarView initialDate={date} initialBlocks={blocks} />
      </div>

      {/* ── Log card + sheet (above bottom nav) ─────────────────────────── */}
      <div className="shrink-0 pb-20">
        <RecapSheet log={log} />
      </div>
    </main>
  );
}
