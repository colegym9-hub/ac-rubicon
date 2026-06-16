"use client";

import { useState, useTransition } from "react";
import { addProjectNote } from "@/app/projects/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectNoteSummary } from "@/lib/data/brain";

interface Props {
  projectId: string;
  initialNotes: ProjectNoteSummary[];
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ProjectNotes({ projectId, initialNotes }: Props) {
  const [notes, setNotes] = useState<ProjectNoteSummary[]>(initialNotes);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const glassB = { borderColor: "var(--glass-border)" };

  function handleAdd() {
    if (!draft.trim()) return;
    start(async () => {
      const res = await addProjectNote(projectId, draft);
      if (res?.error) {
        setError(res.error);
        return;
      }
      // Optimistically prepend the new note so the UI updates immediately.
      setNotes((prev) => [
        {
          id: crypto.randomUUID(),
          content_md: draft.trim(),
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setDraft("");
      setError(null);
    });
  }

  return (
    <section
      className="flex flex-col rounded-[var(--radius)] border bg-card/60 p-4 backdrop-blur-md"
      style={glassB}
    >
      <h2 className="mb-3 text-base font-bold">Notes</h2>

      {/* Add-note form */}
      <div className="flex flex-col gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="Add a note…"
          className="resize-none bg-transparent text-sm"
          style={glassB}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAdd();
          }}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={pending || !draft.trim()}
          className="self-end"
        >
          {pending ? "Adding…" : "Add note"}
        </Button>
      </div>

      {/* Notes list */}
      {notes.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-[var(--radius)] border bg-card/40 px-3 py-2"
              style={glassB}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.content_md}</p>
              <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground/60">
                {relativeDate(note.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}

      {notes.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground/50">No notes yet.</p>
      )}
    </section>
  );
}
