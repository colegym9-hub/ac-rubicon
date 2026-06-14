# Task List — AC Rubicon

> Add tasks here before starting a session. The loop reads this file to find work.
> Format: `- [ ]` pending, `- [x]` done. Add `BLOCKED: reason` or `NEEDS ME: question` inline.
> Full rationale, data model, and estimates: `specs/PLAN.md`.

---

## Current Sprint — M0 Foundation + M1 Task Layer

### M0 — Foundation
- [x] Scaffold Next.js 15 (App Router) + TypeScript + Tailwind v4 in repo root. Done = `npm run dev` serves a styled blank page. (Next 15.5.19 + React 19 + Tailwind v4; `npm run build` green, `GET / 200`.)
- [x] Lift design tokens into `app/globals.css` from `design/globals.css` (OKLCH palette, glass/pill, `.accent`, fonts). Done = sample page shows the dark glass theme. (Tokens lifted verbatim; 4 fonts wired via next/font; landing renders the glass/teal theme.)
- [x] Provision Supabase project + capture URL + anon key into `.env.local`. **DONE** — used Cole's pre-created **`a-c.rubicon`** project (`kecpmrpugjfavdzxejxh`, us-west-2) in the **Cole-Personal** org. Public URL + anon key written to `.env.local`; service-role + gate secrets left blank for Cole.
- [x] Create DB schema migration — `projects`, `tasks`, `tracking_metrics`, `tracking_entries`, `daily_logs`, `daily_plans` + effective-task-weight view + single-user RLS. **DONE** — applied via MCP; all 6 tables visible, RLS enabled. (Advisors: 6× expected `rls_enabled_no_policy` by design; 1 pre-existing `rls_auto_enable` WARN, see NEEDS ME.)
- [x] Wire Supabase client + auth. **DONE** — password gate built + verified (middleware redirect + HMAC roundtrip); `lib/supabase/server.ts` service-role client wired. Live DB reads need `SUPABASE_SERVICE_ROLE_KEY` (Cole adds); schema + project are ready.
- [ ] **NEEDS ME (you chose: build + verify, don't deploy).** Deploy skeleton to Vercel as PWA. PWA manifest + SVG icon are in; PNG icons (192/512) still needed before deploy. Left for you.
- [ ] Pre-deploy hardening (do before the public Vercel deploy, not before M1): (a) add login rate-limiting / brute-force protection (e.g. Vercel KV counter) to `app/login/actions.ts`; (b) add PNG PWA icons 192×192 + 512×512 to `app/manifest.ts`. Flagged by @reviewer.

### M1 — Task layer
> **BUILT** — project provisioned + schema live. Verified as far as possible without the secret: `npm run build`/lint green, DB layer verified via live MCP SQL (insert/select/update/delete + weight ordering), `/projects` SSR-renders 200 behind the gate. **Click-through CRUD needs Cole to paste `SUPABASE_SERVICE_ROLE_KEY`** into `.env.local` (the read path returns empty until then). Reviewed by @reviewer (2 criticals + a11y/tap-target fixes applied).
- [x] Projects: create/edit/list grouped by category (finite / system / habit / later) with priority. **BUILT** — `AddProject` (create), `ProjectHeader` (rename/re-prioritize/archive/delete), grouped by category in `app/projects/page.tsx`.
- [x] Tasks: create/edit with priority (1–5), effort (quick/slot/deep), status, due, nullable project (Inbox for one-offs). **BUILT** — `createTask` + `TaskRow` controls; one-off tasks (project_id null) land in Inbox.
- [x] Effective-weight view + sort tasks by weight / due / status. **DONE** — `task_weights` view live + verified; `getBoard` orders by weight desc.
- [x] Projects/Tasks screen: fast inline add, check-off (sets `completed_at`), priority change, "send to Today" (sets `scheduled_for`). **BUILT** — phone-first, design tokens, inline add with Enter-to-submit. (A task list — NOT a block editor.)
- [x] Projects redesigned as Notion-style priority board (board columns by priority, cards with drag-and-drop reorder).
- [x] Drag-and-drop priority between board columns — dropping a card into a column updates its priority in the DB.
- [x] Dashboard as landing page + bottom tab navigation (Today / Projects / Tracking / Graphs).
- [x] Command palette (Ctrl/Cmd-K) + mobile search button — global shortcut to jump to tasks/projects; login-guarded; error handling hardened.
- [x] Gated trends on Graphs — "log N days to unlock" gate with progress bar + teaser chart.

---

## Backlog (break down with @planner / @task-writer when reached)

- **M2 — Today / Scheduler** (in progress):
  - [x] Today view shell: date + greeting, "Do Next" hero, manually-editable time-block timeline (add/check-off/remove), scheduled-for-today task list, evening recap box → `daily_logs`. Built + rendered (200). `daily_plans`/`daily_logs` data layer + upsert actions done.
  - [x] Google Calendar-style planning view (CalendarView) with drag-to-resize/create blocks and day timeline. Reviewer corrections applied.
  - [x] RecapSheet component (`components/today/RecapSheet.tsx`) — evening recap UI wired to daily_logs.
  - [x] **AI scheduler runtime decided: Claude Code scheduled routine** (`routines/plan-my-day.md` written). Routine calls `get_planning_context` via the app MCP, designs the day, and saves via `save_day_plan`. Skips if Cole hand-edited today (`todayPlanSource === "edited"`). Delivery is in-app (no `ntfy`); the routine IS Claude Code so **no `ANTHROPIC_API_KEY`** — it just needs `MCP_BEARER_TOKEN` in `.env.local` + the MCP connected. See `routines/README.md`.
  - [x] Planning context data layer (`lib/data/planning.ts`) — `getPlanningContext` returns date, lastRecap, scheduledToday, topTasks, activeProjects, activeMetrics, recentAdherence in one call.
  - [x] App MCP server (`app/api/[transport]/route.ts` + `lib/mcp/`) — bearer-token-authenticated remote MCP with read + safe-write tools (get_planning_context, save_day_plan, send_task_to_today, write_recap, etc.).
  - [ ] **NEEDS ME: activate the nightly routine.** Add `MCP_BEARER_TOKEN` to `.env.local` + connect the MCP, then use `/schedule` to register `routines/plan-my-day.md` as a cron (~05:00 Eastern). The cloud cron also needs the Vercel deploy. Full steps: `routines/README.md`.
  - [ ] WHOOP recovery chip + Calendar next-event on the Today view. Both deferred until after the routine is live; will add a WHOOP-read step and GCal-read step to `plan-my-day.md` once credentials are wired.
  - [ ] **NEEDS ME (backlog): Google Calendar sync on the timeline.** Read-only import of GCal events as fixed blocks. Needs Google Calendar OAuth credentials. Deferred until after scheduler is live.
  - [ ] "Re-plan from now" button on Today view (depends on the scheduler existing).
  - [x] **Timezone — FIXED (2026-06-14).** `lib/day.ts` centralizes `APP_TZ` (America/New_York, override via `APP_TIMEZONE`); `todayISO`/`nowHHMM`/`partOfDay` + `insights.ts` buckets are Eastern + DST-safe via `Intl`. `ProjectCard` due-compare too.
- [x] **M3 — Tracking logger:** one-tap metrics (bool/count/scale/duration/note) + expand-to-notes + add-a-metric. **BUILT** — `/tracking`, build+render verified; live save needs the service-role key.
- [x] **M4 — Graphs:** task throughput + plan-adherence (planned vs done) + numeric-metric trend sparklines, dependency-free SVG. **BUILT** — `/graphs`, build+render verified. (Mood-vs-WHOOP-recovery overlay deferred — needs WHOOP data ingestion.)
- [ ] Later (out of v1 scope): M5 phone capture · M6 brain→scheduler · M7 coach · M8 native iOS app.

---

## NEEDS ME (Cole's calls)

- [ ] **NEEDS ME (BLOCKER — gates the whole task layer): free up a Supabase project slot.** Org **A.C Media** (`qnxuocegyegpaemunpxc`) owner `supabase@caius.org` has hit the 2-free-project cap (the other free project is in a different org, not visible here). Pick one:
  1. **Pause** the unused free project at supabase.com/dashboard (reversible) → frees a slot, stays $0. *Recommended if a slot is genuinely idle.*
  2. **Upgrade** A.C Media org to Pro ($25/mo) → unlimited-ish projects, but breaks the "$0 free tier" constraint in VISION.md. Your call.
  3. **Use a different Supabase account** (e.g. one under `colegym9@gmail.com`) — note the connected MCP is authed as `supabase@caius.org`, so this needs reconnecting the integration.
  Once a slot is free, tell me and I run `create_project` → `apply_migration (0001_init.sql)` → write the public URL+anon key to `.env.local`, then unblock M0.5 + all of M1.
  - **DECISION 2026-06-13:** Cole wants to provision under a **`cole-personal`** org. BUT that org is **NOT reachable** by the connected Supabase MCP — `list_organizations` (authed as `supabase@caius.org`) returns only **A.C Media**. **ACTION (Cole):** in your Claude client, reconnect the Supabase MCP integration under the account that owns `cole-personal` (likely `colegym9@gmail.com`). Once it appears in `list_organizations`, I create `ac-rubicon` there (its own free-project quota) and proceed. No code change needed on my side.
- [ ] **NEEDS ME: confirm secret env values** (I left them as placeholders in `.env.local`; I never write real secrets). After provisioning you'll add: `SUPABASE_SERVICE_ROLE_KEY` (Supabase dashboard → Settings → API), `APP_PASSWORD` (your chosen gate password), `SESSION_SECRET` (any long random string — `openssl rand -base64 32`). `ANTHROPIC_API_KEY` + `NTFY_TOPIC` are M2, not needed yet. See `.env.local` comments.
- [ ] **NEEDS ME: GitHub (you chose "set up, leave push to me").** No `gh`/remote available to me. When ready: create an empty private repo `ac-rubicon` on GitHub, then run the one-liner I'll leave in the final summary to push `feature/m0-foundation`.
- [x] **M2 architecture fork DECIDED: Claude Code scheduled routine.** Routine written at `routines/plan-my-day.md`; app MCP server built. Still needs: (a) `ANTHROPIC_API_KEY` + `NTFY_TOPIC` in `.env.local`; (b) `/schedule` to register the cron.
- [ ] **NEEDS ME: confirm auth/RLS model.** I implemented the secure default for a password-gated app: **all DB access server-side via the service-role key; RLS enabled deny-by-default (no anon access).** The browser never holds a Supabase client. Confirm this, or say if you'd rather use the public anon key client-side (simpler to test, less secure — not recommended).

---

## Done

<!-- Completed tasks move here -->
