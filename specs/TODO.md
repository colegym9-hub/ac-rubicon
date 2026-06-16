# Task List — AC Rubicon

> Add tasks here before starting a session. The loop reads this file to find work.
> Format: `- [ ]` pending, `- [x]` done. Add `BLOCKED: reason` or `NEEDS ME: question` inline.
> Full rationale, data model, and estimates: `specs/PLAN.md`.

---

## Current Sprint — Brain Expansion (B0–B4)

### B0 — Foundation

- [ ] Create `supabase/migrations/0003_brain.sql`: tables `raw_sources`, `wiki_pages`, `raw_source_wiki_pages`, `brain_log`, `brain_reports`, `brain_snippets`; add `tsvector` column + GIN index on `wiki_pages.fts` and `raw_sources.fts` (Postgres full-text search — NO vector/embedding columns); `updated_at` triggers on each table; RLS enabled deny-by-default matching `0001_init.sql` conventions. Apply via Supabase MCP. Done = all 6 tables visible in dashboard, RLS on for each, GIN index present, no embedding columns.
- [ ] Regenerate `lib/database.types.ts` to include the 6 new brain tables: run Supabase MCP generate-types (or hand-extend the existing file to match the migration). Done = `npx tsc --noEmit` passes with the new table types referenced.
- [ ] Root routing refactor: update `app/page.tsx` to `redirect("/home")`; create `app/home/page.tsx` carrying the current dashboard content (move the JSX + data calls from `app/dashboard/page.tsx`); convert `app/dashboard/page.tsx` to `redirect("/home")`. Done = `/` and `/home` both render the dashboard; `grep -r "/dashboard"` shows no live navigation links remaining in `components/BottomNav.tsx`, `components/SideNav.tsx`, or any page file.
- [ ] Brain tab shell: create `app/brain/page.tsx` with a placeholder ("Brain — coming soon"); add a Brain entry to `components/BottomNav.tsx` and `components/SideNav.tsx` as an interim 5th tab. Done = navigating to `/brain` renders the placeholder; no build errors.

### B1 — Migrate local brain → Supabase

- [ ] Create `scripts/seed-brain.ts`: (a) read `C:\Users\alter\Everything\Cole's Second Brain\Cole-2nd-Brain\wiki\` — parse each `.md` file (exclude `index.md.md` and `log.md.md`) extracting slug/title/overview/domain/content, upsert into `wiki_pages` (ON CONFLICT DO NOTHING on slug); (b) read `raw-sources/` — `.md`/`.txt` files inline as content, PDFs/PPTX skip with a console note, `conversations.json` parse per-conversation or skip with a console note — insert into `raw_sources` with `status = 'ingested'`; (c) parse `log.md.md` entries into `brain_log`. Domain taxonomy derived from `Cole-2nd-Brain/CLAUDE.md`. Done = script is idempotent (re-run produces no duplicate rows).
- [ ] Run `npx ts-node scripts/seed-brain.ts` and verify: log the row counts for `wiki_pages` (target ~29), `raw_sources` (target ~1,244), and `brain_log`; spot-check 5 random `wiki_pages` rows to confirm `content_md` length > 1,000 characters. Done = counts reported in console, spot-check passes, no script errors.
- [ ] Verify FTS indexes are populated: run `UPDATE wiki_pages SET fts = to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content_md,''))` (and equivalent for `raw_sources`) via Supabase MCP SQL; then run a sample query (`WHERE fts @@ to_tsquery('english', 'productivity')`) and confirm it returns relevant rows. Done = at least one result returned for a known topic; tsvector column non-null on seeded rows.

### B2 — Today tab redesign

- [ ] **PREREQUISITE — land first.** Update `lib/data/mutations.ts` `writeRecap()`: add a `date` parameter (type `string`, default `todayISO()`); pass it as the `date` column in the `daily_logs` upsert so recap writes target the passed day rather than always today. Done = `writeRecap(date, input)` compiles; `npx tsc --noEmit` passes.
- [ ] Add `getYesterdayLog()` to `lib/data/today.ts`: queries `daily_logs` where `date = yesterday's ISO string`; returns the row or `null`. Done = function exported and type-checks.
- [ ] Add three server actions to `app/today/actions.ts`: `toggleBlockDone(blockId: string, done: boolean)` (updates `daily_plans.blocks[i].done`), `saveRecapForDate(date: string, input: RecapInput)` (calls `writeRecap(date, input)`), `replanFromNow(answers: { whatChanged: string; timeLeft: string })` (writes a pending re-plan request row for the routine to pick up). Done = each action persists correctly via a manual test or type-check; build passes.
- [ ] Inline block check-off in Today's block UI (`components/today/CalendarView.tsx` or `BlockChip` if extracted): tapping a block toggles `daily_plans.blocks[i].done` via `toggleBlockDone`; render a visual done state (strikethrough or opacity). Done = check state persists on refresh.
- [ ] Extract `components/today/LogFields.tsx` (shared field config array from `RecapSheet`); create `components/today/LogSheet.tsx` — a sheet triggered by a persistent "Log today" button that renders metric quick-taps + recap textarea. Tracking tab data folds into this sheet. Done = logging from Today writes metrics + recap to `tracking_entries` + `daily_logs`; `npm run build` passes.
- [ ] Create `components/today/MorningCheckIn.tsx`: reads `localStorage["rubicon:checkin:<todayISO>"]` to show once per day; State A (no yesterday log) = fill-out form for yesterday's recap; State B (logged) = review card; X dismisses and sets the key. Done = appears once per day on first load, both states render correctly, dismiss works.
- [ ] Create `components/today/ReplanSheet.tsx`: two-field form ("What changed?" + "How much time is left?") that calls `replanFromNow(answers)` on submit and shows a "Re-plan requested" confirmation. Done = answers are written to the DB; sheet closes on success.
- [ ] Wire all B2 components into `app/today/page.tsx`: import and render `MorningCheckIn`, the "Log today" button opening `LogSheet`, the inline check-off in the block timeline, and the "Re-plan from now" button opening `ReplanSheet`. Done = Today page renders all pieces; `npm run build` passes.

