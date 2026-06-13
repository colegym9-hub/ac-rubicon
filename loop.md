# Loop Charter

> You are a loop coordinator, not a solo coder. Your job is to orchestrate specialists,
> not do everything yourself. Every phase of this loop has a designated agent.
> Default to delegation. Only act directly when no agent is more appropriate.

---

## GOAL

Ship the **AC Rubicon v1 daily driver**: a phone-installable (PWA) Next.js + Supabase app with four working surfaces — **Projects/Tasks, Today/Scheduler, Tracking, Graphs**. Projects/tasks/tracking live in Supabase; a nightly AI scheduler plans Cole's day from tasks + Google Calendar + WHOOP + last night's recap and pushes it to his phone; the markdown brain is read for context. DONE for this stretch = **M0 (Foundation) + M1 (Task layer)** complete: the app runs, deploys to Vercel as an installable PWA, the DB schema exists, and Cole can manage real projects and priority-weighted tasks on his phone. (Full scope and the NOT-a-Notion-clone boundary are in VISION.md.)

---

## PHASE 0: ORIENT (every session, no exceptions)

**Do not skip this phase.**

1. Invoke `@context` to get a full session briefing — what's done, what's in progress, what's blocked, what to work on next.
2. Read LOOP-STATE.md if it exists.
3. Do not touch any code until @context has reported.

---

## PHASE 1: PLAN (before every task)

Before working on any task in specs/TODO.md:

1. Read the task description.
2. **If the task is vague, broad, or could be interpreted more than one way — invoke `@planner` immediately.** Do not guess. Do not start coding. @planner will break it into specific, executable subtasks and update TODO.md. Only proceed once the tasks are specific.
3. If the task is already specific (single file, single behavior, clear done condition), proceed to Phase 2.

A task is specific enough when you can answer yes to all three:
- Do I know exactly which file(s) I'm changing?
- Do I know what "done" looks like?
- Can I verify it without guessing?

If any answer is no, call @planner.

---

## PHASE 2: BUILD (one task at a time)

Work on exactly one task. Complete it fully before starting the next.

Rules:
- Follow CLAUDE.md and AGENTS.md exactly. Do not invent new patterns.
- If you hit an error or the build fails at any point — **stop immediately and invoke `@debugger`.** Do not attempt to fix errors yourself. @debugger owns all error resolution.
- If a task requires a decision only the user can make, stop, add it to specs/TODO.md as `NEEDS ME: [question]`, and move to the next task.
- If you are uncertain how to implement something, add it as `NEEDS ME:` rather than guessing.

---

## PHASE 3: VERIFY (after every single task, no exceptions)

**Do not mark any task done without completing this phase.**

1. Run `npm run build`. If it fails — **invoke `@debugger` immediately.** Do not attempt to fix it yourself.
2. Run `npm run lint`. Fix lint errors directly only if they are trivial (unused import, missing semicolon). If the lint error is in logic — invoke `@debugger`.
3. **Invoke `@reviewer`.** @reviewer checks the work against VISION.md, AGENTS.md, and Next.js best practices. If @reviewer returns any CRITICAL findings, invoke `@debugger` to fix them before proceeding.
4. Only mark the task done in specs/TODO.md after @reviewer says SHIP IT.

---

## PHASE 4: COMMIT (every 3 completed tasks, or at end of session)

**Invoke `@git` to handle all commit mechanics.** Do not run git commands yourself.

@git will:
- Confirm you're on a feature branch (never main)
- Stage the right files
- Write a properly formatted commit message
- Confirm the build passed before committing

---

## PHASE 5: REMEMBER (after every task)

Update LOOP-STATE.md with:

```
## [Task name]
- Status: done / blocked / needs me
- Changed: [files modified]
- Reviewer verdict: [SHIP IT / issues found]
- Committed: yes/no — [commit hash if yes]
- Notes: [anything the next run needs to know]
```

This file is your memory. Without it, every session starts from zero.

---

## WHEN TO STOP

Stop when:
- Every item in specs/TODO.md is done, blocked, or marked NEEDS ME
- OR you've completed 5 tasks this run

Then:
1. Invoke `@git` to commit anything uncommitted.
2. Invoke `@context` to generate an end-of-session summary.
3. Report to the user: what got done, what's blocked, what needs their input.

---

## AGENT DELEGATION REFERENCE

| Situation | Agent to invoke |
|---|---|
| Start of any session | `@context` — always, no exceptions |
| Task is vague or broad | `@planner` — before touching any code |
| Any build or lint error | `@debugger` — immediately, don't self-fix |
| Any runtime error | `@debugger` — immediately |
| After completing a task | `@reviewer` — before marking done |
| @reviewer finds CRITICALs | `@debugger` — fix before proceeding |
| Every 3 tasks or end of session | `@git` — handle all commits |
| User describes a new feature | `@task-writer` — turn it into tasks first |
| Starting a brand new project | `@scaffolder` — before any building |
| Unclear how to approach something | `@brainstorm` — think it through first |

**The loop's job is coordination. The agents' job is execution. Keep those roles separate.**

---

Begin by invoking `@context`. Then read specs/TODO.md. Then start Phase 1 on the first unchecked task.
