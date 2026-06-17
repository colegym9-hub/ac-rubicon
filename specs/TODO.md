# Task List — AC Rubicon

> Add tasks here before starting a session. The loop reads this file to find work.
> Format: `- [ ]` pending, `- [x]` done. Add `BLOCKED: reason` or `NEEDS ME: question` inline.
> Full rationale, data model, and estimates: `specs/PLAN.md`.

---

## Where we are — 2026-06-16

- **Supabase is live** and the app is DB-functional (dev gate password `rubicon-dev`). The old project-slot blocker is resolved.
- **M0 / M1 / M2 / M3 / M4 shipped.** Task layer, Today/scheduler, tracking, graphs all built and DB-backed.
- **Brain Expansion B0 → B4 all shipped** (schema, local-brain seed, Today redesign, Brain tab + 4-tab nav, MCP tools + routines).
- **Post-B4 (B5) shipped:** CloudMD SOP editor, project notes, ingest debounce lock, and a brain-chat rewrite to the **direct Anthropic SDK with streaming** (`@anthropic-ai/sdk`).
- **On-demand AI → direct API (2026-06-16):** brain **ingest** (`lib/brain/ingest.ts`) and **re-plan** (`lib/brain/replan.ts`) now run in-app on the Anthropic API like chat — no cloud-routine round-trip. Ingest fires from `POST /api/brain/captures` via `after()` (lock-guarded), backstopped by `POST /api/brain/ingest`; re-plan is `POST /api/today/replan`. Only the **daily planner** + **weekly** routines remain crons. Shared extractions: `lib/brain/convert.ts`, `lib/data/brain-mutations.ts` (MCP `brain-tools.ts` now delegates to these). Now removed (cleanup): `lib/brain/routine.ts` + `writeReplanRequest` + the `BRAIN_*_FIRE_URL/TOKEN` env-var docs + the `process-brain`/`replan-day` routine files.
- **In progress (uncommitted):** responsive sheet polish — desktop sidebar offset + slide-up animation across the bottom sheets; Markdown renderer memoized.
- **Still pending (human-only):** PWA PNG icons; registering the **daily + weekly** routines as crons; WHOOP/GCal wiring. (Vercel deploy-wiring **resolved 2026-06-17** — code now deploys via the `vercel` remote; see the DEPLOY block below.)

---

## Today log ↔ the day + "Tomorrow" link (2026-06-17) ✅

The log's optional fields were floating in one global browser-localStorage blob (no date, invisible to MCP). Now everything is tied to the dated `daily_logs` row, and the "Tomorrow" field links to the next day so the morning planner can read it.

- [x] Migration `0007_daily_plan_note.sql` — `daily_logs.plan_note` (text) + `extra` (jsonb). **Applied + verified on `kecpmrpugjfavdzxejxh`.**
- [x] `writeRecap` now persists `extra` (mood/wins/gratitude/custom + per-block %/notes) on the day's row and write-forwards the "Tomorrow" field to **tomorrow's** `plan_note` (separate column-scoped upserts so neither clobbers the other).
- [x] `getToday` returns `tomorrowNote` (seeds the field → idempotent edits); `getPlanningContext` returns `planNote` so the ~5am planner reads "the note left for today." MCP: `get_today` / `get_planning_context` expose it; `save_recap` gained `tomorrowNote`.
- [x] Shared `addDaysISO` + `isLogged` in `lib/day.ts` (`isLogged` stops a forward-note-only row from counting as "logged" in the morning check-in). RecapSheet reads/writes the dated row instead of localStorage; "Tomorrow" on by default with a hint; Today shows a "Note for today" card.
- [x] Verified end-to-end against the live DB via the preview: write-forward → `daily_logs[tomorrow].plan_note`, read-back re-seeds the field, clear writes null. Today's real recap untouched; no console errors.

## Calendar cloud-sync fix — timezone + live refresh (2026-06-17) ✅

Phone edits weren't showing on desktop. `CalendarView` rolled its own **UTC** date helpers (`toISOString`), so evening edits (ET past ~8pm = already next-day UTC) were filed under *tomorrow's* `daily_plans` row while the server reads "today" in `America/New_York`. Same filing cabinet (Supabase), wrong drawer — the server-side `APP_TZ` fix (line 142) had never reached the client component.

