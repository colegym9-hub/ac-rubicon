# B4 — Brain Routines & Planner Design (working doc)

> Living context for the B4 routine-loops design — especially the **day-planner**, which is still mid-conversation. Written so this can continue in a fresh chat. The technical build state lives in `LOOP-STATE.md`; **this file is the design thread + open questions.**

---

## Where we are (2026-06-14)

**B0–B3 are done, committed, and build-green** (branch `feature/m0-foundation`, not pushed):
- B0 brain schema + `/home` + Brain tab · B1 migrated the brain to Supabase (27 wiki pages, 1,239 sources, 26 log entries) · B2 Today redesign (morning check-in, block check-off, re-plan) · B3 Brain tab (browse/read/edit/capture/chat) + the 4-tab swap (Today/Projects/Insights/Brain) + Settings + Insights.

**B4 is partway built.** The **ingest loop is functionally complete** (commits `47ea989` schema, `0aacad8` CloudMD editor, `0fa36e5` MCP tools, `44a59d2` process-brain + debounce):
- Capture → `raw_sources` + debounced ping → `process-brain` routine reads the in-app CloudMD → converts (Supadata, or transcribes itself) → files to wiki (confident) / parks as `needs_review` (uncertain) / feeds projects.
- The **CloudMD** lives in Supabase (`brain_sops`) and is edited in-app at **Settings → Brain rules** (`/settings/brain`). Routines read it via `get_sop`; they never edit it.
- 11 ingest MCP tools exist (`lib/mcp/brain-tools.ts`): get_sop, get_pending_work, get_brain_pages, get_wiki_page, search_wiki, convert_source, set_source_status, upsert_wiki_page, link_source_to_page, append_brain_log, add_project_note.

---

## Locked design decisions

### CloudMD architecture
- **General `cloudmd` doc** (seeded from `Cole-2nd-Brain/CLAUDE.md`): brain nature, domain table, wiki format, conventions, the full MCP toolbox. Every routine reads it.
- **Per-routine docs** (`ingest`/`chat`/`replan`/`daily`/`weekly`): each routine's job + the tool subset it uses + its own rules. A routine run = general CloudMD + its own doc.
- **Cloud routines stay thin** — Cole only sets the trigger (API call / schedule) + connects the ac-rubicon MCP. All logic is edited in-app; the next run picks it up. (`ingest` is the only doc fully written so far; the other 4 are stubs to fill.)

### Ingest (process-brain) — BUILT
- Drain the whole queue each run, loop till empty. Quick-succession captures = one ping (`brain_run_lock`, ~30s debounce). Daily routine sweeps as backstop.
- Convert app-first (`convert_source` → Supadata); **routine falls back** (transcribes itself) if that errors.
- **Always target the wiki.** Confident → file (standard entry, cross-refs, log). Uncertain OR genuinely new topic → `needs_review`, don't touch the wiki, **never auto-create pages** (Cole decides). Multi-page OK.
- **Also feed projects** when *clearly* relevant: `add_project_note(projectId, …, sourceId)`. Confident-only, skip if unsure (no needs-review for notes). A source can feed both wiki + project.

### Chat routine
- Reads the pending question → searches the wiki (+ project notes + tasks/plans when it's about Cole's work) → answers with citations. One Claude on Cole's subscription does both retrieval and synthesis (the old "Haiku pulls / Sonnet writes" split is **moot** now that chat is routine-based).
- **Save = suggest-then-confirm:** when an answer looks worth keeping, surface a "Save this to your brain?" prompt Cole taps to approve. Manual "Save to brain" button stays too. (The save-answer route already exists; needs the proactive suggest-prompt UI.)

### Weekly routine
- **Lint** the wiki (contradictions, stale claims, orphans, missing cross-refs) → `save_lint_report` → the brain-health chip on Insights.
- **Weekly signal card = FORWARD-LOOKING ONLY**: "here's what to prioritize next week" from the brain + active projects (NOT an accountability recap).

