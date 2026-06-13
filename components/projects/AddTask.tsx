"use client";

import { useRef, useState, useTransition } from "react";
import { createTask } from "@/app/projects/actions";

export default function AddTask({
  projectId = null,
  placeholder = "Add a task…",
}: {
  projectId?: string | null;
  placeholder?: string;
}) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const value = title.trim();
    if (!value) return;
    setError(null);
    start(async () => {
      const res = await createTask({ title: value, projectId });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setTitle("");
      inputRef.current?.focus();
    });
  }

  return (
    <div className="flex flex-col gap-1 py-1">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground" aria-hidden>
          +
        </span>
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          disabled={pending}
          enterKeyHint="done"
          className="flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground/50"
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
