"use client";

import { useState } from "react";
import type { CaptureSummary } from "@/lib/brain/types";
import type { RawSourceType } from "@/lib/database.types";
import CaptureStatusBadge from "./CaptureStatusBadge";
import { FileText, Video, Camera, Link2, Mic, Image as ImageIcon, MessageSquare, Music2, RotateCcw } from "lucide-react";

const ICON: Record<RawSourceType, typeof FileText> = {
  note: FileText,
  youtube: Video,
  instagram: Camera,
  tiktok: Music2,
  article: Link2,
  voice: Mic,
  image: ImageIcon,
  chat_answer: MessageSquare,
};

interface Props {
  capture: CaptureSummary;
  onRetried?: () => void;
}

export default function CaptureRow({ capture, onRetried }: Props) {
  const [retrying, setRetrying] = useState(false);
  const Icon = ICON[capture.type] ?? FileText;
  const canRetry = capture.status === "needs_review" || capture.status === "error";

  async function retry() {
    setRetrying(true);
    try {
      await fetch(`/api/brain/captures/${capture.id}/retry`, { method: "POST" });
      onRetried?.();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div
      className="flex items-center gap-3 rounded-[var(--radius)] border bg-card/50 px-3 py-2.5"
      style={{ borderColor: "var(--glass-border)" }}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-sm">{capture.title || "Untitled"}</span>
      <CaptureStatusBadge status={capture.status} />
      {canRetry && (
        <button
          type="button"
          onClick={retry}
          disabled={retrying}
          title="Re-ingest"
          className="shrink-0 text-muted-foreground transition-colors hover:text-primary disabled:opacity-40"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${retrying ? "animate-spin" : ""}`} />
        </button>
      )}
    </div>
  );
}
