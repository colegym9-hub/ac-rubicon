"use client";

import { useState, useTransition } from "react";
import { saveRecap } from "@/app/today/actions";
import type { DailyLog } from "@/lib/database.types";

export default function RecapBox({ log }: { log: DailyLog | null }) {
  const [recap, setRecap] = useState(log?.recap_text ?? "");
  const [energy, setEnergy] = useState<number | "">(log?.energy ?? "");
  const [slipped, setSlipped] = useState(log?.slots_slipped ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setSaved(false);
    start(async () => {
      const res = await saveRecap({
        recap,
        energy: energy === "" ? null : Number(energy),
        slotsSlipped: slipped,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setError(null);
      setSaved(true);
    });
  }

  const fieldStyle = { borderColor: "var(--glass-border)" };

  return (
    <section
      className="flex flex-col gap-3 rounded-[var(--radius)] border bg-card/60 p-4 backdrop-blur-md"
      style={fieldStyle}
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-bold">Tonight&apos;s recap</h2>
        {saved ? (
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-primary">
            saved
          </span>
        ) : null}
      </div>
      <textarea
        value={recap}
        onChange={(e) => {
          setRecap(e.target.value);
          setSaved(false);
        }}
        placeholder="What happened today? What moved, what slipped, and why?"
        rows={4}
        className="resize-none rounded-[3px] border bg-transparent p-2 text-sm outline-none placeholder:text-muted-foreground/50"
        style={fieldStyle}
      />
      <div className="flex items-center gap-2">
        <label className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">
          Energy
        </label>
        <select
          aria-label="Energy"
          value={energy}
          onChange={(e) => {
            setEnergy(e.target.value === "" ? "" : Number(e.target.value));
            setSaved(false);
          }}
          className="rounded-[3px] border bg-transparent px-1 py-1 font-mono text-xs text-muted-foreground"
          style={fieldStyle}
        >
          <option value="" className="bg-card text-foreground">—</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n} className="bg-card text-foreground">
              {n}
            </option>
          ))}
        </select>
        <input
          aria-label="What slipped"
          value={slipped}
          onChange={(e) => {
            setSlipped(e.target.value);
            setSaved(false);
          }}
          placeholder="What slipped + why"
          className="min-w-0 flex-1 rounded-[3px] border bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground/50"
          style={fieldStyle}
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="self-start rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save recap"}
      </button>
    </section>
  );
}
