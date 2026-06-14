# Agent Operating Rules

> Project-specific stack, structure, and conventions. Read alongside CLAUDE.md.

---

## Project Structure

```
/app                  — Next.js App Router pages (PWA): projects, today, tracking, graphs
/app/globals.css      — design tokens (lifted from the old Electron prototype)
/components           — shared UI (cards, task rows, charts)
/lib                  — supabase client, helpers, scheduler prompt builders
/supabase/migrations  — DB schema (projects, tasks, tracking_*, daily_logs, daily_plans)
/supabase/functions   — edge functions (scheduler; later, coach)
/public               — PWA manifest + icons
```

Read-only context (NOT edited by this project): the markdown brain at
`C:\Users\alter\Everything\Cole's Second Brain\Cole-2nd-Brain\` — especially `wiki/summer-2026-command-center.md` (the scheduler's conceptual ancestor: spine priorities, three-big-slots rule, guardrails, recap loop).

---

## Key Commands

```bash
npm run dev        # local dev (localhost:3000)
npm run build      # run before marking any task done
npm run lint       # ESLint
npx tsc --noEmit   # type check
```

Supabase + Vercel are driven via their **connected MCP servers** (provision project, apply migrations, deploy edge functions, deploy app) — no CLI tokens needed in this session.

---

## Environment Variables (.env.local — never committed)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # unused under the server-side service-role model; never reference in a `use client` file
SUPABASE_SERVICE_ROLE_KEY=       # all DB access (server actions + edge functions)
APP_PASSWORD=                    # single-user password gate
SESSION_SECRET=                  # signs the session cookie (e.g. `openssl rand -base64 32`)
ANTHROPIC_API_KEY=               # scheduler/coach edge functions (M2+)
NTFY_TOPIC=                      # phone push for the daily plan (M2+)
```

Google Calendar + WHOOP are reached via their connected MCP servers (no keys in code for v1).

---

## Deployment

- Platform: **Vercel** (PWA). `main` → production.
- Backend: **Supabase** (Postgres + Auth + Edge Functions).
- Confirm before any deploy (per CLAUDE.md).

---

## Design System

Lift verbatim from `design/globals.css` (copied into this repo from the old Electron prototype).
- Dark, calm, frosted-glass. OKLCH palette, teal `--color-primary` accent.
- Glass + pill tokens; `.accent` = Source Serif 4 italic for emphasis words.
- Fonts: Inter (UI), Geist Mono (eyebrows/labels), Source Serif 4 italic (accent), Caveat (optional handwriting).
- Mono uppercase eyebrows; large extrabold headers; 4px radius on small elements.

---

## Component Conventions

- PascalCase component files; one component per file; props typed inline.
- `use client` only when interactivity / browser APIs are needed.
- Charts: dependency-free inline SVG (`components/graphs/Charts.tsx`) over Supabase queries — Recharts was the original pick but avoided to skip the dependency; swap in later if richer interaction is needed.
- Keep the four surfaces focused — no generic block editor or DB-engine UI.

---

## Third-Party Services

- **Supabase** — Postgres (source of truth), Auth (single user), Edge Functions.
- **Claude API** — nightly scheduler + (later) coach. Confirm current model ids/pricing via the `claude-api` skill at build time; cheap model for nightly planning, strong model for weekly review.
- **Google Calendar MCP** — read events, write the day's blocks.
- **WHOOP MCP** — recovery/sleep/strain to calibrate the plan.
- **ntfy** — push the daily plan to Cole's phone before he's at his desk.

---

## Known Issues / Watch Out For

- **Brain staleness:** only ~3 weeks of ChatGPT history is ingested; the future coach (M7) is capped by this, not the v1 surfaces.
- The **scheduler only gets good through daily use + the recap loop** — expect ~3–4 weeks of tuning, not a one-shot build. Always emit a plain-language rationale so Cole trusts (and follows) the plan.
- Single-user app: keep RLS simple but present.
