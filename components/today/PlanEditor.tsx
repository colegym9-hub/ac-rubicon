"use client";

import { useState, useTransition } from "react";
import { saveDayPlan } from "@/app/today/actions";
import {
  BLOCK_KINDS,
  type BlockKind,
  type DayBlock,
  pickDoNext,
  sortBlocks,
} from "@/lib/day";

export default function PlanEditor({ initial }: { initial: DayBlock[] }) {
  const [blocks, setBlocks] = useState<DayBlock[]>(sortBlocks(initial));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [start_, setStart] = useState("09:00");
  const [end_, setEnd] = useState("11:00");
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<BlockKind>("deep");

  function persist(next: DayBlock[]) {
    const sorted = sortBlocks(next);
    setBlocks(sorted);
    setError(null);
    start(async () => {
      const res = await saveDayPlan(sorted);
      if (res?.error) setError(res.error);
    });
  }

  function add() {
    if (!label.trim()) return;
    persist([
      ...blocks,
      {
        id: crypto.randomUUID(),
        start: start_,
        end: end_,
        label: label.trim(),
        kind,
      },
    ]);
    setLabel("");
  }

  const doNext = pickDoNext(blocks);
  const fieldStyle = { borderColor: "var(--glass-border)" };

  return (
    <div className="flex flex-col gap-3">
      {doNext ? (
        <div
          className="rounded-[var(--radius)] border border-primary/50 bg-card/70 p-3"
        >
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-primary">
            Do next · {doNext.start}
          </p>
          <p className="mt-1 text-base font-bold">{doNext.label}</p>
          {doNext.rationale ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{doNext.rationale}</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col">
        {blocks.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            No blocks yet — build your day below.
          </p>
        ) : (
          blocks.map((b) => (
            <div
              key={b.id}
              className={`flex items-center gap-3 border-b py-2 last:border-b-0 ${
                pending ? "opacity-60" : ""
              }`}
              style={fieldStyle}
            >
              <button
                type="button"
                aria-label={b.done ? "Mark block undone" : "Mark block done"}
                onClick={() =>
                  persist(blocks.map((x) => (x.id === b.id ? { ...x, done: !x.done } : x)))
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center text-[0.7rem] font-bold text-primary"
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-[3px] border"
                  style={{ borderColor: b.done ? "var(--color-primary)" : "var(--glass-border)" }}
                >
                  {b.done ? "✓" : ""}
                </span>
              </button>
              <span className="w-20 shrink-0 font-mono text-[0.65rem] text-muted-foreground">
                {b.start}–{b.end}
              </span>
              <span className={`flex-1 truncate text-sm ${b.done ? "text-muted-foreground line-through" : ""}`}>
                {b.label}
              </span>
              <span className="shrink-0 font-mono text-[0.55rem] uppercase tracking-[0.15em] text-muted-foreground">
                {b.kind}
              </span>
              <button
                type="button"
                aria-label="Remove block"
                onClick={() => persist(blocks.filter((x) => x.id !== b.id))}
                className="shrink-0 px-2 py-2 text-muted-foreground transition-colors hover:text-destructive"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius)] border bg-card/50 p-2" style={fieldStyle}>
        <input aria-label="Start" type="time" value={start_} onChange={(e) => setStart(e.target.value)} className="rounded-[3px] border bg-transparent px-1 py-1 font-mono text-xs" style={fieldStyle} />
        <input aria-label="End" type="time" value={end_} onChange={(e) => setEnd(e.target.value)} className="rounded-[3px] border bg-transparent px-1 py-1 font-mono text-xs" style={fieldStyle} />
        <select aria-label="Kind" value={kind} onChange={(e) => setKind(e.target.value as BlockKind)} className="rounded-[3px] border bg-transparent px-1 py-1 font-mono text-xs text-muted-foreground" style={fieldStyle}>
          {BLOCK_KINDS.map((k) => (
            <option key={k} value={k} className="bg-card text-foreground">{k}</option>
          ))}
        </select>
        <input
          aria-label="Block label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="What's the block?"
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground/50"
        />
        <button type="button" onClick={add} disabled={pending} className="rounded-[3px] bg-primary px-3 py-1 text-xs font-bold text-primary-foreground disabled:opacity-50">
          Add
        </button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
