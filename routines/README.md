# ac-rubicon routines

Claude Code routines that drive the app through its MCP server (`/api/mcp`).

> **Cloud routines = scheduled AI only.** As of 2026-06-16 the on-demand AI
> (brain chat, brain ingest, "re-plan from now") runs **in-app on the Anthropic
> API**, not as routines — see `lib/brain/{ingest,replan}.ts` + `app/api/brain/chat`.
> The only routines you still register as crons are the **daily planner**
> (`plan-my-day.md` / `daily.md`) and the **weekly lint + insight** (`weekly.md`).
> `brain-chat.md` is kept for reference but is superseded by the in-app call.

## `plan-my-day.md` — the daily scheduler

A Claude Code routine that, each morning, reads your board + last night's recap
via the ac-rubicon MCP, builds a realistic Eastern-time-blocked day, saves it with
`save_day_plan`, and schedules the chosen tasks. You see it in `/today` when you wake.

**How the timing works:** the routine runs **pre-dawn (~05:00 ET)** and plans the day
you're *awake* for — the first block lands around 11:00, not at 5am. Generation time
≠ first block. If you start late, hit "re-plan from now" in the app.

### What the routine uses (MCP tools)

`get_planning_context` (one-call bundle) → reason → `save_day_plan` → `send_task_to_today`.
All read+write, no deletes.

---

## Status / what's built vs. what's left

- ✅ MCP server + tools (`get_planning_context`, `save_day_plan`, …) — built & verified.
- ✅ Eastern timezone correctness, the planner prompt (`plan-my-day.md`).
- ⛳ **Human-only steps remain** (see checklist) — token, optional deploy, activation.

### Human-only checklist (do these when you're back)

1. **Add the MCP token to `.env.local`** (I never write secrets):
   `MCP_BEARER_TOKEN=` + a long random value
   (`node -e "console.log(crypto.randomBytes(32).toString('base64url'))"`), then
   restart the dev server. Without this the MCP returns 401 to everything.
2. **Connect the MCP to Claude Code** (one time):
   ```bash
   claude mcp add --transport http ac-rubicon http://localhost:3001/api/mcp \
     --header "Authorization: Bearer <your MCP_BEARER_TOKEN>"
   ```
   (After you deploy, re-add it with the Vercel URL instead of localhost.)
3. **Dry-run it once** to see a plan land in `/today`:
   ```bash
   # bash
   claude -p "$(cat routines/plan-my-day.md)"
   ```
   ```powershell
   # PowerShell
   claude -p (Get-Content routines/plan-my-day.md -Raw)
   ```
4. **Schedule it** — see below.

---

## Scheduling

### Local (works today, no deploy — but your machine must be awake at run time)

Use the `/schedule` skill (or `/loop`) inside Claude Code, pointing at
`routines/plan-my-day.md`, cron **`0 5 * * *`** in **America/New_York**. The local
dev server (`http://localhost:3001`) must be running when it fires.

### Cloud (the real goal — fires pre-dawn even with your laptop off)

Needs the app **deployed to Vercel** so the cloud can reach `/api/mcp`:

1. Deploy ac-rubicon to Vercel (see pre-deploy checklist in `specs/TODO.md`).
2. In Vercel project env, set `MCP_BEARER_TOKEN` (same value) and confirm
   `SUPABASE_SERVICE_ROLE_KEY`, `APP_PASSWORD`, `SESSION_SECRET`, `APP_TIMEZONE=America/New_York`.
3. Re-point the MCP at `https://<your-app>.vercel.app/api/mcp`.
4. Create the cloud routine with the `/schedule` skill: prompt = `plan-my-day.md`,
   cron `0 5 * * *` (America/New_York), MCP config below.

### MCP config the routine needs

```jsonc
{
  "mcpServers": {
    "ac-rubicon": {
      "type": "http",
      "url": "https://<your-app>.vercel.app/api/mcp",   // or http://localhost:3001/api/mcp
      "headers": { "Authorization": "Bearer <MCP_BEARER_TOKEN>" }
    }
  }
}
```

---

## Adding WHOOP + Google Calendar (next iteration)

Per your plan, a follow-up wires these into the **same routine**, daily:

1. Add the WHOOP and Google Calendar MCP servers to the routine's MCP config
   (alongside `ac-rubicon`).
2. Uncomment/extend the "Later" section of `plan-my-day.md`: read WHOOP recovery
   (scale deep-work load to it) and today's calendar events (place as fixed
   `kind: "event"` blocks, plan around them).
3. **Verify availability first:** a headless cloud run may not inherit
   interactively-OAuth'd MCPs. If the cloud run can't reach WHOOP/Calendar, either
   run the routine locally (where they're authed) or add server-side REST
   integrations in the app. The `ac-rubicon` MCP itself is unaffected — it's
   token-auth over HTTPS and reachable from any runtime.

## Security

The bearer token is the only credential between any Claude client and your data.
Keep it out of git (it lives in env only). Rotate by changing `MCP_BEARER_TOKEN`
in the app env and the routine's `Authorization` header. The tool surface is
read + non-destructive writes only (no delete/deactivate).
