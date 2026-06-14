# Home / Dashboard — design synthesis + build plan

> A glanceable **command-center landing** that surfaces highlights from the four
> existing surfaces (Projects/Tasks · Today · Tracking · Graphs). Built from 10
> dashboard inspo images Cole shared, rendered in AC Rubicon's existing
> **dark OKLCH glass/teal** system, **phone-first**. Read-only glance — every
> tile links to its full surface for interaction (we do NOT rebuild the surfaces here).

## What we pulled from each inspo (and how it maps)

| # | Inspo | Element stolen | Where it lands |
|---|-------|----------------|----------------|
| 1 | Stellate Metrics | headline stat + breakdown, status badges | stat strip styling; status pills (later) |
| 2 | Reown Analytics | whitespace card grid, **"No data yet" empty states** | every tile degrades gracefully (DB-empty = the common case now) |
| 3 | Refero "Customer voice" | **gated/progress-to-unlock** ("2/25 to enable") | "log N days to unlock trends" when history < window |
| 4 | Fitness — Week (dark) | **combo line+bar**, "this week vs LAST week", metric cards w/ current+prior+delta | Momentum chart + Comparison grid (the core steal) |
| 5 | Fitness — Year (light) | **delta arrows** on metrics, cumulative-vs-compare line | Comparison grid arrows; MomentumChart compare line |
| 6 | "Rob" Confidence | **streak · daily-activities ratio · level bar** | StatStrip streak; today's completion ratio |
| 7 | Fitness — Year (red) | same combo pattern, alt accent | confirms the pattern; we keep teal (VISION constraint) |
| 8 | Todoist Upcoming | day-grouped task cards, "Add task" | TodayCard scheduled list; QuickActions |
| 9 | Kinhive Home | **editorial greeting** ("Good afternoon, _Eiza_"), 4 stat cards w/ colored underline, To-Do, Daily Prompt | Greeting via `.accent`; StatStrip underline; TodayCard |
| 10 | Cycle command palette | ⌘K quick actions + keyboard nav | QuickActions chips (full ⌘K = later/stretch) |

**Through-lines:** period-over-period comparison · combo charts · metric cards with current+delta+drill-in · glance→full-surface links · thoughtful empty states.

## Composition (phone-first, single column, `max-w-md`)

1. **Greeting header** — "Good {morning/afternoon/evening}, _Cole_" (name in `.accent` italic serif teal) + pretty date + `lock`/`home` corner.
2. **Stat strip** — 4 compact cards w/ teal underline: **Done today · Day streak · Open tasks · Adherence (7d)**.
3. **Today card** — "Do Next" hero (`pickDoNext`) + today's scheduled tasks (read-only) → `/today`.
4. **Momentum card** — combo bars+cumulative-line, **this week vs last week** delta header → `/graphs`.
5. **This week vs last week** — 2×2 comparison grid: **Tasks done · Active days · Adherence · (Tracking streak / metric)**, each current + prior + delta arrow.
6. **Tracking glance** — logged X/Y today + metric chips → `/tracking`.
7. **Quick actions** — chips → Projects · Today · Tracking · Graphs.

Empty/locked states woven throughout (DB unconfigured banner; "fills in as you use the app" when all-zero; "log N days to unlock" for trends).

## Data (all existing, server-side, graceful when unconfigured)

- `getToday()` → Do Next + scheduled tasks (`lib/data/today.ts`)
- `getInsights()` → 14-day throughput/adherence/trends → derive week deltas + streak (`lib/data/insights.ts`)
- `getBoard()` → open tasks + active projects (`lib/data/board.ts`)
- `getTracking()` → logged-today ratio (`lib/data/tracking.ts`)
- Derivations: pure functions in `lib/dashboard.ts` (streak, week deltas, counts) — no DB, unit-testable.

## Decisions / forks

- **Theme:** keep dark teal glass (VISION: reuse tokens) — NOT the inspo's light/orange/red. Steal *patterns*, not palette.
- **Altitude:** read-only glance + links. Interaction stays on the full surfaces (no scope creep / no Notion-clone).
- **Routing fork → NEEDS ME:** built at **`/dashboard`** and featured on the `/` surfaces menu. Promoting it to the root `/` landing (replacing the menu) is Cole's product call — reversible, flagged in TODO.
- **Time range:** only the 14-day window exists today (`getInsights`). Week-vs-week works now; Month/Year segmented control deferred until more history + is gated by the DB anyway (don't ship dead controls).

## Build checklist (this sprint)

- [x] `lib/dashboard.ts` — pure derivations (delta, streak, week*, counts)
- [x] `MomentumChart` in `components/graphs/Charts.tsx` — bars + cumulative line + compare line
- [x] `partOfDay()` in `lib/day.ts` (DRY the greeting; refactor `today/page.tsx`)
- [x] `components/dashboard/` — StatStrip, ComparisonGrid, TodayCard, TrackingGlance, QuickActions
- [x] `app/dashboard/page.tsx` — assemble + empty states
- [x] Feature on `app/page.tsx` menu
- [ ] Verify: build/lint green + browser preview (dev gate: password `rubicon-dev`)
- [ ] @reviewer pass before calling it done
- [ ] NEEDS ME: promote to root `/`? · later: ⌘K palette, Month/Year ranges, check-off inline
