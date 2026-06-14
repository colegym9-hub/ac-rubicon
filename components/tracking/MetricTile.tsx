"use client";

import { useState, useTransition } from "react";
import { deactivateMetric, setMetricValue } from "@/app/tracking/actions";
import type { MetricWithEntry } from "@/lib/data/tracking";

export default function MetricTile({ metric }: { metric: MetricWithEntry }) {
  const [pending, start] = useTransition();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(metric.entry?.value_text ?? "");
  const num = metric.entry?.value_num ?? null;

  function save(value: { valueNum?: number | null; valueText?: string | null }) {
    start(async () => {
      await setMetricValue(metric.id, value);
    });
  }

  const boolDone = metric.type === "bool" && num === 1;
  const fieldStyle = { borderColor: "var(--glass-border)" };
  const active =
    (metric.type === "bool" && num === 1) ||
    (metric.type !== "bool" && num != null && num > 0) ||
    (metric.type === "note" && !!metric.entry?.value_text);

  return (
    <div
      className="flex flex-col gap-2 rounded-[var(--radius)] border bg-card/60 p-3 backdrop-blur-md"
      style={{ borderColor: active ? "var(--color-primary)" : "var(--glass-border)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-bold">{metric.label}</span>
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.15em] text-muted-foreground">
          {metric.type}
        </span>
      </div>

      {metric.type === "bool" ? (
        <button
          type="button"
          onClick={() => save({ valueNum: boolDone ? 0 : 1 })}
          className={`rounded-[3px] py-3 text-sm font-bold transition-colors ${
            boolDone ? "bg-primary text-primary-foreground" : "border text-muted-foreground"
          }`}
          style={boolDone ? undefined : fieldStyle}
        >
          {boolDone ? "✓ Done" : "Tap to log"}
        </button>
      ) : null}

      {metric.type === "count" ? (
        <div className="flex items-center justify-between">
          <button type="button" aria-label="Minus" onClick={() => save({ valueNum: Math.max(0, (num ?? 0) - 1) })} className="h-10 w-10 rounded-[3px] border text-lg" style={fieldStyle}>
            −
          </button>
          <span className="text-xl font-extrabold tabular-nums">{num ?? 0}</span>
          <button type="button" aria-label="Plus" onClick={() => save({ valueNum: (num ?? 0) + 1 })} className="h-10 w-10 rounded-[3px] bg-primary text-lg font-bold text-primary-foreground">
            +
          </button>
        </div>
      ) : null}

      {metric.type === "scale" ? (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => save({ valueNum: n })}
              className={`h-10 flex-1 rounded-[3px] text-sm font-bold transition-colors ${
                num === n ? "bg-primary text-primary-foreground" : "border text-muted-foreground"
              }`}
              style={num === n ? undefined : fieldStyle}
            >
              {n}
            </button>
          ))}
        </div>
      ) : null}

      {metric.type === "duration" ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            defaultValue={num ?? ""}
            onBlur={(e) => save({ valueNum: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="minutes"
            className="w-full rounded-[3px] border bg-transparent px-2 py-2 text-sm outline-none"
            style={fieldStyle}
          />
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">min</span>
        </div>
      ) : null}

      {metric.type === "note" ? (
        <textarea
          defaultValue={metric.entry?.value_text ?? ""}
          onBlur={(e) => save({ valueText: e.target.value })}
          rows={2}
          placeholder="Today…"
          className="resize-none rounded-[3px] border bg-transparent p-2 text-sm outline-none placeholder:text-muted-foreground/50"
          style={fieldStyle}
        />
      ) : null}

      {metric.type !== "note" ? (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setNoteOpen((o) => !o)}
            className="self-start font-mono text-[0.55rem] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-primary"
          >
            {noteOpen ? "− note" : metric.entry?.value_text ? "✎ note" : "+ note"}
          </button>
          {noteOpen ? (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => save({ valueText: note })}
              rows={2}
              placeholder="Add a note…"
              className="resize-none rounded-[3px] border bg-transparent p-2 text-sm outline-none placeholder:text-muted-foreground/50"
              style={fieldStyle}
            />
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => start(async () => void (await deactivateMetric(metric.id)))}
        disabled={pending}
        className="self-end font-mono text-[0.5rem] uppercase tracking-[0.15em] text-muted-foreground/60 transition-colors hover:text-destructive"
      >
        hide
      </button>
    </div>
  );
}
