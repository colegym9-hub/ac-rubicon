# Weekly Setup — Rules

_Stored in the app as `get_sop("weekly_setup")`. Edit here in the app to change
how the Sunday routine sets your weekly plan — no code deploys needed._

---

## What you're producing

A short markdown document that the **daily planner reads every morning** to decide
what to prioritize. It should feel like Cole wrote it himself on Sunday night —
direct, opinionated, no filler.

The daily planner uses it to:
- Elevate certain tasks even if they're not top-weighted on the board
- Know about fixed commitments or constraints this week
- Understand what the single most important thing is

---

## Format

```markdown
## Week of [Mon date] — [1-line theme or headline]

**This week's one thing:** [single most important outcome]

**Top priorities:**
1. [Priority] — [one sentence why it matters this week]
2. [Priority] — [one sentence why]
3. [Priority] — [one sentence why]

**Constraints / fixed this week:**
- [Any known commitments, travel, events, or reduced capacity days]

**Carry-over from last week:**
- [Anything that slipped that still matters — or "nothing, clean slate"]
```

Keep it under ~200 words. The daily planner reads this every morning — dense is fine,
long is noise.

---

## How to pick priorities

**Use `topTasks` and active projects as your raw material** — don't invent things.
But don't just echo the highest-weight tasks either. Apply judgment:

- What has a deadline or dependency this week?
- What's been stuck or deprioritized too long?
- What would make the biggest real-world difference if it moved forward?
- Is there a project that's close to done and needs a push?

**Pick 3, max 4.** If everything is a priority, nothing is.

**The "one thing"** should be the single outcome Cole would consider the week a
success for, even if nothing else got done.

---

## Constraints section

Populate from what you know:
- If `get_planning_context` shows reduced adherence recently, note "low capacity week — protect deep work"
- If there are active projects with imminent deadlines, call them out
- If the weekly plan from last week had carry-overs, surface the important ones explicitly

---

## Tone

Write in second person ("your one thing", "your top priority") as if Cole wrote it
for himself. Terse and direct. No preamble, no "here's what I noticed" narration —
just the plan.

---

## Guardrails

- Do not recap last week's performance — this is forward-only
- Do not include more than 4 priorities
- Do not reference the date from memory — compute it from `get_planning_context`
- If `topTasks` is empty, write a minimal scaffold: one creation priority, note the
  board is empty, suggest Cole adds tasks before Monday
