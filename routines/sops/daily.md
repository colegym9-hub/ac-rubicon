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

**Roll forward slips.** If `lastRecap` mentions tasks that slipped, address them —
slot them or explain in the rationale why they're not making the cut today.

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

## Guardrails

- Never hard-code the date — always use `date` from `get_planning_context`.
- Do not invent tasks. Only use what's in `topTasks` / the weekly plan, plus the
  standing anchors (gym, creation, meals).
- Never fill every hour. Slack is load-bearing.
- This runs unattended. Be decisive.