- [x] `CalendarView` now uses the shared app-timezone helpers from `lib/day.ts` (`todayISO`/`addDaysISO`/`nowHHMM`) — deleted the local UTC `isoDate`/`todayStr`; `weekSunday` is noon-UTC-anchored; `shiftMonth` does pure `YYYY-MM` string math; now-line + mount-scroll use `nowHHMM`. Client and server now agree on "today."
- [x] **Live update** across devices without realtime infra: `refreshSelected` re-pulls the selected day via the existing `fetchBlocksForDate` server action on window `focus` + tab-visible, plus a quiet 20s poll (visible tabs only). Guarded by `savingRef` / `gestureRef` / `sheet.open` + a `selectedDateRef` post-fetch re-check so it never clobbers an in-flight save, drag, or open editor. Browser still holds no Supabase client — same service-role-behind-the-gate model.
- [x] Verified via preview: `/today` renders the correct ET date, no console errors; dispatched `focus` → `POST /today 200` (the refetch); hidden-tab poll correctly no-ops. `tsc --noEmit` + `next lint` clean.

## Brain — saved conversations (in progress 2026-06-16)

Threads for "Ask your brain": each chat turn now belongs to a `brain_conversations` row, so the panel can list/reopen past threads and the model gets prior-turn memory on follow-ups.

- [x] Migration `0005_brain_conversations.sql` — `brain_conversations` table + nullable `brain_chats.conversation_id` FK. **Applied + verified on `kecpmrpugjfavdzxejxh`** (table + column + FK index all present).
- [x] `database.types.ts` + `lib/brain/types.ts` — new table/column types + `ConversationSummary` / `ConversationDetail` view-models.
- [x] `lib/data/brain.ts` — `listConversations`, `getConversation` (thread + ordered turns).
- [x] API — `GET /api/brain/conversations`, `GET /api/brain/conversations/[id]`; `POST /api/brain/chat` rewritten to create/continue a thread, feed prior turns to Claude, and return `X-Conversation-Id`.
- [x] UI — `ChatView` New + History controls + thread continuation; new `ConversationList` history panel.
- [x] Migration applied to the live project by Cole; verified via MCP. Shipped in `a5c77f7` + `44c945d` (review fixes: UUID guard, mid-stream history race, history-prefix caching).
- [ ] Optional: full click-through in the running app (ask → reopen from History → follow-up uses memory). Routes confirmed serving + auth-gating; UI is type/lint/review-clean.

## Now / Next

- [ ] **In progress — responsive sheet polish (uncommitted).** Bottom sheets now offset for the desktop sidebar (`md:left-52`) and slide up on open: `AddCaptureSheet`, `AddBlockSheet`, `MorningCheckIn`, `RecapSheet`, `ReplanSheet`. `lib/brain/Markdown.tsx` made a client component + `parse()` memoized. Done = commit; verify sheets sit flush against the sidebar on desktop and full-width on mobile.
- [ ] Deploy to Vercel + register the scheduled routines (see **NEEDS ME — deploy** below). This is the gate on the cloud-side AI (daily planner, weekly lint). On-demand AI (chat, ingest, re-plan) works as soon as `ANTHROPIC_API_KEY` is set — no routine needed.
- [x] Cleanup (low-risk): deleted the now-dead routine-fire layer (`lib/brain/routine.ts`), the unused `writeReplanRequest` in `lib/data/mutations.ts`, and the superseded `routines/process-brain.md` + `routines/replan-day.md`; dropped the `BRAIN_*_FIRE_URL`/`BRAIN_*_TOKEN` references from `routines/README.md` + `AGENTS.md`. The on-demand ingest/re-plan/chat run in-app on the Anthropic API.

---

## Linear-inspired ideas — candidate backlog (2026-06-17)

