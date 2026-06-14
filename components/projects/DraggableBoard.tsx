"use client";

import { useState, useTransition } from "react";
import ProjectCard from "@/components/projects/ProjectCard";
import type { PriorityColumn } from "@/lib/data/board";
import { updateProject } from "@/app/projects/actions";

export default function DraggableBoard({ columns: initial }: { columns: PriorityColumn[] }) {
  const [columns, setColumns] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  function onDragStart(e: React.DragEvent, projectId: string) {
    setDragId(projectId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", projectId);
  }

  function onDragOver(e: React.DragEvent, priority: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overCol !== priority) setOverCol(priority);
  }

  function onDragLeave(e: React.DragEvent, priority: number) {
    if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return;
    if (overCol === priority) setOverCol(null);
  }

  function onDrop(e: React.DragEvent, newPriority: number) {
    e.preventDefault();
    const projectId = e.dataTransfer.getData("text/plain");
    setOverCol(null);
    setDragId(null);
    if (!projectId) return;

    let fromPriority: number | null = null;
    for (const col of columns) {
      if (col.projects.some((p) => p.id === projectId)) {
        fromPriority = col.value;
        break;
      }
    }
    if (fromPriority === null || fromPriority === newPriority) return;

    // Optimistic move
    setColumns((prev) => {
      const project = prev
        .find((c) => c.value === fromPriority)
        ?.projects.find((p) => p.id === projectId);
      if (!project) return prev;
      const updated = { ...project, priority: newPriority };
      return prev.map((col) => {
        if (col.value === fromPriority)
          return { ...col, projects: col.projects.filter((p) => p.id !== projectId) };
        if (col.value === newPriority)
          return { ...col, projects: [...col.projects, updated] };
        return col;
      });
    });

    startTransition(() => {
      updateProject(projectId, { priority: newPriority });
    });
  }

  function onDragEnd() {
    setDragId(null);
    setOverCol(null);
  }

  return (
    <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
      {columns.map((col) => {
        const isOver = overCol === col.value;
        return (
          <section
            key={col.value}
            onDragOver={(e) => onDragOver(e, col.value)}
            onDragLeave={(e) => onDragLeave(e, col.value)}
            onDrop={(e) => onDrop(e, col.value)}
            className={`flex w-[78vw] max-w-[19rem] shrink-0 snap-start flex-col gap-2 rounded-[var(--radius)] p-1 transition-all ${
              isOver ? "bg-primary/5 ring-1 ring-primary/30" : ""
            }`}
          >
            <div className="flex items-baseline justify-between">
              <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
                {col.label}
              </h2>
              <span className="font-mono text-[0.6rem] text-muted-foreground">
                {col.projects.length}
              </span>
            </div>

            {col.projects.map((project) => (
              <div
                key={project.id}
                draggable
                onDragStart={(e) => onDragStart(e, project.id)}
                onDragEnd={onDragEnd}
                className={`cursor-grab rounded-[var(--radius)] transition-opacity active:cursor-grabbing ${
                  dragId === project.id ? "opacity-40" : "opacity-100"
                }`}
              >
                <ProjectCard project={project} />
              </div>
            ))}

            {col.projects.length === 0 ? (
              <p
                className={`rounded-[var(--radius)] border border-dashed p-3 text-center text-xs transition-colors ${
                  isOver ? "border-primary/50 text-primary/70" : "text-muted-foreground"
                }`}
                style={{ borderColor: isOver ? undefined : "var(--glass-border)" }}
              >
                {isOver ? `→ ${col.label}` : "—"}
              </p>
            ) : isOver ? (
              <p className="rounded-[var(--radius)] border border-dashed border-primary/50 p-2 text-center text-xs text-primary/70">
                → {col.label}
              </p>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
