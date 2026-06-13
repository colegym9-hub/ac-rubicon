# AC Rubicon — Build Plan & Feasibility Read

## Context
Cole's braindump (`Cole-2nd-Brain/raw-sources/ac-rubicon-braindump-2026-06-13.md`) describes **AC Rubicon** — one system that unifies his **second brain** (a working markdown LLM-wiki) and his **command center** (daily planning), "optimizing my past into building my future." He asked for an honest feasibility read + non-swingy estimate before building. After review he set the direction:
- **Clean slate** — design the right system, don't inherit the half-built Electron desktop app.
- **Long-term home = a custom app with a "Notion-like UI" we build**, which is the **source of truth** for projects/tasks/tracking.
- **Priority order:** task layer → scheduler rebuild → daily tracking → graphs **first**; then phone capture; then more.
- **Brain treated as current** — no bulk re-ingest now.

## Feasibility verdict
**Doable, and further along than it looks** — ~60–70% of the plumbing already exists: the brain engine runs (172-line `CLAUDE.md` schema over ~1,250 sources → 29 wiki pages); WHOOP / Google Calendar / Gmail / Notion / ntfy MCPs are connected; the daily-recap habit is already in place. The work is to build the command-center layers Cole wants, on a phone-reachable surface, with the brain feeding context. Technical risk is low; the real cost is **behavioral tuning** of the scheduler over weeks of real use.

## Architecture (the decision)
**Next.js 15 PWA on Vercel + Supabase Postgres as source of truth. The markdown brain stays as-is — read for planning context, never the task store.**

- **Frontend:** one Next.js app, installed to the phone home screen as a PWA (no App Store). Lifts the existing design tokens from `A.C Rubiocron/src/app/globals.css` verbatim (OKLCH palette, glass/pill, `.accent`). On your phone the moment it deploys.
- **Backend:** Supabase = Postgres (tables below) + single-user Auth + Edge Functions (scheduler/coach) + auto-generated TS types. I stand it up via the connected Supabase MCP; Vercel deploy via the Vercel MCP.
- **Brain coexistence:** stays local and authoritative; the scheduler/coach receive a small curated slice (primarily `wiki/summer-2026-command-center.md`) as context passed into the planning call — no fragile cloud→local bridge in v1.
- **AI calls:** scheduler is a nightly Supabase **edge function** → Claude Messages API → structured day plan → writes to Google Calendar + pushes via ntfy. Cheap model for nightly planning (~a few cents/day); strong model only for weekly review. *(Confirm current model ids/pricing via the `claude-api` skill at build time.)*

## "Notion-like UI" — what we build vs what we don't
**Yes — realistic, because we build four specific opinionated views, not Notion.** Build: a clean, fast, Notion-*flavored* surface (your dark aesthetic, cards, inline edit, keyboard-fast entry, projects sidebar) over a **fixed schema**. **Do NOT build:** (a) a general block/rich-text editor, (b) a user-definable relational-DB engine, (c) real-time collaboration, (d) an offline-first sync engine. Each is a multi-month product; you're a single user who needs a tool, not a platform. Free-form prose stays in the markdown brain; structured life-ops live in the app.