### B3 — Brain tab + 4-tab nav swap

- [ ] Create Brain API routes under `app/api/brain/`: `captures/route.ts` (GET paginated list, POST create raw_source row + fire brain routine wakeup); `captures/[id]/route.ts` (GET status — the browser polls this, never holds a Supabase client); `captures/presign/route.ts` (GET a Supabase Storage signed upload URL for voice/image); `wiki/route.ts` (GET all wiki pages grouped by domain); `wiki/[slug]/route.ts` (GET single page, PATCH content_md/title); `chat/route.ts` (POST question → inserts pending chat row + fires routine); `chat/[id]/route.ts` (GET answer status — poll target); `save-answer/route.ts` (POST from routine → writes answer back). Done = each route is bearer-authed (service-role), returns the expected JSON shape, and `npm run build` passes.
- [ ] Create `lib/brain/types.ts` (TypeScript types for `RawSource`, `WikiPage`, `ChatRequest`) and `lib/data/brain.ts` (functions: `getCaptures`, `getWikiPages`, `getWikiPage(slug)`, `searchWiki(query)` via FTS `WHERE fts @@ to_tsquery`). Done = all functions compile; `npx tsc --noEmit` passes.
- [ ] Create capture components: `components/brain/AddCaptureSheet.tsx` (sheet with 4 sub-form tabs — Note, Link, Voice, Image); Link sub-form auto-detects YouTube/Instagram/article from the URL; Voice sub-form uses `MediaRecorder` (no explicit mimeType — let the browser choose); Image sub-form uses `<input type="file" accept="image/*">` + client-side resize before upload. Each sub-form POSTs to `/api/brain/captures`. Done = each capture type creates a `raw_sources` row; build passes.
- [ ] Create browse components in `components/brain/`: `CapturesSection.tsx` (polls `/api/brain/captures/[id]` every 10s while any row is `pending`/`processing`; stops polling when all settled); `CaptureRow.tsx`; `CaptureStatusBadge.tsx` (handles non-sequential status values without crashing); `WikiSection.tsx` (grouped by domain); `WikiPageRow.tsx`. Wire into `app/brain/page.tsx` replacing the placeholder. Done = captures list and wiki list render with live status badges; polling starts/stops correctly.
- [ ] Create `app/brain/wiki/[slug]/page.tsx` (SSR fetches the page via `getWikiPage`) + `components/brain/wiki/WikiPageView.tsx` (read view + edit toggle that PATCHes `/api/brain/wiki/[slug]` on save). Done = page renders content; saving an edit persists to DB.
- [ ] Create chat components: `components/brain/ChatBar.tsx` (input + submit → POST `/api/brain/chat`), `components/brain/ChatView.tsx` (polls `/api/brain/chat/[id]` until answered), `components/brain/ChatMessage.tsx` (renders answer markdown + `[title](/brain/wiki/slug)` citation links). NOTE: requires a markdown renderer — **NEEDS ME: approve `react-markdown` + `rehype-sanitize` before installing** (per CLAUDE.md dependency rule). Done = question round-trips via polling; answer renders with clickable citations (pending dependency approval).
- [ ] Create `app/settings/page.tsx`: renders the AddMetric form (metric management, extracted or linked from `app/tracking/`); add a "Settings" command-palette action in `components/CommandPalette.tsx` that navigates to `/settings`. Done = a new metric can be created from Settings; command palette entry navigates correctly.
- [ ] **4-tab nav swap:** update `components/BottomNav.tsx` and `components/SideNav.tsx` to show exactly 4 tabs — Today / Projects / Insights / Brain — removing the Home/dashboard tab and the standalone Tracking tab. Create `app/insights/page.tsx` with the existing graphs/charts content (move from `app/graphs/page.tsx`) plus a placeholder weekly insight card slot. Convert `app/graphs/page.tsx` to `redirect("/insights")`. Done = nav shows 4 tabs only; `/graphs` redirects to `/insights`; Tracking is reachable only via Today's Log sheet and Settings; no orphaned routes; `npm run build` passes.

