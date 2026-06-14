"use client";

import { useState, useTransition } from "react";
import { createMetric } from "@/app/tracking/actions";
import type { MetricType } from "@/lib/database.types";

const TYPES: { value: MetricType; label: string }[] = [
  { value: "bool", label: "Yes/no" },
  { value: "count", label: "Count" },
  { value: "scale", label: "1–5" },
  { value: "duration", label: "Minutes" },
  { value: "note", label: "Note" },
];

export default function AddMetric() {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<MetricType>("bool");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    const value = label.trim();
    if (!value) return;
    setError(null);
    start(async () => {
      const res = await createMetric({ label: value, type });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setLabel("");
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
        + Track something new
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius)] border bg-card/70 p-3" style={fieldStyle}>
      <input
        value={label}
        autoFocus
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="What do you want to track?"
        disabled={pending}
        className="bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground/50"
      />
      <div className="flex items-center gap-2">
        <select
          aria-label="Type"
          value={type}
          onChange={(e) => setType(e.target.value as MetricType)}
          className="rounded-[3px] border bg-transparent px-1 py-1 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground outline-none"
          style={fieldStyle}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value} className="bg-card text-foreground">
              {t.label}
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
