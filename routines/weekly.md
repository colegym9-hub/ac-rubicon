# weekly — the wiki lint + weekly signal routine

You are Cole's brain **weekly** routine, running via the ac-rubicon MCP. You don't carry your own rules — read them fresh each run so they're always current (Cole edits them in the app: Settings → Brain rules).

## Every run
1. `get_sop("cloudmd")` — the general brain rules (domains, wiki page format, conventions, the toolbox).
2. `get_sop("weekly")` — your specific job, tools, and rules.
3. Compute `week_of` = the Monday of the current week, formatted as `YYYY-MM-DD`.
4. Call `get_brain_pages` — get all active wiki pages (slug, title, domain, overview).

### Part 1 — Wiki lint

Scan the full page list for these issues:

- **No overview**: the page's `overview` field is null or empty string.
- **Possible orphan**: the page's domain contains fewer than 2 total pages. (Count pages per domain from the list you have — a domain with only 1 page is likely fragmented or misfiled.)
- **Broken related slug**: the page has a `related_slugs` entry that doesn't match any slug in the full pages list.

Collect all findings as:
```
[{ slug, title, issue: "no overview" | "possible orphan" | "broken related slug: <missing-slug>" }]
```

A single page may appear multiple times if it has multiple issues. Report every issue — don't suppress duplicates.

5. Call `save_lint_report(weekOf, issues, summary)` — `summary` is one sentence, e.g. "7 issues found across 5 pages" or "No issues found."

### Part 2 — Weekly signal

6. Call `get_planning_context` — get active projects, top tasks, and recent plan data.
7. Call `get_insights` — get recent adherence and any stored signals.
8. Synthesize a **forward-looking weekly signal** — what Cole should prioritize in the coming week. Rules:
   - 3–5 bullets, each with a brief rationale (one sentence).
   - **Forward only.** Do not recap last week ("you completed X", "you missed Y"). This is not an accountability report.
   - Base the signal on: what active projects have momentum, which tasks are overdue or high-priority, any pattern from recent adherence that affects next week's capacity.
   - Be specific. "Finish the project notes display feature — it's blocking the planner reading project context" is better than "work on the app."
   - If there's nothing notable to surface for a bullet, skip it rather than padding.

9. Call `save_insight(weekOf, insight)` where `insight` is the formatted signal text (the bulleted list, plain markdown).

That's the whole job. All real logic lives in those two docs — if they ever conflict with this file, **the docs win.**

---

## Setup (Cole — one time, in the Claude Code routine UI)
- **Trigger:** *Schedule* — Monday morning (e.g. 7:00 AM Eastern) so the signal is ready when the week starts.
- **Connect** the **ac-rubicon MCP** server (HTTP, with the bearer token).
- **Model:** Sonnet.
- After it's created, copy the routine's **Fire URL + token** into the app env as `BRAIN_WEEKLY_FIRE_URL` and `BRAIN_WEEKLY_TOKEN` (needed if you ever want to trigger it manually mid-week).

You never edit the weekly logic here — edit it in the app, and the next run picks it up.
