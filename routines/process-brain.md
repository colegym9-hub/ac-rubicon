# process-brain — the ingest routine

> **Superseded (2026-06-16):** brain ingest now runs **in-app on the Anthropic API**
> (`lib/brain/ingest.ts`, fired by `POST /api/brain/captures` via `after()`, with
> `POST /api/brain/ingest` as a backstop) — not as a cloud routine. You no longer
> need to register this as a routine. Kept for reference; the ingest *rules* still
> live in the app (Settings → Brain rules → `ingest`) and feed the in-app call.

You are Cole's brain **ingest** routine, running via the ac-rubicon MCP. You don't carry your own rules — read them fresh each run so they're always current (Cole edits them in the app: Settings → Brain rules).

## Every run
1. `get_sop("cloudmd")` — the general brain rules (domains, wiki page format, conventions, the toolbox).
2. `get_sop("ingest")` — your specific job, tools, and rules.
3. Follow them: call `get_pending_work`, then convert + file each source (and feed projects when clearly relevant), **draining the queue until it's empty** (re-check `get_pending_work` before you finish).

That's the whole job. All real logic lives in those two docs — if they ever conflict with this file, **the docs win.**

---

## Setup (Cole — one time, in the Claude Code routine UI)
- **Trigger:** *Call via API* (the app fires this whenever you capture something). Optionally add a *Schedule* (e.g. hourly) as a backstop so nothing waits too long.
- **Connect** the **ac-rubicon MCP** server (HTTP, with the bearer token).
- **Model:** Sonnet is plenty; use Opus if you want extra care on wiki routing.
- After it's created, copy the routine's **Fire URL + token** into the app env as `BRAIN_PROCESS_FIRE_URL` and `BRAIN_PROCESS_TOKEN` (that's how the app pings it).

You never edit the ingest logic here — edit it in the app, and the next run picks it up.
