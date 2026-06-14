// Shared shapes + helpers for the Today / Scheduler surface.
// daily_plans.blocks is a jsonb array of DayBlock (this is the contract the
// future AI scheduler writes and the Today view reads — tunable, flagged in TODO).

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

// NOTE (known limitation): uses the server's local date. On a UTC host (Vercel)
// "today" can roll over before Cole's local midnight. The same UTC assumption
// affects insights.ts day-bucketing (completed_at.slice(0,10)). Store Cole's
// timezone before the nightly scheduler / charts depend on "today". (specs/TODO.md)
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowHHMM(): string {
  return new Date().toTimeString().slice(0, 5);
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

/** "Morning" / "Afternoon" / "Evening" for greetings (server-local hour). */
export function partOfDay(d: Date = new Date()): "Morning" | "Afternoon" | "Evening" {
  const h = d.getHours();
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
}
