# Daily Planner — Rules

_Stored in the app as `get_sop("daily")`. Edit here in the app to change how the
routine plans your day — no code deploys needed._

---

## Cole's rhythm

**Timezone: America/New_York.** Every block time is 24h `"HH:MM"` Eastern.

**Sleep is irregular and late.** Often up until ~02:00, wakes ~11:00–noon
(sometimes ~09:30). Start the first block no earlier than **11:00** — never at
sunrise. If `lastRecap` hints at a very late night, push the first block later.
He'll hit "re-plan from now" if he starts even later — don't over-anchor the morning.

**Deep work windows: BEFORE 14:00 or AFTER 18:00.** The 14:00–18:00 window is
low-focus time — no deep blocks there. Lean one deep block into the late morning /
early afternoon and protect a strong **evening** block (20:00+).

**Gym: 16:00–20:00 window, ~1.5–2h.** Always include one `kind: "gym"` block in
that range. Never skip it. Exact time can flex within the window.

**Content creation is a daily must-have.** Always include at least one focused
`kind: "deep"` creation block, even if no specific content task is in `topTasks`.
Label it with the most relevant creation task, or "Content creation" as a stand-in.

**Studying is paused for summer** — do not force a study block.

**Do not schedule reading as a block.** Cole reads when he wants to.

**Leave white space.** Aim for 5–8 blocks total. Do not fill every hour. Slack is
load-bearing.

**Three priorities maximum.** Pick the top three things that matter today. Anything
beyond three is noise.

---

## Planning rules

**Priorities are sacred; time is flexible.** Every block has a suggested time, not
a guaranteed one. Write the plan so Cole feels like it adapted with him.

**Block shape:** ~2–3 real work/deep blocks + lighter edges + gym + meals + maybe a
buffer. Not every minute needs a block.

**Use `topTasks` for real work.** Put the highest-weight tasks into deep/work blocks.
Set `label` to the task title and `taskId` to its `id`. If the weekly plan elevates
something lower on the weight list, prefer it.

**Read yesterday's log — tomorrow + notes.** `lastRecap` is yesterday's saved log.
Mine `recap_text` for anything Cole wrote pointing at *today* — intentions, "tomorrow
I want to…", reminders, loose notes — and let it shape today's three priorities.
Treat an explicit intention there as high-signal, on par with the weekly plan.
(Only `recap_text`, `energy`, and `slots_slipped` sync to the cloud today; the app's
separate Tomorrow / Notes log fields are phone-local and not visible to this routine
yet — so read Cole's intentions from the recap text.)

**Roll forward slips.** If `lastRecap` mentions tasks that slipped (`slots_slipped`
or the recap text), address them — slot them or explain in the rationale why they're
not making the cut today.

**If `topTasks` is empty**, produce a sensible default scaffold: creation block,
gym, a light admin block, meals. Cole always gets structure.

**Block kinds:**
- `deep` — focused work requiring real attention
- `light` — reviews, email, admin, easy tasks
- `break` — meals, rest, walks
- `gym` — gym session
- `event` — fixed external event (calendar item, call, appointment)
- `buffer` — transition / overflow; use sparingly

**Each block needs:** `start` / `end` as `"HH:MM"` (Eastern 24h, `start < end`, no
overlaps), a short human `label`, a `kind`, an optional `taskId`, and an optional
one-line `rationale`.

**Overall rationale:** ~3–4 sentences. What you prioritized, how you fit the gym
and creation block, what you rolled forward from the recap, and how many captures
are waiting (if any).

---

## Google Calendar

Cole's Google Calendar (his **primary** calendar) is wired into this routine. Read it
before planning, write the finished plan back after saving. The tool details live in
the Google Calendar MCP; the rules below are what matter.

### Read — fixed events become blocks
- Before designing, `list_events` on the primary calendar for today
  (00:00–23:59, `timeZone: "America/New_York"`).
- **Skip:** all-day events, declined events, and any event you created on a prior run
  (they carry the `[acr-plan]` marker — see Write). Never re-import your own plan as if
  it were an outside commitment.
- Turn each remaining timed event into a fixed `kind: "event"` block — `label` = the
  event title, `start` / `end` = its exact local times. These are **immovable**;
  everything else plans around them with no overlaps. If one lands in the gym window or
  a deep-work window, shift your block around it rather than dropping it.

### Write — mirror the saved plan back
After `save_day_plan` succeeds (skip entirely if you hit the edited-plan skip
condition), put **every block you generated** on the primary calendar. Exclude the
`kind: "event"` blocks you imported in the Read step — those already exist; mirroring
them would duplicate Cole's real events.

Because this is his real, shared calendar, be strict:
- **Tag every event you create.** End the `description` with the marker `[acr-plan]` on
  its own line, above a short note: "Auto-planned by AC Rubicon — overwritten each
  morning." The marker is how you find your own events and how the Read step knows to
  skip them.
- **Reconcile first, then create.** `list_events(fullText: "[acr-plan]")` for today and
  `delete_event` every match, then create the new blocks fresh. **Only ever delete
  events carrying `[acr-plan]`. Never touch an untagged event — those are Cole's.**
- Each event: `summary` = block label; `startTime` / `endTime` from the block `HH:MM`
  + the plan `date`; `timeZone: "America/New_York"`; `notificationLevel: "NONE"`; no
  attendees; `visibility: "private"`.
- **Color by kind** (`colorId`): deep → `9` Blueberry, light → `7` Peacock,
  gym → `10` Basil, break → `2` Sage, buffer → `8` Graphite.
- **Availability:** `BUSY` for deep / light / gym; `FREE` for break / buffer.

In-app edits and "re-plan from now" don't push to the calendar yet — only this morning
routine syncs. Known gap, fine for now.

---

## Guardrails

- Never hard-code the date — always use `date` from `get_planning_context`.
- **Calendar is best-effort.** If the Google Calendar MCP isn't reachable or authed
  this run, note it in the rationale and plan without it — never fail the whole routine
  over the calendar.
- Do not invent tasks. Only use what's in `topTasks` / the weekly plan, plus the
  standing anchors (gym, creation, meals).
- Never fill every hour. Slack is load-bearing.
- This runs unattended. Be decisive.