### Google Calendar (Cole's approach — confirmed, and it's the smart one)
- The **daily routine has the GCal MCP**. Each morning it reads Cole's real events, **writes them into the day plan as fixed `event` blocks**, and plans around them. The app's Today calendar shows them because they're now in `daily_plans` — **no in-app Google OAuth needed; the routine is the bridge.**
- On a re-plan, the routine re-reads the calendar and re-flows.
- Accepted tradeoff: an event added mid-day appears at the next run (morning sync or a re-plan), not live.

### Weekly plan input
- A **free-text brain-dump** Cole writes (goals / limitations / what's coming up), **editable all week**. The daily planner reads it to shape each day. (Needs an app feature: a place to write/edit it + storage + the planner reading it.)

---

## OPEN — the day-planner (the make-or-break)

This is the most important piece and the conversation is **unfinished**. The whole point: Cole's old command center fails because *"it's not how I need it,"* so he doesn't follow it. If the plan isn't one he'll actually follow, nothing else matters.

### The diagnosis (Cole's words)
The real failures, in order: **one disruption breaks it** + **it's too rigid** (not every-minute-blocked, but it *"doesn't actually account for real life"*) + **it ignores his rhythm** + **he never bought in**. Core line: *"when stuff comes up, it feels impossible to work around it."* The plan is **brittle** — a single disruption makes the whole thing feel failed, so he bails.

### The proposed fix (to encode in the daily + replan CloudMD docs, tunable)
- **Priorities are sacred; time is flexible.** Backbone = his few big things (the three-slots rule), each with a *suggested* time, not a rigid grid. A slipped block moves the priority — the plan bends, doesn't break.
- **Leave real slack** — don't pack the day, so disruptions have room to land instead of cascading.
- **Plan to his rhythm,** not an idealized 9–5.
- **Re-planning re-flows around the disruption and keeps the priorities** — adjusting should feel like "the plan moved with me," never "I failed it."

### ANSWERED — rhythm anchors (2026-06-16)
- **Deep work**: good **before 2pm** OR **after 6pm** (two windows, not one)
- **Wake time**: varies — planner should read the WHOOP pattern rather than assuming a fixed time
- **Reading**: doesn't need to be scheduled; can be tracked as a metric
- **Content creation**: schedule it, but keep the prompt/instructions open to change as Cole finds his flow
- **Will change**: when college starts, re-tune all of this

### ANSWERED — what makes re-planning feel easy (2026-06-16)
- **One field, auto time**: the Re-plan sheet is now just "What changed?" + auto-computed time remaining (~Xh left). No picker.
- The plan should roll with the disruption and keep priorities — it never makes Cole feel like he "failed" the original plan.

*(Still to surface: how the planner should handle the WHOOP wake-time signal in practice — does it delay deep-work blocks, or just note the wake time for context? Leave for first live run.)*

---

## What's left to build in B4
- **The personalized planner** (above): the weekly-plan input feature (write/edit + storage + planner reads it); the GCal-bridged daily routine; the daily + replan CloudMD docs encoding the priorities-over-rigidity philosophy; the daily routine = plan + capture-sweep (retire `routines/plan-my-day.md` into it).
- **The 4 routines** (chat / replan / daily / weekly): fill each `brain_sops` doc (content), add their MCP tools (`save_chat_answer`, `save_replan_plan`, `save_lint_report`, `save_insight`), and write a thin `routines/*.md` shell each (mirror `routines/process-brain.md`).
- **Chat suggest-then-confirm** save UI.
- **Project notes display** [solo, specced]: a Notes section on `app/projects/[id]` (getProjectNotes + addProjectNote action + manual-add form); `getPlanningContext` reads active-project notes so the planner/chat use them.
- **Deferred:** voice/image capture (Supabase Storage + upload); folding tracking metrics into the Today log sheet (from B3).

## Eventually Cole's (post-build wiring)
Deploy to Vercel · create the routines in the Claude Code UI (paste the thin prompts, connect the ac-rubicon MCP + the GCal MCP on the daily/replan ones) · add per-routine `BRAIN_PROCESS/CHAT/REPLAN_FIRE_URL` + `_TOKEN` to env · first-run test (drop a YouTube link → watch it land in the wiki).

> **To continue in a fresh chat:** hand it this file + `LOOP-STATE.md`. Resume at "OPEN — the day-planner" → the two unanswered questions.
