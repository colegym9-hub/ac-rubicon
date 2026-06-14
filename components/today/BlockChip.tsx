"use client";

import type React from "react";
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
}

export default function BlockChip({ block, top, height, left, width, isDragging, onPointerDown }: Props) {
  const s = KIND[block.kind] ?? KIND.buffer;
  const showLabel = height >= 26;
  const showTime  = height >= 44;

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

      <div className="pl-1">
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
