# Agent Operating Rules

> Project-specific stack, structure, and conventions. Read alongside CLAUDE.md.

---

## Project Structure

```
/app                  — Next.js App Router pages (PWA): today, projects, insights, brain, settings
/app/api              — route handlers: MCP server ([transport]), brain capture/chat endpoints
/app/globals.css      — design tokens (lifted from the old Electron prototype)
/components           — shared UI (cards, task rows, charts, brain/, today/)
/lib                  — supabase client, data layer, mcp tools, day helpers
/lib/brain            — brain helpers (wiki full-text search, capture types, save actions)
/supabase/migrations  — DB schema (projects, tasks, tracking_*, daily_logs, daily_plans, brain tables)
/routines             — Claude Code routine prompts (planner, brain ingest, chat, weekly) — editable .md
/public               — PWA manifest + icons
```

The second brain now lives in **Supabase** (`raw_sources` + `wiki_pages` tables), seeded from the
local markdown brain at `C:\Users\alter\Everything\Cole's Second Brain\Cole-2nd-Brain\`
(~1,244 raw sources + 29 wiki pages). The local copy becomes a cold backup; the app reads and
writes the cloud copy. The brain's operating rules (`Cole-2nd-Brain/CLAUDE.md`) are the SOP the
ingest routine follows. `wiki/summer-2026-command-center.md` remains the scheduler's conceptual
ancestor (spine priorities, three-big-slots rule, guardrails, recap loop).

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
SUPABASE_SERVICE_ROLE_KEY=       # all DB access (server actions + route handlers)
APP_PASSWORD=                    # single-user password gate
SESSION_SECRET=                  # signs the session cookie (e.g. `openssl rand -base64 32`)
MCP_BEARER_TOKEN=                # auth for the app MCP server at /api/[transport]; routines call in with it
SUPADATA_API_KEY=                # transcripts: YouTube / Instagram / TikTok / X / Facebook / file URLs (free tier)
DEEPGRAM_API_KEY=                # voice-memo transcription (free tier)
# Brain cloud routines — one "Call via API" routine each (Cole creates + wires post-deploy).
# fireRoutine(key) reads BRAIN_<KEY>_FIRE_URL + BRAIN_<KEY>_TOKEN; unset = no-op (queue row persists).
BRAIN_PROCESS_FIRE_URL=          # process-brain routine (convert + ingest captures)
BRAIN_PROCESS_TOKEN=
BRAIN_CHAT_FIRE_URL=             # brain-chat routine (answer a queued question)
BRAIN_CHAT_TOKEN=
BRAIN_REPLAN_FIRE_URL=           # replan-day routine (two-question re-plan)
BRAIN_REPLAN_TOKEN=
```

**NOT used:** `ANTHROPIC_API_KEY` / `NTFY_TOPIC` — all AI runs as Claude Code routines on Cole's
subscription (no pay-per-token API), and there is no OpenAI key (retrieval = Postgres full-text
search, not embeddings). Google Calendar + WHOOP are reached via their connected MCP servers.

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

- **Supabase** — Postgres (source of truth, incl. the brain), single-user access via the service-role key; **no edge functions** (routines do the AI work).
- **Claude Code routines** — the AI runtime for planning, brain ingest, chat, re-plan, and weekly lint/insight. Fired by the app (a wakeup; the request lives in a Supabase table) or scheduled. Run on Cole's subscription — **no `ANTHROPIC_API_KEY`**. Prompts live in `/routines/*.md`, editable.
- **Supadata** — transcript extraction for links/video (YouTube, Instagram, TikTok, X, Facebook, file URLs). Async (may return a job id to poll) — handled inside the routine.
- **Deepgram** — voice-memo transcription. Images/handwriting are read by Claude vision inside the routine.
- **Google Calendar MCP** — read events, write the day's blocks.
- **WHOOP MCP** — recovery/sleep/strain to calibrate the plan.

---

## Known Issues / Watch Out For

- The **scheduler only gets good through daily use + the recap loop** — expect ~3–4 weeks of tuning, not a one-shot build. Always emit a plain-language rationale so Cole trusts (and follows) the plan.
- **Brain retrieval is full-text search, not semantic** — fine for ~30–100 wiki pages; if recall proves weak, revisit (Supabase has a free in-DB embedding option) rather than adding an OpenAI dependency.
- **Routine reachability:** cloud routines reach the app only once it's deployed to Vercel (they can't hit localhost). Build/verify against localhost; routine wiring is a post-deploy step Cole does.
- **iOS PWA limits:** no background (screen-off) voice recording; the camera/file picker always shows the system sheet; Instagram beyond what Supadata returns is out of scope.
- Single-user app: RLS enabled deny-by-default; the **browser never holds a Supabase client** — capture status updates poll an API route, not a browser Supabase subscription.
