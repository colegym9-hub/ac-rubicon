"use client";

import type React from "react";
import { Check } from "lucide-react";
import type { DayBlock, BlockKind } from "@/lib/day";

const KIND: Record<BlockKind, { bg: string; border: string; text: string; bar: string }> = {
  deep:   { bg: "bg-primary/20",      border: "border-primary/50",      text: "text-primary",          bar: "bg-primary" },
  light:  { bg: "bg-blue-500/15",     border: "border-blue-500/40",     text: "text-blue-300",         bar: "bg-blue-400" },
  break:  { bg: "bg-amber-500/15",    border: "border-amber-500/40",    text: "text-amber-300",        bar: "bg-amber-400" },
  gym:    { bg: "bg-green-500/15",    border: "border-green-500/40",    text: "text-green-300",        bar: "bg-green-400" },
  event:  { bg: "bg-purple-500/15",   border: "border-purple-500/40",   text: "text-purple-300",       bar: "bg-purple-400" },
  buffer: { bg: "bg-neutral-500/10",  border: "border-neutral-500/30",  text: "text-muted-foreground", bar: "bg-neutral-500" },
};

interface Props {
  block: DayBlock;
  top: number;
  height: number;
  left: string;
  width: string;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onToggleDone?: (id: string) => void;
}

export default function BlockChip({ block, top, height, left, width, isDragging, onPointerDown, onToggleDone }: Props) {
  const s = KIND[block.kind] ?? KIND.buffer;
  const showLabel = height >= 26;
  const showTime  = height >= 44;
  const showCheck = !!onToggleDone && showLabel;

  return (
    <div
      data-block
      data-block-id={block.id}
      className={[
        "absolute overflow-hidden rounded-[3px] border px-1.5 pb-1 pt-0.5",
        "select-none touch-none cursor-pointer",
        s.bg, s.border,
        isDragging ? "opacity-70 shadow-xl z-20 scale-[1.02]" : "z-10",
        block.done ? "opacity-40" : "",
        "transition-[opacity,transform] duration-100",
      ].join(" ")}
      style={{ top, height: Math.max(22, height), left, width }}
      onPointerDown={onPointerDown}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Left accent bar */}
      <div className={`absolute inset-y-0 left-0 w-[3px] ${s.bar}`} />

      {/* Check-off — tap toggles done without starting a drag/edit */}
      {showCheck && (
        <button
          type="button"
          aria-label={block.done ? "Mark not done" : "Mark done"}
          aria-pressed={block.done}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onToggleDone!(block.id); }}
          className={[
            "absolute right-1 top-1 z-20 flex h-4 w-4 items-center justify-center rounded-full border transition-colors",
            block.done
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/40 text-transparent hover:border-foreground",
          ].join(" ")}
        >
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </button>
      )}

      <div className={showCheck ? "pl-1 pr-5" : "pl-1"}>
        {showLabel && (
          <p className={`truncate text-[0.65rem] font-bold leading-tight ${s.text} ${block.done ? "line-through opacity-60" : ""}`}>
            {block.label}
          </p>
        )}
        {showTime && (
          <p className="mt-0.5 font-mono text-[0.55rem] leading-tight text-muted-foreground">
            {block.start}–{block.end}
          </p>
        )}
      </div>

      {/* Resize handle — bottom 10px strip */}
      <div
        data-resize
        className="absolute inset-x-0 bottom-0 flex h-2.5 cursor-row-resize items-end justify-center pb-0.5"
        onPointerDown={(e) => {
          e.stopPropagation();
          // Bubble up with resize flag set on the event target
          onPointerDown(e);
        }}
      >
        <div className="h-0.5 w-6 rounded-full bg-current opacity-25" />
      </div>
    </div>
  );
}
