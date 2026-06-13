# Task List — AC Rubicon

> Add tasks here before starting a session. The loop reads this file to find work.
> Format: `- [ ]` pending, `- [x]` done. Add `BLOCKED: reason` or `NEEDS ME: question` inline.
> Full rationale, data model, and estimates: `specs/PLAN.md`.

---

## Current Sprint — M0 Foundation + M1 Task Layer

### M0 — Foundation
- [ ] Scaffold Next.js 15 (App Router) + TypeScript + Tailwind v4 in repo root. Done = `npm run dev` serves a styled blank page. (Deps to install — list and ask first per CLAUDE.md.)
- [ ] Lift design tokens into `app/globals.css` from `design/globals.css` (OKLCH palette, glass/pill, `.accent`, fonts). Done = sample page shows the dark glass theme.
- [ ] Provision Supabase project via the Supabase MCP; capture URL + anon key into `.env.local`. NEEDS ME: one-time confirm to create the project.
- [ ] Create DB schema migration — `projects`, `tasks`, `tracking_metrics`, `tracking_entries`, `daily_logs`, `daily_plans` + effective-task-weight view + single-user RLS. Done = migration applied, tables visible via MCP.
- [ ] Wire Supabase client in `lib/supabase.ts` + single-user magic-link auth. Done = sign-in works, session persists.
- [ ] Deploy skeleton to Vercel via the Vercel MCP as a PWA (manifest + icon). Done = live HTTPS URL, installable on phone. NEEDS ME: one-time confirm to deploy.

### M1 — Task layer
- [ ] Projects: create/edit/list grouped by category (finite / system / habit / later) with priority. Done = CRUD against Supabase.
- [ ] Tasks: create/edit with priority (1–5), effort (quick/slot/deep), status, due, nullable project (Inbox for one-offs). Done = CRUD works.
- [ ] Effective-weight view + sort tasks by weight / due / status. Done = list orders correctly.
- [ ] Projects/Tasks screen: fast inline add, check-off (sets `completed_at`), priority change, "send to Today" (sets `scheduled_for`). Done = usable on phone, matches design tokens. (A task list — NOT a block editor.)

---

## Backlog (break down with @planner / @task-writer when reached)

- [ ] **M2 — Today / Scheduler:** nightly Supabase edge function → Claude plan from tasks + Google Calendar (MCP) + WHOOP (MCP) + last night's recap + command-center context → write Google Calendar + ntfy push; phone-adjustable Today view; "re-plan from now"; evening recap box → `daily_logs`.
- [ ] **M3 — Tracking logger:** one-tap metrics + expand-to-notes + add-a-metric (`tracking_metrics` / `tracking_entries`).
- [ ] **M4 — Graphs:** task throughput, tracking trends (e.g. mood vs WHOOP recovery), plan-adherence chart.
- [ ] Later (out of v1 scope): M5 phone capture · M6 brain→scheduler · M7 coach · M8 native iOS app.

---

## NEEDS ME (Cole's calls)

- [ ] NEEDS ME: Go-ahead to provision a Supabase project + deploy to Vercel via the connected MCPs (one-time).
- [ ] NEEDS ME: Git handling — reinitialize this clone fresh (it still points at `claude-code-template`) and create a new GitHub repo `ac-rubicon`? Or keep working locally for now.

---

## Done

<!-- Completed tasks move here -->
