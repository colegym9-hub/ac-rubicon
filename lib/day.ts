// Shared shapes + helpers for the Today / Scheduler surface.
// daily_plans.blocks is a jsonb array of DayBlock (this is the contract the
// future AI scheduler writes and the Today view reads — tunable, flagged in TODO).

import type { DailyLog } from "@/lib/database.types";

export type BlockKind =
  | "deep"
  | "light"
  | "break"
  | "gym"
  | "event"
  | "buffer";

export type DayBlock = {
  id: string;
  start: string; // "HH:MM" 24h
  end: string; // "HH:MM" 24h
  label: string;
  kind: BlockKind;
  taskId?: string | null;
  rationale?: string | null;
  done?: boolean;
};

export const BLOCK_KINDS: BlockKind[] = [
  "deep",
  "light",
  "break",
  "gym",
  "event",
  "buffer",
];

// App timezone. Cole is Eastern; override via APP_TIMEZONE if it ever changes.
// (Previously used the host's local/UTC date, which rolled "today" over before
// Cole's local midnight and skewed the charts — see specs/TODO.md.)
export const APP_TZ = process.env.APP_TIMEZONE || "America/New_York";

const ISO_DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const HHMM_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const HOUR_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TZ,
  hour: "2-digit",
  hourCycle: "h23",
});

/** Calendar date (YYYY-MM-DD) of `when` in the app timezone — accepts a Date, an
 *  ISO timestamp string, or defaults to now. Use this for ALL day-bucketing. */
export function localDateISO(when: Date | string = new Date()): string {
  const d = typeof when === "string" ? new Date(when) : when;
  return ISO_DATE_FMT.format(d); // en-CA formats as YYYY-MM-DD
}

/** Today's date (YYYY-MM-DD) in the app timezone. */
export function todayISO(): string {
  return localDateISO();
}

/** Add `delta` days to an ISO date (YYYY-MM-DD) via a noon-UTC anchor (DST-safe).
 *  Shared by the planner (yesterday/adherence window) and the Today log's
 *  "Tomorrow" → tomorrow's-row write-forward. */
export function addDaysISO(isoDate: string, delta: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Current wall-clock "HH:MM" (24h) in the app timezone. */
export function nowHHMM(): string {
  return HHMM_FMT.format(new Date());
}

/** Parse "HH:MM" → minutes since midnight. Returns -1 for malformed or out-of-range. */
export function toMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return -1;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return -1;
  return h * 60 + min;
}

export function sortBlocks(blocks: DayBlock[]): DayBlock[] {
  return [...blocks].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

/** The block to surface as "Do Next": the first not-done block whose end is still ahead of now (falls back to the first not-done block). */
export function pickDoNext(blocks: DayBlock[]): DayBlock | null {
  const now = toMinutes(nowHHMM());
  const open = sortBlocks(blocks).filter((b) => !b.done);
  return open.find((b) => toMinutes(b.end) > now) ?? open[0] ?? null;
}

/** "Morning" / "Afternoon" / "Evening" for greetings (app-timezone hour). */
export function partOfDay(when: Date = new Date()): "Morning" | "Afternoon" | "Evening" {
  const h = Number(HOUR_FMT.format(when)); // 0–23 in APP_TZ
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
}

/** A daily_logs row only counts as "logged" if it carries real recap content.
 *  A row that exists solely to hold a forward `plan_note` (written the night
 *  before via the "Tomorrow" field) is NOT a log — otherwise the morning
 *  check-in would think the day was already recapped. */
export function isLogged(log: DailyLog | null | undefined): boolean {
  return (
    !!log &&
    (log.recap_text != null ||
      log.energy != null ||
      log.slots_done != null ||
      log.slots_slipped != null)
  );
}
