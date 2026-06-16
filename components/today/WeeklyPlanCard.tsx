"use client";

import { useState, useTransition } from "react";
import { updateWeeklyPlan } from "@/app/today/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  initial: string;
}

export default function WeeklyPlanCard({ initial }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const glassB = { borderColor: "var(--glass-border)" };

  const preview = value.trim()
    ? value.trim().slice(0, 80) + (value.trim().length > 80 ? "…" : "")
    : "No weekly context yet";

  function handleSave() {
    start(async () => {
      const res = await updateWeeklyPlan(value);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setError(null);
      setEditing(false);
    });
  }

  function handleCancel() {
    setValue(initial);
    setError(null);
    setEditing(false);
  }

  return (
    <div
      className="mx-2 mb-2 shrink-0 rounded-[var(--radius)] border bg-card/70 px-4 py-3 backdrop-blur-md"
      style={glassB}
    >
      {/* Label row */}
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
          This week
        </span>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <>
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            placeholder="Goals, constraints, what's coming up this week…"
            className="resize-y bg-transparent text-sm"
            style={glassB}
            autoFocus
          />
          {error && (
            <p className="mt-1 text-xs text-destructive">{error}</p>
          )}
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={pending}
              className="flex-1"
            >
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={pending}
              className="flex-1"
              style={glassB}
            >
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {preview}
        </p>
      )}
    </div>
  );
}
