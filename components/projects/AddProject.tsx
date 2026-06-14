"use client";

import { useState, useTransition } from "react";
import { createProject } from "@/app/projects/actions";
import { CATEGORY_OPTIONS, PRIORITY_LEVELS } from "@/lib/labels";
import type { ProjectCategory } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AddProject() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProjectCategory>("finite");
  const [priority, setPriority] = useState(3);
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    const value = name.trim();
    if (!value) return;
    setError(null);
    start(async () => {
      const res = await createProject({
        name: value,
        category,
        priority,
        dueDate: dueDate || null,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setName("");
      setDueDate("");
      setPriority(3);
      setOpen(false);
    });
  }

  const fieldStyle = { borderColor: "var(--glass-border)" };

  if (!open) {
    return (
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-[var(--radius)] px-4 py-2 text-sm font-bold"
      >
        + New project
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius)] border bg-card/70 p-3" style={fieldStyle}>
      <Input
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
        className="bg-transparent py-1 text-base font-bold outline-none placeholder:text-muted-foreground/50"
        style={fieldStyle}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Label className="font-mono text-[0.55rem] uppercase tracking-[0.15em] text-muted-foreground">Type</Label>
        <select
          aria-label="Type"
          value={category}
          onChange={(e) => setCategory(e.target.value as ProjectCategory)}
          className="rounded-[3px] border bg-transparent px-1 py-1 font-mono text-[0.65rem] text-muted-foreground outline-none"
          style={fieldStyle}
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value} className="bg-card text-foreground">
              {c.label}
            </option>
          ))}
        </select>
        <Label className="font-mono text-[0.55rem] uppercase tracking-[0.15em] text-muted-foreground">Priority</Label>
        <select
          aria-label="Priority"
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          className="rounded-[3px] border bg-transparent px-1 py-1 font-mono text-[0.65rem] text-muted-foreground outline-none"
          style={fieldStyle}
        >
          {PRIORITY_LEVELS.map((p) => (
            <option key={p.value} value={p.value} className="bg-card text-foreground">
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Label className="font-mono text-[0.55rem] uppercase tracking-[0.15em] text-muted-foreground">Do by</Label>
        <Input
          aria-label="Do by date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded-[3px] border bg-transparent px-1 py-1 font-mono text-xs text-muted-foreground outline-none"
          style={fieldStyle}
        />
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { setOpen(false); setError(null); }}
            className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={submit}
            disabled={pending}
            className="rounded-[3px] px-3 py-1 text-xs font-bold disabled:opacity-50"
          >
            Add
          </Button>
        </div>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
