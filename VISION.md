# Vision

> What we're building and what "done" looks like. Claude reads this before any work.

---

## What This Project Is

AC Rubicon — a personal life-OS that unifies Cole's **second brain** (an existing markdown LLM-wiki of his sources) with a **command center** (daily planning). It's a custom, phone-installable app (Next.js PWA + Supabase) that is the **source of truth for projects, tasks, and daily tracking**, with an **AI scheduler** that plans each day from tasks + Google Calendar + WHOOP recovery + the previous night's recap. The markdown brain stays as-is and is read for planning context. Tagline: "optimizing my past into building my future."

---

## Who It's For

Cole — a solo student and entrepreneur (A.C Media photography business, content creation, school, health/WHOOP). Balances deep work, light work, gym, friends, going out. Usually not at his computer until later in the day, so the daily plan must reach and be adjustable from his **phone**. Already journals a nightly recap every single day.

---

## What "Done" Looks Like (v1 daily driver)

A phone-installable PWA with four working surfaces:
- **Projects / Tasks** — projects grouped by category, priority-weighted tasks, a one-off Inbox; fast inline add, check-off, priority.
- **Today / Scheduler** — a time-blocked day (3 big slots + edges, fitted around calendar events) generated nightly by AI, pushed to the phone before Cole is at his desk, adjustable on the phone, with "re-plan from now"; plus an evening recap box.
- **Tracking** — one-tap daily metrics that expand into notes; add a new metric with no code change.
- **Graphs** — task throughput, tracking trends, and a planned-vs-done adherence chart.

Projects/tasks/tracking live in Supabase. The scheduler reads tasks + Calendar + WHOOP + last night's recap, and last night's recap shapes tomorrow's plan.

---

## What Success Means

Cole actually **follows** the plan (the adherence chart shows it) and manages his real projects/tasks here daily instead of scattered lists — fixing the exact failure of the old hard-coded command center, which he "didn't follow well."

---

## Constraints

- Claude builds; Cole is a non-dev who lives in the tool and makes the product calls.
- Stay on Supabase free tier + Vercel hobby tier; Claude API for nightly planning ≈ **$1–5/mo**.
- **Phone-first** (PWA before any native app).
- The markdown brain stays as-is — **no bulk re-ingest now** (only ~3 weeks of ChatGPT is currently ingested; this caps the future coach, not the v1 surfaces).
- Reuse the existing dark OKLCH glass/teal design tokens from the old Electron prototype.
- **DO NOT build a Notion clone:** no general block editor, no user-definable DB engine, no real-time collaboration, no offline-sync engine. Build the four focused views over a fixed schema.

---

## Current Phase

**M0 (Foundation) + M1 (Task layer)** — stand up the Next.js + Supabase app, the design system, the DB schema, and the Projects/Tasks surface. Everything else depends on these.

---

## Out of Scope (For Now)

- Phone capture pipeline (link / voice / photo-OCR / note → brain) — M5, later.
- AI coach / weekly reviews — M7, later (gated by brain history).
- Native iPhone app — M8, only if PWA limits bite.
- Bulk re-ingest of the 3-year history; multi-user; payments.
