"use client";

import { useState, useTransition } from "react";
import { createProject } from "@/app/projects/actions";
import type { ProjectCategory } from "@/lib/database.types";

const CATEGORIES: { value: ProjectCategory; label: string }[] = [
  { value: "finite", label: "Finite" },
  { value: "system", label: "System" },
  { value: "habit", label: "Habit" },
  { value: "later", label: "Later" },
];

export default function AddProject() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProjectCategory>("finite");
  const [priority, setPriority] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    const value = name.trim();
    if (!value) return;
    setError(null);
    start(async () => {
      const res = await createProject({ name: value, category, priority });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setName("");
      setPriority(3);
      setOpen(false);
    });
  }

  const fieldStyle = { borderColor: "var(--glass-border)" };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
      >
        + New project
      </button>
    );
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-[var(--radius)] border bg-card/70 p-3"
      style={fieldStyle}
    >
      <input
        value={name}
        autoFocus
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Project name"
        disabled={pending}
        className="bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground/50"
      />
      <div className="flex items-center gap-2">
        <select
          aria-label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as ProjectCategory)}
          className="rounded-[3px] border bg-transparent px-1 py-1 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground outline-none"
          style={fieldStyle}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value} className="bg-card text-foreground">
              {c.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Priority"
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          className="rounded-[3px] border bg-transparent px-1 py-1 font-mono text-[0.65rem] text-muted-foreground outline-none"
          style={fieldStyle}
        >
          {[1, 2, 3, 4, 5].map((p) => (
            <option key={p} value={p} className="bg-card text-foreground">
              P{p}
            </option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="rounded-[3px] bg-primary px-3 py-1 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
