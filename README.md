# AC Rubicon

A personal life-OS that unifies Cole's **second brain** (a markdown LLM-wiki of his sources) with a **command center** (daily planning) — a phone-installable app where projects, tasks, and daily tracking live, and an AI scheduler plans each day from tasks + Google Calendar + WHOOP + the previous night's recap.

> "Optimizing my past into building my future."

Built on a Claude Code **loop-engineering** template: you fill the planning files, then `/loop` works through `specs/TODO.md` one task at a time, delegating to the specialists in `.claude/agents/` (context, planner, debugger, reviewer, git).

## Status

**Planning setup complete — ready to build.** Current phase: **M0 (Foundation) + M1 (Task layer)**.

| File | What it holds |
|---|---|
| `VISION.md` | What we're building, the four v1 surfaces, the "not a Notion clone" boundary |
| `AGENTS.md` | Stack, project structure, env vars, design system, the MCPs used |
| `loop.md` | The loop charter; GOAL = the v1 daily driver (M0+M1) |
| `specs/TODO.md` | M0+M1 task list (M2–M4 in backlog), with `NEEDS ME` gates |
| `specs/PLAN.md` | The full architecture, data model, and honest build estimates |
| `design/globals.css` | Design tokens (dark OKLCH glass/teal) to lift into the app |
| `CLAUDE.md` | Standing rules + the startup check Claude runs first |

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind v4** — installable **PWA**
- **Supabase** — Postgres (source of truth), Auth, Edge Functions
- **Vercel** — deploy
- **Claude API** (nightly scheduler) · **Google Calendar / WHOOP / ntfy** via MCP

## How to run the loop

1. Open this folder in Claude Code.
2. Claude reads `CLAUDE.md` → confirms `VISION.md` + `specs/TODO.md` are filled (they are).
3. Run `@context` to orient, then `/loop` to build through the task list.
4. `@reviewer` before shipping anything significant; `@git` for commits.

The loop logs progress to `LOOP-STATE.md` and stops when the task list is done/blocked or after 5 tasks. See `loop.md` for the full charter.
