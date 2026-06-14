"use client";

import { useState, useTransition } from "react";
import { setProjectProgress, setProjectProgressMode } from "@/app/projects/actions";
import { progressStatus } from "@/lib/labels";
import type { ProgressMode } from "@/lib/database.types";

export default function ProgressControl({
  id,
  mode,
  pct,
  manualValue,
}: {
  id: string;
  mode: ProgressMode;
  pct: number; // effective % currently shown
  manualValue: number; // stored slider value
}) {
  const [val, setVal] = useState(manualValue);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  const shown = mode === "manual" ? val : pct;

  function commit(v: number) {
    start(async () => {
      const r = await setProjectProgress(id, v);
      if (r?.error) setError(r.error);
    });
  }

  function toggleMode(next: ProgressMode) {
    setError(null);
    if (next === "manual") setVal(shown);
    start(async () => {
      // Switching to manual seeds the slider with the current %.
      const r =
        next === "manual"
          ? await setProjectProgress(id, shown)
          : await setProjectProgressMode(id, "auto");
      if (r?.error) setError(r.error);
    });
  }

  return (
    <section
      className="flex flex-col gap-3 rounded-[var(--radius)] border bg-card/60 p-4 backdrop-blur-md"
      style={{ borderColor: "var(--glass-border)" }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Progress</h2>
        <div
          className="flex rounded-full border p-0.5 font-mono text-[0.55rem] uppercase tracking-[0.15em]"
          style={{ borderColor: "var(--glass-border)" }}
        >
          {(["auto", "manual"] as ProgressMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => toggleMode(m)}
              className={`rounded-full px-2 py-0.5 ${
                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">
          {progressStatus(shown)}
        </span>
        <span className="text-2xl font-extrabold tabular-nums">{shown}%</span>
      </div>

      {mode === "manual" ? (
        <input
          type="range"
          min={0}
          max={100}
          value={val}
          aria-label="Progress"
          onChange={(e) => setVal(Number(e.target.value))}
          onPointerUp={() => commit(val)}
          onKeyUp={() => commit(val)}
          onBlur={() => commit(val)}
          className="w-full accent-[var(--color-primary)]"
        />
      ) : (
        <p className="font-mono text-[0.6rem] uppercase leading-relaxed tracking-[0.15em] text-muted-foreground">
          Moves automatically as subtasks are completed. Switch to manual to set it yourself.
        </p>
      )}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </section>
  );
}
