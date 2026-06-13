"use client";

import { useState, useTransition } from "react";
import { deleteProject, updateProject } from "@/app/projects/actions";
import type { Project } from "@/lib/database.types";

export default function ProjectHeader({
  project,
  taskCount,
}: {
  project: Project;
  taskCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [priority, setPriority] = useState(project.priority);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    const value = name.trim();
    if (!value) {
      setError("Name required.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await updateProject(project.id, { name: value, priority });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <div className="flex items-baseline gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-left text-base font-bold transition-colors hover:text-primary"
        >
          {project.name}
        </button>
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">
          P{project.priority} · {taskCount}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
          }}
          disabled={pending}
          className="flex-1 rounded-[3px] border bg-transparent px-2 py-1 text-base font-bold outline-none"
          style={{ borderColor: "var(--glass-border)" }}
        />
        <select
          aria-label="Project priority"
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          className="rounded-[3px] border bg-transparent px-1 py-1 font-mono text-[0.65rem] text-muted-foreground outline-none"
          style={{ borderColor: "var(--glass-border)" }}
        >
          {[1, 2, 3, 4, 5].map((p) => (
            <option key={p} value={p} className="bg-card text-foreground">
              P{p}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3 font-mono text-[0.6rem] uppercase tracking-[0.15em]">
        <button type="button" onClick={save} disabled={pending} className="text-primary">
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setName(project.name);
            setPriority(project.priority);
            setError(null);
          }}
          className="text-muted-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() =>
            start(async () => {
              const res = await updateProject(project.id, { status: "archived" });
              if (res?.error) setError(res.error);
            })
          }
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          Archive
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete "${project.name}"? Its tasks move to the Inbox.`)) {
              start(async () => void (await deleteProject(project.id)));
            }
          }}
          className="ml-auto text-muted-foreground transition-colors hover:text-destructive"
        >
          Delete
        </button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
