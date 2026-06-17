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
- **Still pending (human-only):** Vercel deploy + PWA PNG icons; registering the **daily + weekly** routines as crons; WHOOP/GCal wiring.

---

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
  1. **Wire the deploy to the right repo first.** The Vercel project `ac-rubicon-vercel` is connected to a *separate, near-empty* GitHub repo (`colegym9-hub/ac-rubicon-vercel` — only the `vercel.com/new` starter commit), **not** this repo (`colegym9-hub/ac-rubicon`). So `git push origin` here does **not** deploy the app (confirmed 2026-06-16: every Vercel deployment is a redeploy of that one starter commit). Fix: either (a) repoint the Vercel project at `colegym9-hub/ac-rubicon` in the dashboard, or (b) push this code to the `ac-rubicon-vercel` repo. Then deploy `main` → production (after the M0 hardening + env vars below). Add PNG PWA icons 192/512 + login rate-limiting first (M0 hardening).
  2. Add Brain env vars to Vercel: `SUPADATA_API_KEY`, `DEEPGRAM_API_KEY`, `ANTHROPIC_API_KEY` (powers the in-app chat / ingest / re-plan), and `MCP_BEARER_TOKEN` (for the scheduled routines). The `BRAIN_*_FIRE_URL` / `BRAIN_*_TOKEN` vars are no longer needed — ingest + re-plan run in-app now.
  3. In the Claude console, create only the **scheduled** routines by pasting `routines/daily.md` (or `routines/plan-my-day.md`) and `routines/weekly.md` — connect the ac-rubicon MCP to each. (`process-brain.md`, `replan-day.md`, `brain-chat.md` are now in-app on the Anthropic API — no cron.)
  4. First-run test: drop a YouTube-link capture, confirm the routine fires and status goes `pending → processing → done` and the wiki page appears.
- [ ] **NEEDS ME: WHOOP + Google Calendar credentials** — wire WHOOP recovery + GCal events into Today + the daily routine once provided.

### Resolved
- [x] ~~BLOCKER: free up a Supabase project slot.~~ **RESOLVED** — Supabase project `a-c.rubicon` is live; app is DB-functional.
- [x] ~~Confirm secret env values / service-role key.~~ **RESOLVED** — gate + service-role key in place; live DB reads/writes working (dev gate `rubicon-dev`).
- [x] ~~Confirm auth/RLS model.~~ **RESOLVED** — server-side service-role access, RLS deny-by-default, browser holds no Supabase client.
- [x] ~~M2 architecture fork.~~ **DECIDED** — Claude Code scheduled routine + app MCP server.
- [x] ~~Approve `react-markdown` + `rehype-sanitize`.~~ **RESOLVED — not needed.** Built a custom `lib/brain/Markdown.tsx` renderer instead (zero new deps for markdown; `@anthropic-ai/sdk` is the one Brain dependency added, for chat streaming).
- [ ] **NEEDS ME: GitHub push** (you chose "set up, leave push to me"). Create the private repo and push `feature/m0-foundation` when ready.

---

## Done

<!-- See milestone sections above; all of M0–M4 and B0–B5 are checked there. -->
