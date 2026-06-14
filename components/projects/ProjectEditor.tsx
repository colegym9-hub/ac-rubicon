"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteProject, updateProject } from "@/app/projects/actions";
import { CATEGORY_OPTIONS, PRIORITY_LEVELS } from "@/lib/labels";
import type { Project } from "@/lib/database.types";

export default function ProjectEditor({ project }: { project: Project }) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  function patch(p: Parameters<typeof updateProject>[1]) {
    setError(null);
    start(async () => {
      const r = await updateProject(project.id, p);
      if (r?.error) setError(r.error);
    });
  }

  function remove() {
    if (!confirm(`Delete "${project.name}"? Its tasks move to the Inbox.`)) return;
    start(async () => {
      await deleteProject(project.id);
      router.push("/projects");
    });
  }

  const fieldStyle = { borderColor: "var(--glass-border)" };

  return (
    <section className="flex flex-col gap-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name.trim() && name !== project.name) patch({ name });
        }}
        className="bg-transparent text-2xl font-extrabold outline-none"
        aria-label="Project name"
      />

      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Type"
          value={project.category ?? ""}
          onChange={(e) => patch({ category: e.target.value || null })}
          className="rounded-[3px] border bg-transparent px-2 py-1 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground outline-none"
          style={fieldStyle}
        >
          <option value="" className="bg-card text-foreground">No type</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value} className="bg-card text-foreground">
              {c.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Priority"
          value={project.priority}
          onChange={(e) => patch({ priority: Number(e.target.value) })}
          className="rounded-[3px] border bg-transparent px-2 py-1 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground outline-none"
          style={fieldStyle}
        >
          {PRIORITY_LEVELS.map((p) => (
            <option key={p.value} value={p.value} className="bg-card text-foreground">
              {p.label}
            </option>
          ))}
        </select>

        <input
          aria-label="Do by date"
          type="date"
          value={project.target_date ?? ""}
          onChange={(e) => patch({ dueDate: e.target.value || null })}
          className="rounded-[3px] border bg-transparent px-2 py-1 font-mono text-xs text-muted-foreground outline-none"
          style={fieldStyle}
        />
      </div>

      <div className="flex items-center gap-4 font-mono text-[0.6rem] uppercase tracking-[0.15em]">
        <button
          type="button"
          onClick={() => patch({ status: "archived" })}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          Archive
        </button>
        <button
          type="button"
          onClick={remove}
          className="ml-auto text-destructive transition-colors hover:opacity-80"
        >
          Delete project
        </button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </section>
  );
}