From the deep study in `research/linear-study.md` (lens: steal Linear's best ideas for ac-rubicon). These are **proposals, not committed work** — Cole picks what's worth building. Already-shipped Linear patterns that validate the direction: OKLCH design tokens (M0), the ⌘K command palette (M1), the drag-and-drop priority board (M1). Below is what's genuinely *additive*.

- [ ] **NEEDS ME (product call): "Week as a cycle" with auto-rollover.** The flagship idea. Treat the week as an auto-repeating cycle where unfinished tasks **auto-carry** to the next day/week instead of being re-copied or stranded (Linear: "no way to keep unfinished issues in a closed cycle"). Builds on the existing weekly plan + `scheduled_for`. Decide: roll over daily, weekly, or both; automatic vs. a one-tap "roll forward."
- [ ] **Triage inbox for tasks** — a review gate between capture/Notion/GCal and "Today," with 4 actions: Accept (schedule) / Decline (drop) / Merge (fold into a task) / Snooze (resurface on a date). Brain `captures` already model an inbox for *knowledge*; this is the same idea for *tasks*, to keep the active list clean.
- [ ] **Snooze / "push to tomorrow" as a one-gesture verb** + swipe actions on the Today list (swipe-right = complete, swipe-left = snooze/reschedule). Today has inline check-off + drag; add defer-as-a-first-class-action (Linear's mobile centerpiece).
- [ ] **Capacity warning from rolling velocity** — flag when a day/week is over-committed vs the last ~3 weeks' completed `effort`. Reuses the existing task `effort` field; no new data needed.
- [ ] **NEEDS ME (product call): Goal/Initiative layer above Projects.** A top tier (Health, Grow channel, Ship ac-rubicon…) grouping Notion projects so every task ladders up to a visible "why," with a 3-state health (on track / at risk / off track) rolled up at weekly recap. Decide whether goals live in Notion or in-app.
- [ ] **"Shipped this week" recap** — auto-generate the list of completed tasks at weekly recap (the personal analog of Linear's changelog). High motivational ROI; reuses `completed_at`.
- [ ] **Enabler vs blocker tag at weekly setup** — a two-bucket prompt (removes friction vs adds value) to bias the week toward needle-movers. Cheap add to `WeeklyPlanCard`.
- [ ] **Perceived-performance pass** — audit Today/Projects for optimistic UI + no-spinner + instant-boot-from-cache (React `useOptimistic`, skeletons over spinners, restore last view from `localStorage`). Linear's cheapest "feels premium" wins; confirm what ac-rubicon already does and close gaps.

---

## WHOOP in-app data (Path B) — planned, not started (decided 2026-06-17)

**Decision:** pull WHOOP health data **into the app** (DB + UI), not just read it at plan-time. Use WHOOP's **OAuth 2.0 REST API** directly — the same API the WHOOP MCP wraps. (MCP stays for the planning *agent*; the app does server-to-server sync via the REST API.)

- [ ] **NEEDS ME:** register a WHOOP developer app → provide `WHOOP_CLIENT_ID` / `WHOOP_CLIENT_SECRET` (env vars, never in code).
- [ ] OAuth connect flow — one-time authorize to capture the access + refresh token; persist server-only in Supabase; refresh on expiry.
- [ ] Sync job → Supabase — new `whoop_*` table(s) for recovery / sleep / cycle (strain) / workouts. Cron route or `POST /api/whoop/sync`. Mirror the WHOOP API shapes (recovery score %, sleep, strain).
- [ ] Today UI — real WHOOP recovery chip (today `MorningCheckIn` is only *WHOOP-styled*, no real data). Unblocks the deferred M4 mood-vs-WHOOP overlay on `/insights` (line 130) and the recovery-chip stub (M2 line 122).
- _Lighter precursor (Path A, already stubbed):_ the daily routine can read WHOOP via its **MCP at plan-time** with none of the above — see `routines/daily.md:35`, `routines/plan-my-day.md:85`. Do this first; Path B is the bigger, in-app build.

---

## Brain Expansion (B0–B5) — ✅ COMPLETE

### B0 — Foundation ✅
- [x] `supabase/migrations/0003_brain.sql`: `raw_sources`, `wiki_pages`, `raw_source_wiki_pages`, `brain_log`, `brain_reports`, `brain_snippets`; `tsvector` + GIN FTS (Postgres FTS, no embeddings); `updated_at` triggers; deny-by-default RLS. Applied via MCP.
- [x] Regenerated `lib/database.types.ts` for the new brain tables; `tsc` clean.
- [x] Root routing refactor — `app/page.tsx` → `/home`; dashboard content moved to `app/home/page.tsx`; `app/dashboard` redirects to `/home`.
- [x] Brain tab shell — `app/brain/page.tsx` + Brain entry in `BottomNav`/`SideNav`.

### B1 — Migrate local brain → Supabase ✅
- [x] `scripts/seed-brain.mjs`: parses `wiki/` → `wiki_pages` (idempotent upsert on slug); `raw-sources/` (md/txt inline, PDF/PPTX skipped with note, `conversations.json` handled) → `raw_sources`; `log.md.md` → `brain_log`.
- [x] Ran the seed + verified row counts and spot-checked `content_md` length.
- [x] FTS indexes populated; sample `to_tsquery` returns relevant rows.

### B2 — Today tab redesign ✅
- [x] `writeRecap()` takes a `date` param (defaults to today) so recaps target the passed day.
- [x] `getYesterdayLog()` in `lib/data/today.ts`.
- [x] Today server actions: `toggleBlockDone`, `saveRecapForDate`, `replanFromNow`.
- [x] Inline block check-off in the timeline (`BlockChip` / `CalendarView`) — persists `daily_plans.blocks[i].done`.
- [x] Logging UI — **folded into `RecapSheet`** rather than a standalone `LogSheet`/`LogFields` (metrics + recap write from Today). Note the original plan's separate `LogSheet` component was not built; RecapSheet covers it.
- [x] `MorningCheckIn.tsx` — once-per-day via `localStorage`; State A (fill yesterday) / State B (review).
- [x] `ReplanSheet.tsx` — "what changed / time left" → `replanFromNow`.
- [x] Wired into `app/today/page.tsx` (MorningCheckIn, RecapSheet, ReplanSheet, WeeklyPlanCard, CalendarView).

### B3 — Brain tab + 4-tab nav swap ✅
- [x] Brain API routes under `app/api/brain/` — `captures/`, `captures/[id]/`, `chat/`, `chat/[id]/`, `save-answer/`, `wiki/`, `sop/`.
- [x] `lib/brain/types.ts` + `lib/data/brain.ts` (`getCaptures`, `getWikiPages`, `getWikiPage`, `searchWiki` via FTS).
- [x] Capture components — `AddCaptureSheet.tsx` (Note / Link / Voice / Image sub-forms).
- [x] Browse components — `CapturesSection` (poll while pending), `CaptureRow`, `CaptureStatusBadge`, `WikiSection`, `WikiPageRow`.
- [x] `app/brain/wiki/[slug]/page.tsx` + wiki page view with edit/PATCH.
- [x] Chat components — `ChatBar`, `ChatView`, `ChatMessage` (renders markdown + `[title](/brain/wiki/slug)` citations). **Markdown via a custom `lib/brain/Markdown.tsx`** — `react-markdown`/`rehype-sanitize` were NOT installed (see resolved NEEDS ME).
- [x] `app/settings/page.tsx` (AddMetric / metric management) + command-palette Settings action.
- [x] **4-tab nav swap** — `BottomNav`/`SideNav` show Today / Projects / Insights / Brain. `app/insights/page.tsx` holds the graphs content; `app/graphs` redirects to `/insights`.

### B4 — Brain MCP tools + routine prompts ✅
- [x] `lib/mcp/brain-tools.ts` — read + write tools (get_sop, get_pending_work, get_brain_pages, get_wiki_page, search_wiki, convert_source, set_source_status, upsert_wiki_page, link_source_to_page, append_brain_log, add_project_note, save_chat_answer, mark_replan_done, save_lint_report, save_insight, get_weekly_plan, save_weekly_plan).
- [x] `routines/process-brain.md` — ingest loop (drain queue → convert → file to wiki or park as needs_review → feed project notes).
- [x] `routines/brain-chat.md` — pending question → search_wiki + planning context → cited answer → save_chat_answer. *(Later superseded in-app by direct Anthropic streaming — see B5.)*
- [x] `routines/replan-day.md` — pending replan_request → redesign future blocks → save_day_plan + mark_replan_done.
- [x] `routines/daily.md` — planner reading the weekly plan + Cole's rhythm anchors; WHOOP/GCal wired as TODO stubs.
- [x] `routines/weekly.md` — wiki lint (save_lint_report) + forward-looking signal (save_insight).
- [x] Weekly plan input UI — `WeeklyPlanCard` on Today (saves to `brain_sops` key `weekly_plan`).
- [x] Project notes UI — `ProjectNotes` on `app/projects/[id]` (list + add; `getProjectNotes` / `addProjectNote`).

### B5 — Cloud loops, SOPs & chat streaming (post-B4) ✅
- [x] `supabase/migrations/0004_brain_loops.sql` — `brain_sops` (the CloudMD: general + per-routine docs), `project_notes`, `brain_run_lock` (single-row ingest debounce), `needs_review` source status.
- [x] CloudMD editor — `components/brain/SopEditor.tsx` + `app/api/brain/sop` route + `scripts/seed-sops.mjs`. In-app editing of the brain rules read by routines.
- [x] Ingest queue debounce — fire `process-brain` only when the lock is stale.
- [x] **Brain chat rewrite → direct Anthropic SDK streaming** (`@anthropic-ai/sdk ^0.104.2`). `app/api/brain/chat/route.ts` streams the answer in-app instead of round-tripping through the cloud routine. Removes the polling/routine dependency for chat.

---

## Earlier milestones (M0–M4)

### M0 — Foundation ✅ (deploy pending)
- [x] Scaffold Next.js 15 (App Router) + TS + Tailwind v4. `npm run build` green.
- [x] Design tokens lifted into `app/globals.css` (OKLCH, glass/pill, fonts).
- [x] Supabase project provisioned (`a-c.rubicon`, `kecpmrpugjfavdzxejxh`, us-west-2); URL + anon key in `.env.local`.
- [x] DB schema `0001_init.sql` — projects, tasks, tracking_metrics, tracking_entries, daily_logs, daily_plans + effective-weight view + single-user RLS.
- [x] Supabase client + password gate (middleware redirect + HMAC); service-role client wired. **Live DB now working** (service-role key in place; dev gate `rubicon-dev`).
- [ ] **NEEDS ME (build + verify, don't deploy): deploy skeleton to Vercel as PWA.** PWA manifest + SVG icon in; **PNG icons 192/512 still needed** before deploy.
- [ ] Pre-deploy hardening (before the public Vercel deploy): (a) login rate-limiting / brute-force protection in `app/login/actions.ts`; (b) PNG PWA icons 192×192 + 512×512 in `app/manifest.ts`. Flagged by @reviewer.

### M1 — Task layer ✅
- [x] Projects: create/edit/list grouped by category with priority (`AddProject`, `ProjectHeader`).
- [x] Tasks: create/edit with priority/effort/status/due, nullable project (Inbox).
- [x] Effective-weight view + sort by weight/due/status (`task_weights`, `getBoard`).
- [x] Fast inline add, check-off (`completed_at`), priority change, "send to Today" (`scheduled_for`).
- [x] Notion-style priority board with drag-and-drop reorder + cross-column priority change.
- [x] Dashboard landing + bottom tab nav (later swapped to the 4-tab Brain nav).
- [x] Command palette (Ctrl/Cmd-K) + mobile search.
- [x] Gated trends on Graphs ("log N days to unlock" + teaser).

### M2 — Today / Scheduler ✅ (cloud cron pending)
- [x] Today view shell — date/greeting, "Do Next" hero, editable block timeline, scheduled-today list, evening recap → `daily_logs`.
- [x] Calendar-style planning view (`CalendarView`) with drag-to-resize/create.
- [x] `RecapSheet` wired to `daily_logs`.
- [x] AI scheduler runtime — Claude Code scheduled routine (`routines/plan-my-day.md`); calls `get_planning_context`, saves via `save_day_plan`; skips hand-edited days.
- [x] Planning context data layer (`lib/data/planning.ts` → `getPlanningContext`).
- [x] App MCP server (`app/api/[transport]/route.ts` + `lib/mcp/`) — bearer-auth remote MCP, read + safe-write tools.
- [x] Timezone fix — `lib/day.ts` centralizes `APP_TZ` (America/New_York, DST-safe via `Intl`).
- [ ] **NEEDS ME: register the nightly routine as a cron** (`/schedule` → `routines/plan-my-day.md`, ~05:00 ET). Needs the Vercel deploy first (routines can't hit localhost) + `MCP_BEARER_TOKEN` set + MCP connected.
- [ ] WHOOP recovery chip + Calendar next-event on Today — deferred until the routine is live (add WHOOP-read + GCal-read steps to the routine once creds are wired).
- [ ] **NEEDS ME (backlog): Google Calendar sync on the timeline** (read-only import of GCal events as fixed blocks). Needs Google Calendar OAuth.
- [x] "Re-plan from now" — shipped in B2 (`ReplanSheet`).

### M3 — Tracking logger ✅
- [x] One-tap metrics (bool/count/scale/duration/note) + expand-to-notes + add-a-metric. `/tracking` built + DB-backed.

### M4 — Graphs ✅
- [x] Task throughput + plan-adherence + numeric-metric sparklines, dependency-free SVG. `/graphs` (now `/insights`) built + DB-backed. (Mood-vs-WHOOP overlay deferred — needs WHOOP ingestion.)

### Later
- [ ] M8 native iOS app — only if PWA limits actually bite.
  - ~~M5 phone capture / M6 brain→scheduler / M7 coach~~ — folded into Brain Expansion (B1–B5).

---

## NEEDS ME (Cole's calls)

### Open
- [ ] **NEEDS ME — DEPLOY (human-only).** Everything cloud-side waits on this:
  1. ~~Wire the deploy to the right repo first.~~ **RESOLVED 2026-06-17** — took option (b): this code now lives on the `vercel` remote (`colegym9-hub/ac-rubicon-vercel`), and pushing `main` there triggers the production deploy. `main` / `feature/m0-foundation` / `fix/calendar-sync` were unified at the latest commit and pushed to both `origin` (github) and `vercel` (deploy). Still recommended before the next deploy: PNG PWA icons 192/512 + login rate-limiting (M0 hardening) — shipped as-is for now.
  2. Add Brain env vars to Vercel: `SUPADATA_API_KEY`, `DEEPGRAM_API_KEY`, `ANTHROPIC_API_KEY` (powers the in-app chat / ingest / re-plan), and `MCP_BEARER_TOKEN` (for the scheduled routines). The `BRAIN_*_FIRE_URL` / `BRAIN_*_TOKEN` vars are no longer needed — ingest + re-plan run in-app now.
  3. In the Claude console, create only the **scheduled** routines by pasting `routines/daily.md` (or `routines/plan-my-day.md`) and `routines/weekly.md` — connect the ac-rubicon MCP to each. (`process-brain.md`, `replan-day.md`, `brain-chat.md` are now in-app on the Anthropic API — no cron.)
  4. First-run test: drop a YouTube-link capture, confirm the routine fires and status goes `pending → processing → done` and the wiki page appears.
- [ ] **NEEDS ME: WHOOP + Google Calendar credentials** — wire WHOOP recovery into Today + the daily routine once provided. **GCal (routine-level) is now specified** — the daily planner reads + writes the **primary** calendar (`routines/sops/daily.md` → "Google Calendar"; `routines/daily.md` steps 6 + 11). To activate: (a) connect a Google Calendar MCP to the routine, and (b) propagate the updated `daily` SOP into the live `brain_sops` row via the in-app SOP editor — do **not** `--force` re-seed (`scripts/seed-sops.mjs` still has a stub for `daily` and would overwrite it). Headless cloud runs may not inherit an OAuth'd Calendar MCP — see `routines/README.md`.
- [ ] **In progress in a separate session (2026-06-17): sync the Tomorrow / Notes recap fields to the DB.** Today the dedicated Tomorrow / Notes / Wins / Mood fields in `RecapSheet` are `db:false` (phone `localStorage` only) and `MorningCheckIn` doesn't capture them, so the cloud routine can't see them — the daily planner reads tomorrow-intentions + notes from `recap_text` instead. Making them first-class = add `daily_logs` columns + wire `RecapSheet` + `MorningCheckIn` + `saveRecap` + `getPlanningContext`.
  - [ ] **Follow-up once those fields land:** update the daily SOP (`routines/sops/daily.md` → "Read yesterday's log") to read the new fields directly instead of mining `recap_text`, and drop the "phone-local / not visible yet" caveat. Re-propagate to `brain_sops` via `/settings/brain`.

### Resolved
- [x] ~~BLOCKER: free up a Supabase project slot.~~ **RESOLVED** — Supabase project `a-c.rubicon` is live; app is DB-functional.
- [x] ~~Confirm secret env values / service-role key.~~ **RESOLVED** — gate + service-role key in place; live DB reads/writes working (dev gate `rubicon-dev`).
- [x] ~~Confirm auth/RLS model.~~ **RESOLVED** — server-side service-role access, RLS deny-by-default, browser holds no Supabase client.
- [x] ~~M2 architecture fork.~~ **DECIDED** — Claude Code scheduled routine + app MCP server.
- [x] ~~Approve `react-markdown` + `rehype-sanitize`.~~ **RESOLVED — not needed.** Built a custom `lib/brain/Markdown.tsx` renderer instead (zero new deps for markdown; `@anthropic-ai/sdk` is the one Brain dependency added, for chat streaming).
- [x] ~~**NEEDS ME: GitHub push**~~ **DONE 2026-06-17** — `feature/m0-foundation` + `main` pushed to `origin` (`colegym9-hub/ac-rubicon`) and `vercel` (`colegym9-hub/ac-rubicon-vercel`).

---

## Done

<!-- See milestone sections above; all of M0–M4 and B0–B5 are checked there. -->