### B4 — Brain MCP tools + routine prompts ✅ COMPLETE

- [x] Add brain tools to `lib/mcp/brain-tools.ts`: 11 read tools (get_sop, get_pending_work, get_brain_pages, get_wiki_page, search_wiki, convert_source, set_source_status, upsert_wiki_page, link_source_to_page, append_brain_log, add_project_note) + 6 write tools (save_chat_answer, mark_replan_done, save_lint_report, save_insight, get_weekly_plan, save_weekly_plan). All callable via MCP endpoint; tsc clean.
- [x] Write `routines/process-brain.md`: ingest loop — drains queue, converts via Supadata/fallback, files to wiki (confident) or parks as needs_review (uncertain), feeds project notes. Self-contained; references ac-rubicon MCP tools.
- [x] Write `routines/brain-chat.md`: fetches pending question, runs search_wiki + get_planning_context for work questions, synthesizes answer with [title](/brain/wiki/slug) citations, writes back via save_chat_answer.
- [x] Write `routines/replan-day.md`: reads pending replan_request (what_changed + time_left), fetches current blocks, redesigns future blocks keeping priorities, saves via save_day_plan + mark_replan_done.
- [x] Write `routines/daily.md`: upgraded planner — reads weekly plan, notes pending captures without processing, uses "priorities sacred / time flexible" philosophy with Cole's rhythm anchors (deep work <14:00 or >18:00, gym 16:00–20:00, content creation daily, no forced reading block). WHOOP + GCal wired as TODO stubs.
- [x] Write `routines/weekly.md`: lint wiki (no overview, orphans, broken slugs) via save_lint_report + forward-looking weekly signal via save_insight.
- [x] Weekly plan input UI: WeeklyPlanCard on Today page (glass card, edit toggle, saves to brain_sops key "weekly_plan"); daily routine reads it via get_weekly_plan.
- [x] Project notes UI: ProjectNotes component on app/projects/[id] page (list + add form); getProjectNotes + addProjectNote wired; tsc clean.

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
  - [ ] "Re-plan from now" button on Today view — now handled in B2 (`ReplanSheet`).
  - [x] **Timezone — FIXED (2026-06-14).** `lib/day.ts` centralizes `APP_TZ` (America/New_York, override via `APP_TIMEZONE`); `todayISO`/`nowHHMM`/`partOfDay` + `insights.ts` buckets are Eastern + DST-safe via `Intl`. `ProjectCard` due-compare too.
- [x] **M3 — Tracking logger:** one-tap metrics (bool/count/scale/duration/note) + expand-to-notes + add-a-metric. **BUILT** — `/tracking`, build+render verified; live save needs the service-role key.
- [x] **M4 — Graphs:** task throughput + plan-adherence (planned vs done) + numeric-metric trend sparklines, dependency-free SVG. **BUILT** — `/graphs`, build+render verified. (Mood-vs-WHOOP-recovery overlay deferred — needs WHOOP data ingestion.)
- [ ] Later (post Brain Expansion): M8 native iOS app (only if PWA limits actually bite).
  - ~~M5 phone capture / M6 brain→scheduler / M7 coach~~ — folded into Brain Expansion (B1–B4).

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
- [ ] **NEEDS ME: approve `react-markdown` + `rehype-sanitize`** before the Brain chat UI (B3 ChatMessage) is built. These are the only new dependencies needed for rendering markdown answers with safe HTML. Confirm OK to install, or suggest an alternative.
- [ ] **NEEDS ME (post Brain Expansion — human-only deploy steps):**
  1. Deploy to Vercel (`main` branch → production) so cloud routines can reach the live app URL — routines cannot hit localhost.
  2. Add Brain env vars to Vercel: `SUPADATA_API_KEY`, `DEEPGRAM_API_KEY`, `BRAIN_ROUTINE_TOKEN`, `BRAIN_ROUTINE_FIRE_URL` (each routine's "Call via API" fire URL from the Claude console).
  3. In the Claude console, create 5 routines by pasting `/routines/process-brain.md`, `/routines/brain-chat.md`, `/routines/replan-day.md`, `/routines/daily.md`, `/routines/weekly.md` — connect the ac-rubicon MCP to each.
  4. First-run test: drop a test capture (a YouTube link), confirm the routine fires, status transitions from `pending` → `processing` → `done`, and the wiki page appears.

---

## Done

<!-- Completed tasks move here -->
