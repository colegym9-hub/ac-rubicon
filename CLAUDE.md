# Project Rules

## Startup Check — Read This First

Before doing ANY work, run this check:

1. Open VISION.md. If it contains `[PLACEHOLDER]` anywhere, stop and say:
   "VISION.md has unfilled sections. Let's fill those in before I start — it'll take 2 minutes and keeps me from building the wrong thing."
   Then walk through each placeholder one at a time.

2. Open specs/TODO.md. If it's empty or only has the template content, ask:
   "What's the first thing you want to tackle?"
   Add the answer as the first task before proceeding.

3. Once both files are filled in, confirm: "Got it — here's what I'm working on: [restate the first task]. Starting now."

Do not skip this check, even if the user says "just start." A 2-minute setup prevents an hour of rework.

---

## Tech Stack

- **Framework**: Next.js (App Router preferred unless project uses Pages Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Version control**: GitHub
- **Package manager**: npm

## Code Rules

- Match the existing code style. Don't introduce new patterns without asking.
- Use `next/image` for images, `next/link` for links. No exceptions.
- No hardcoded URLs, secrets, or API keys in code. Use `.env.local` and reference via `process.env`.
- Keep components small. If a component exceeds ~150 lines, ask if it should be split.
- `use client` only when the component actually needs browser APIs or interactivity.
- Always handle errors in API routes. Return proper status codes.
- No `console.log` left in production code.

## Git Rules

- Commit after each completed task, not at the end of a session.
- Commit message format: `type: short description` (e.g., `feat: add contact form`, `fix: broken image on mobile`)
- Never commit directly to main. Always work on a feature branch.
- Branch naming: `feature/short-name` or `fix/short-name`

## What to Never Do

- Never delete files without asking first.
- Never push to main or deploy without explicit confirmation.
- Never modify `.env` files — tell me what to add and I'll add it.
- Never install new dependencies without listing them and asking first.
- If a task requires a decision only I can make, stop on that item, add it to specs/TODO.md as "NEEDS ME: [description]", and move to the next task.

## After Each Task

1. Verify the work (run build, lint, or the relevant test).
2. Commit with a descriptive message.
3. Update specs/TODO.md — check off what's done, note anything blocked.
4. If a significant feature is complete, say: "Want me to have the reviewer check this before we move on?"

## Subagents

- **@reviewer** — call this before shipping anything significant. Read-only, will not touch code.
- **@debugger** — call this when something is broken and you want a focused fix.
