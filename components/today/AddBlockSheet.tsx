"use client";

import { useState, useEffect } from "react";
import { BLOCK_KINDS, type BlockKind, type DayBlock } from "@/lib/day";
import { Button } from "@/components/ui/button";

const KIND_LABELS: Record<BlockKind, string> = {
  deep:   "Deep work",
  light:  "Light work",
  break:  "Break",
  gym:    "Gym",
  event:  "Event",
  buffer: "Buffer",
};

function addMins(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.min(24 * 60 - 1, h * 60 + m + mins);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

interface Props {
  initialTime?: string;
  editBlock?: DayBlock;
  onSave:   (block: DayBlock, isNew: boolean) => void;
  onDelete?: () => void;
  onClose:  () => void;
}

export default function AddBlockSheet({ initialTime, editBlock, onSave, onDelete, onClose }: Props) {
  const isNew = !editBlock;
  const defaultStart = editBlock?.start ?? initialTime ?? "09:00";
  const defaultEnd   = editBlock?.end   ?? (initialTime ? addMins(initialTime, 60) : "10:00");

  const [label,    setLabel]    = useState(editBlock?.label ?? "");
  const [start,    setStart]    = useState(defaultStart);
  const [end,      setEnd]      = useState(defaultEnd);
  const [kind,     setKind]     = useState<BlockKind>(editBlock?.kind ?? "deep");
  const [done,     setDone]     = useState(editBlock?.done ?? false);
  const [timeErr,  setTimeErr]  = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSave() {
    if (!label.trim()) return;
    if (start >= end) {
      setTimeErr("End time must be after start.");
      return;
    }
    setTimeErr("");
    onSave(
      { id: editBlock?.id ?? crypto.randomUUID(), label: label.trim(), start, end, kind, done },
      isNew,
    );
  }

  const border = { borderColor: "var(--glass-border)" };

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border-t bg-card px-4 pb-10 pt-4 shadow-2xl animate-slide-up"
        style={border}
      >
        {/* Drag pill */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/30" />

        <p className="mb-3 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
          {isNew ? "New Block" : "Edit Block"}
        </p>

        {/* Label */}
        <input
          autoFocus
          type="text"
          placeholder="What's the block?"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          className="mb-4 w-full bg-transparent text-base font-semibold outline-none placeholder:text-muted-foreground/40"
        />

        {/* Time row */}
        <div className="mb-1 flex gap-3">
          {(["From", "To"] as const).map((fieldLabel, i) => (
            <div key={fieldLabel} className="flex flex-1 items-center gap-1.5 rounded-[var(--radius)] border px-2 py-2" style={border}>
              <span className="w-6 font-mono text-[0.55rem] uppercase tracking-[0.1em] text-muted-foreground">{fieldLabel}</span>
              <input
                type="time"
                value={i === 0 ? start : end}
                onChange={(e) => { if (i === 0) setStart(e.target.value); else setEnd(e.target.value); setTimeErr(""); }}
                className="flex-1 bg-transparent font-mono text-sm outline-none"
              />
            </div>
          ))}
        </div>
        {timeErr && <p className="mb-3 text-xs text-destructive">{timeErr}</p>}
        {!timeErr && <div className="mb-3" />}

        {/* Kind pills */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {BLOCK_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={[
                "rounded-full px-3 py-1 font-mono text-xs transition-colors",
                kind === k
                  ? "bg-primary text-primary-foreground"
                  : "border text-muted-foreground hover:text-foreground",
              ].join(" ")}
              style={kind === k ? {} : border}
            >
              {KIND_LABELS[k]}
            </button>
          ))}
        </div>

        {/* Done toggle (edit only) */}
        {!isNew && (
          <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={done}
              onChange={(e) => setDone(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span className="text-muted-foreground">Mark as done</span>
          </label>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button type="button" onClick={handleSave} disabled={!label.trim()} className="flex-1">
            {isNew ? "Add Block" : "Save"}
          </Button>
          {!isNew && onDelete && (
            <Button
              type="button"
              variant="outline"
              onClick={onDelete}
              className="px-4 text-destructive hover:bg-destructive/10"
              style={border}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
