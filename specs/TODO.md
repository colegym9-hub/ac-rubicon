# Task List — AC Rubicon

> Add tasks here before starting a session. The loop reads this file to find work.
> Format: `- [ ]` pending, `- [x]` done. Add `BLOCKED: reason` or `NEEDS ME: question` inline.
> Full rationale, data model, and estimates: `specs/PLAN.md`.

---

## Current Sprint — M0 Foundation + M1 Task Layer

### M0 — Foundation
- [x] Scaffold Next.js 15 (App Router) + TypeScript + Tailwind v4 in repo root. Done = `npm run dev` serves a styled blank page. (Next 15.5.19 + React 19 + Tailwind v4; `npm run build` green, `GET / 200`.)
- [x] Lift design tokens into `app/globals.css` from `design/globals.css` (OKLCH palette, glass/pill, `.accent`, fonts). Done = sample page shows the dark glass theme. (Tokens lifted verbatim; 4 fonts wired via next/font; landing renders the glass/teal theme.)
- [ ] **BLOCKED — NEEDS ME.** Provision Supabase project via the Supabase MCP; capture URL + anon key into `.env.local`. Tried `create_project` (cost = $0/mo, free tier) but org **A.C Media** owner `supabase@caius.org` has hit the **2 active free project limit**. See NEEDS ME section for the 3 options. Everything below is authored but waits on this.
- [~] Create DB schema migration — `projects`, `tasks`, `tracking_metrics`, `tracking_entries`, `daily_logs`, `daily_plans` + effective-task-weight view + single-user RLS. **Migration AUTHORED at `supabase/migrations/0001_init.sql`; applying it is BLOCKED on the project above.** Done = migration applied, tables visible via MCP.
- [~] Wire Supabase client in `lib/supabase.ts` + auth. **Password-gate auth (your choice) BUILT + TESTABLE; Supabase server client wired (server-side, service-role).** DB calls BLOCKED on project. Done = sign-in works, session persists.
- [ ] **NEEDS ME (you chose: build + verify, don't deploy).** Deploy skeleton to Vercel as PWA. PWA manifest + SVG icon are in; PNG icons (192/512) still needed before deploy. Left for you.
- [ ] Pre-deploy hardening (do before the public Vercel deploy, not before M1): (a) add login rate-limiting / brute-force protection (e.g. Vercel KV counter) to `app/login/actions.ts`; (b) add PNG PWA icons 192×192 + 512×512 to `app/manifest.ts`. Flagged by @reviewer.

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

- [ ] **NEEDS ME (BLOCKER — gates the whole task layer): free up a Supabase project slot.** Org **A.C Media** (`qnxuocegyegpaemunpxc`) owner `supabase@caius.org` has hit the 2-free-project cap (the other free project is in a different org, not visible here). Pick one:
  1. **Pause** the unused free project at supabase.com/dashboard (reversible) → frees a slot, stays $0. *Recommended if a slot is genuinely idle.*
  2. **Upgrade** A.C Media org to Pro ($25/mo) → unlimited-ish projects, but breaks the "$0 free tier" constraint in VISION.md. Your call.
  3. **Use a different Supabase account** (e.g. one under `colegym9@gmail.com`) — note the connected MCP is authed as `supabase@caius.org`, so this needs reconnecting the integration.
  Once a slot is free, tell me and I run `create_project` → `apply_migration (0001_init.sql)` → write the public URL+anon key to `.env.local`, then unblock M0.5 + all of M1.
- [ ] **NEEDS ME: confirm secret env values** (I left them as placeholders in `.env.local`; I never write real secrets). After provisioning you'll add: `SUPABASE_SERVICE_ROLE_KEY` (Supabase dashboard → Settings → API), `APP_PASSWORD` (your chosen gate password), `SESSION_SECRET` (any long random string — `openssl rand -base64 32`). `ANTHROPIC_API_KEY` + `NTFY_TOPIC` are M2, not needed yet. See `.env.local` comments.
- [ ] **NEEDS ME: GitHub (you chose "set up, leave push to me").** No `gh`/remote available to me. When ready: create an empty private repo `ac-rubicon` on GitHub, then run the one-liner I'll leave in the final summary to push `feature/m0-foundation`.
- [ ] **NEEDS ME: confirm auth/RLS model.** I implemented the secure default for a password-gated app: **all DB access server-side via the service-role key; RLS enabled deny-by-default (no anon access).** The browser never holds a Supabase client. Confirm this, or say if you'd rather use the public anon key client-side (simpler to test, less secure — not recommended).

---

## Done

<!-- Completed tasks move here -->