## Data model (lean — 5 tables + 2 views)
- **`projects`** — name, description?, priority(1–5), status(active/someday/done/archived), category?(finite/system/habit/later — mirrors the command-center registry), brain_ref?(→ wiki page), target_date?.
- **`tasks`** (built first) — title, project_id **nullable** (one-off Inbox tasks), priority(1–5), effective `weight` (computed view), status(todo/doing/done/blocked/dropped), effort(quick/slot/deep or est_minutes), due?, scheduled_for?, notes?, completed_at.
- **`tracking_metrics`** — key, label, type(bool/count/scale/duration/note), active, sort. *(Adding a new thing to track = one row, no code change.)*
- **`tracking_entries`** — metric_id, date, value_num?, value_text? (the "expand into notes" payload).
- **`daily_logs`** (nightly recap) — date(unique), recap_text, slots_done?, slots_slipped? (what didn't + why), energy?, parsed?(jsonb).
- **`daily_plans`** (scheduler output) — date(unique), blocks(jsonb time-blocks), source(auto/edited), calendar_synced, rationale?.

## The four v1 surfaces
- **A. Projects / Tasks** — projects grouped by category; tasks sorted by effective weight/due; fast inline add; one-off "+ task" → Inbox; check-off, drag-priority, "send to Today." A task list with priority + effort, **not** a block editor.
- **B. Today / Scheduler** (centerpiece) — date + greeting + WHOOP chip + next-event; the time-blocked day as a timeline (3 big slots, edges, fixed events) each with task + one-line rationale; **phone-adjustable** (drag/swap/defer + "re-plan from now"); "Do Next" hero; evening recap box → `daily_logs`.
- **C. Tracking logger** — big one-tap targets for active bool/count metrics; expander reveals a note field; "track something new" inserts a metric. Phone-first, thumb-sized, offline-tolerant write queue.
- **D. Graphs / Insights** — task throughput by project; tracking trends (e.g. mood vs WHOOP recovery); **plan-adherence chart** (planned vs done vs slipped) as the honesty mirror. A few real charts (Recharts), not a BI tool.

## The scheduler (centerpiece — fixes what failed before)
The old one was hard-coded, ignored priorities, and Cole "didn't follow it." Redesign:
- **Inputs:** top unblocked tasks by weight+effort; Google Calendar (schedule *around* fixed events); WHOOP (calibrate load to recovery); **last night's recap** (unfinished high-priority work rolls forward — "tomorrow responds"); command-center spine/guardrails as context.
- **Logic (Claude, not hard-coded):** the three-big-slots rule from your own command-center page, fitted to today's calendar + recovery, with a **rationale** so you trust it.
- **Output:** plan → Today view + Google Calendar + **ntfy push to your phone before you're at your desk.**
- **"Not at my computer till later" fix:** generated pre-dawn, pushed to phone, fully adjustable from the phone, "re-plan from now" so a late start doesn't break the day.
- **Loop:** nightly plan → adjust during day → night recap (done/slipped/why) → feeds tomorrow → weekly model reads the week and tunes priorities.

## Build sequence — your priority order
Each milestone is independently usable; you live in it before the next is built (that *is* the de-risking).
- **M0 Foundation** — Supabase project + 5 tables; Next.js+Vercel with design tokens; single-user auth. *Empty-but-real app on a phone URL.*
- **M1 Task layer** (#1) — projects/tasks CRUD, priority weighting, one-off Inbox, the Projects/Tasks view.
- **M2 Scheduler** (#2) — Today view + nightly edge function (tasks+calendar+WHOOP+recap+brain context → Claude → Google Cal + push); phone-adjustable; recap→next-day loop.
- **M3 Tracking** (#3) — metrics + entries + one-tap/expand logger + add-a-metric.
- **M4 Graphs** (#4) — throughput, trends, adherence mirror.
- **★ v1 daily driver complete (M1–M4) — live in it a few weeks before building more.**
- **M5 Phone capture** (#5) — paste link / voice / photo-OCR / typed note → markdown → brain (Web Share Target + vision/speech calls). First place PWA limits may appear.
- **M6 Brain→scheduler** (#6) — richer automatic brain context into planning. *Gated by staleness (below).*
- **M7 Coach** (#7) — weekly reviews + pattern-calling over logs+brain+tracking. *Most exposed to staleness.*
- **M8 Native iPhone app** (#8, last, conditional) — only if PWA limits actually bite; Expo/React Native reusing the Supabase backend.

## Honest estimates
AI-build = me building, you reviewing. Cole-manual = decisions, account/OAuth setup, entering real data, testing. Lived-in = calendar-weeks of use before it *fits* (only scheduler/coach need this — pulled out of build-hours so it can't masquerade as runaway engineering).

| Milestone | AI-build hrs | Cole-manual hrs | Lived-in | Swing factor → containment |
|---|---|---|---|---|
| M0 Foundation | 3–6 | 2–4 | — | OAuth friction → I drive via MCPs; one sitting. |
| M1 Task layer | 8–14 | 3–5 | — | UI scope creep → list+priority+effort only. |
| M2 Scheduler | 12–22 | 3–5 | **3–4 wks** | Prompt/"fit" iteration → timebox build, move tuning into the recap loop. |
| M3 Tracking | 5–9 | 1–2 | ~1 wk | Metric sprawl → schema absorbs new metrics free. |
| M4 Graphs | 5–9 | 1 | — | "one more chart" → ship the 3 named charts. |
| **v1 subtotal (M0–M4)** | **~33–60** | **~10–17** | **~3–4 wks** | |
| M5 Phone capture | 10–18 | 2–4 | — | OCR/voice/iOS reliability + cloud→local seam → ship paste+note first. |
| M6 Brain→scheduler | 6–12 | 1–2 | ~1–2 wks | Context tuning → keep curated/small; capped by staleness. |
| M7 Coach | 10–20 | 2–4 | **2–4+ wks** | Fuzziness + staleness → weekly-review first, judge value. |
| M8 Native app | 25–50+ | 6–12 | — | New platform/review → only if PWA blocks you. |

**Why this won't swing 5–10×:** the code (M0–M4) is well-understood CRUD + one edge function + charts over a fixed schema (~1.7× ranges). The open-ended cost is behavioral tuning, expressed as calendar-weeks, not hidden in build-hours. Every milestone is timeboxed and independently shippable — if something balloons we stop at a working version and you're still ahead.

**Cost:** Supabase free + Vercel hobby = $0 for a single user a long time; only real variable is Claude API for nightly planning ≈ **$1–5/mo** at v1.

## Risks & de-risking
1. **Over-building UI before the habit proves out** (highest) → ship plain M1, force a week of real use before any polish; adherence chart tells the truth early.
2. **A scheduler you again don't follow** → not hard-coded; shows rationale; recovery-calibrated + recap-responsive; on your phone before your desk; adherence chart makes drift visible. If after 3–4 weeks you still don't follow it, that's a signal to simplify to *suggestions* — and you'll have the data.
3. **Setup friction for a non-dev** → I drive Supabase/Vercel via MCPs; your part is approving OAuth + pasting a key; one guided sitting.
4. **Brain staleness** — only ~3 weeks of ChatGPT is actually ingested (the 3-yr export is un-ingested). M1–M4 don't care (they run on new data). M6/M7 ("understands my past") will feel thin until more history accrues — but M5 capture feeds the brain continuously, so the coach improves with use. Judge the coach after months of capture, not day one. *(This is the likely reason it feels "macro, not micro" — the latent lever if that complaint returns.)*

## Verification (how we know each works)
- **M1:** you abandon scattered lists and manage real projects/tasks here for a week.
- **M2:** on a real morning, the pushed plan respects priorities + last night's recap, reaches your phone before your desk, and you actually follow it; tune over ~2 weeks.
- **M3:** one-tap logging from the phone, daily.
- **M4:** charts render real history; the adherence chart reflects reality; a surfaced pattern rings true.
- **M5:** from your phone, paste a reel / record a memo / snap a photo → clean markdown lands in `raw-sources/` and the brain can answer about it.

## Critical files / salvage
- `A.C Rubiocron/src/app/globals.css` — design tokens to lift verbatim.
- `A.C Rubiocron/src/app/page.tsx` — visual/layout spec for the Today view (reuse look, replace mock data).
- `Cole-2nd-Brain/wiki/summer-2026-command-center.md` — conceptual ancestor of the scheduler (spine, three-slot rule, guardrails, recap loop).
- `Cole-2nd-Brain/CLAUDE.md` — brain ingest format M5 writes to / M6–M7 read.
- `Cole-2nd-Brain/wiki/index.md.md` — map of brain pages + `brain_ref` targets.

## Open threads (non-blocking)
- Your Q2 answer trailed off after "phone capture… and then" — confirm whether anything else ranks ahead of the coach/native app.
- Brain re-ingest stays deferred by your call; revisit only if the coach (M7) underwhelms.

> Status: plan complete. Nothing executes until Cole gives an explicit go. Natural first move when ready: **M0 + M1** (stand up Supabase + Vercel + the task layer) — everything depends on them and M1 is livable within the first work session.
