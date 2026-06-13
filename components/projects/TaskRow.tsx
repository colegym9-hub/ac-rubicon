"use client";

import { useTransition } from "react";
import {
  deleteTask,
  sendTaskToToday,
  setTaskPriority,
  toggleTaskDone,
} from "@/app/projects/actions";
import type { TaskWithWeight } from "@/lib/database.types";

export default function TaskRow({ task }: { task: TaskWithWeight }) {
  const [pending, start] = useTransition();
  const done = task.status === "done";

  const meta = [
    task.effort,
    task.due ? `due ${task.due.slice(5)}` : null,
    task.scheduled_for ? "today" : null,
    task.status === "blocked" ? "blocked" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={`group flex items-center gap-2 border-b py-2 last:border-b-0 ${
        pending ? "opacity-50" : ""
      }`}
      style={{ borderColor: "var(--glass-border)" }}
    >
      <button
        type="button"
        aria-label={done ? "Mark not done" : "Mark done"}
        onClick={() => start(async () => void (await toggleTaskDone(task.id, !done)))}
        className="-ml-1.5 flex h-10 w-10 shrink-0 items-center justify-center text-[0.7rem] font-bold text-primary"
      >
        <span
          className="flex h-5 w-5 items-center justify-center rounded-[3px] border"
          style={{
            borderColor: done ? "var(--color-primary)" : "var(--glass-border)",
          }}
        >
          {done ? "✓" : ""}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${done ? "text-muted-foreground line-through" : ""}`}>
          {task.title}
        </p>
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">
          {meta}
        </p>
      </div>

      <select
        aria-label="Priority"
        value={task.priority}
        onChange={(e) =>
          start(async () => void (await setTaskPriority(task.id, Number(e.target.value))))
        }
        className="shrink-0 rounded-[3px] border bg-transparent px-1 py-0.5 font-mono text-[0.65rem] text-muted-foreground outline-none"
        style={{ borderColor: "var(--glass-border)" }}
      >
        {[1, 2, 3, 4, 5].map((p) => (
          <option key={p} value={p} className="bg-card text-foreground">
            P{p}
          </option>
        ))}
      </select>

      <button
        type="button"
        aria-label="Send to Today"
        title="Send to Today"
        onClick={() => start(async () => void (await sendTaskToToday(task.id)))}
        className="shrink-0 px-1 py-2 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-primary"
      >
        →today
      </button>
      <button
        type="button"
        aria-label="Delete task"
        onClick={() => start(async () => void (await deleteTask(task.id)))}
        className="shrink-0 px-2 py-2 text-muted-foreground transition-colors hover:text-destructive"
      >
        ✕
      </button>
    </div>
  );
}
